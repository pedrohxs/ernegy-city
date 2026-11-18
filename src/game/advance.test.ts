import { describe, expect, it } from 'vitest'
import { Res, advance } from './advance'
import { objective } from './objectives'
import { S, useGame } from '../store/gameStore'
import { ENERGY_PRICE, LEVELS, WAVE_MULT, levelAt } from '../data/balance'
import { makeNode } from '../electrical/engine'
import { ACHIEVEMENTS, MISSIONS } from './missions'

const ALL_DONE = [...MISSIONS, ...ACHIEVEMENTS].map(g => g.id)

const state = (over: Partial<S> = {}): S => ({
  ...useGame.getState(),
  nodes: [], cables: [], powered: [], mismatch: [], nodeV: {},
  time: 0, budget: 100000, mode: 'campanha', done: [...ALL_DONE],
  ...over,
})

const zone = () => ({ ...makeNode(3, 'zone', 0, 0, 220), kW: 60 }) // 60 kW (meta do nível 1)
const poweredRes: Res = { current: {}, volt: {}, drop: {}, nodeLoad: { 3: 60 }, nodeV: { 3: 220 }, powered: [3], mismatch: [] }
const blackoutRes: Res = { current: {}, volt: {}, drop: {}, nodeLoad: {}, nodeV: { 3: 0 }, powered: [], mismatch: [] }

describe('economia (advance)', () => {
  it('acumula receita de zonas atendidas', () => {
    const s = state({ nodes: [zone()], budget: 100000 })
    const next = advance(s, poweredRes, 1)
    expect((next.budget ?? 0) - 100000).toBeCloseTo(60 * ENERGY_PRICE, 5)
  })

  it('penaliza apagão e zera o fornecimento', () => {
    const s = state({ nodes: [zone()], budget: 100000 })
    const next = advance(s, blackoutRes, 1)
    expect(next.budget!).toBeLessThan(100000)
    expect(next.supplied).toBe(0)
  })

  it('sobe de nível ao manter o objetivo pelo tempo do nível', () => {
    let s = state({ nodes: [zone()], budget: 100000 })
    for (let i = 0; i < levelAt(1).hold; i++) s = { ...s, ...advance(s, poweredRes, 1) } as S
    expect(s.level).toBe(2)
    expect(s.budget).toBe(levelAt(2).budget)
  })

  it('reseta o progresso da meta quando falta energia', () => {
    let s = state({ nodes: [zone()], budget: 100000 })
    s = { ...s, ...advance(s, poweredRes, 5) } as S
    expect(s.goalT).toBe(5)
    s = { ...s, ...advance(s, blackoutRes, 1) } as S
    expect(s.goalT).toBe(0)
  })

  it('acumula continuidade (atendido × apagão) e tempo de hospital', () => {
    const hosp = { ...makeNode(4, 'zone', 0, 0, 220), kW: 60, zoneType: 'hospital' as const }
    let s = state({ nodes: [zone(), hosp], budget: 100000 })
    const allOn: Res = { current: {}, volt: {}, drop: {}, nodeLoad: { 3: 60, 4: 60 }, nodeV: { 3: 220, 4: 220 }, powered: [3, 4], mismatch: [] }
    s = { ...s, ...advance(s, allOn, 10) } as S
    expect(s.serviceT).toBe(10)
    expect(s.outageT).toBe(0)
    expect(s.criticalT).toBe(10)

    const black: Res = { current: {}, volt: {}, drop: {}, nodeLoad: {}, nodeV: { 3: 0, 4: 0 }, powered: [], mismatch: [] }
    s = { ...s, ...advance(s, black, 5) } as S
    expect(s.outageT).toBe(5)
    expect(s.serviceT).toBe(10)
    expect(s.criticalT).toBe(10)
  })

  it('distingue perdas acima do limite e fornecimento abaixo da meta', () => {
    const lvl3 = state({ level: 3, supplied: 60, losses: 0.1 })
    expect(objective(lvl3)?.block).toBeNull()
    expect(objective({ ...lvl3, losses: 12 })?.block).toBe('losses')
    expect(objective({ ...lvl3, supplied: 50 })?.block).toBe('supply')
  })

  it('zera a janela em caso de falha, mesmo com potência suficiente', () => {
    const failed = { ...makeNode(1, 'trafo', 0, 0, 220), failed: true }
    const s = state({ goalT: 19, nodes: [zone(), failed] })
    const next = advance(s, poweredRes, 1)
    expect(next.goalT).toBe(0)
    expect(next.level).toBe(1)
    expect(objective({ ...s, ...next })?.block).toBe('fault')
  })

  it('só conta a onda de calor no passo calculado com a demanda da onda', () => {
    const hot = { ...zone(), kW: 100 }
    let s = state({ level: 5, time: 89, nodes: [hot], mult: 1, eventT: 20 })
    s = { ...s, ...advance(s, poweredRes, 1) }
    expect(s.supplied).toBe(100)
    expect(s.goalT).toBe(0)
    expect(s.mult).toBe(WAVE_MULT)
    s = { ...s, ...advance(s, poweredRes, 1) }
    expect(s.supplied).toBe(120)
    expect(s.goalT).toBe(1)
  })

  it('preserva saldo acima do piso e encerra a campanha uma vez', () => {
    const promoted = advance(state({ nodes: [zone()], goalT: 19, budget: 200000 }), poweredRes, 1)
    expect(promoted.budget).toBeGreaterThan(200000)
    expect(promoted.levelResult).toMatchObject({ kind: 'level', grant: 0 })
    const final = LEVELS.length
    let s = state({ level: final, goalT: levelAt(final).hold - 1, nodes: [{ ...zone(), kW: 400 }] })
    s = { ...s, ...advance(s, poweredRes, 1) }
    expect(s.level).toBe(final + 1)
    expect(s.levelResult).toMatchObject({ kind: 'final', level: final })
    const next = advance({ ...s, levelResult: null }, poweredRes, 40)
    expect(next.level).toBe(s.level)
    expect(next.totalStars).toBe(s.totalStars)
    expect(next.levelResult).toBeNull()
  })

  it('conclui o desafio uma vez e não progride no sandbox', () => {
    const nodes = [{ ...zone(), kW: 150 }]
    const challenge = state({ mode: 'desafio', nodes, goalT: 19 })
    const won = advance(challenge, poweredRes, 1)
    expect(won.levelResult).toMatchObject({ kind: 'challenge' })
    expect(advance({ ...challenge, ...won, levelResult: null }, poweredRes, 30).levelResult).toBeNull()
    expect(advance({ ...challenge, mode: 'sandbox' }, poweredRes, 30).level).toBe(1)
  })
})
