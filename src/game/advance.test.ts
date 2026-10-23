import { describe, expect, it } from 'vitest'
import { Res, advance, goalSatisfied } from './advance'
import { S, useGame } from '../store/gameStore'
import { ENERGY_PRICE, levelAt } from '../data/balance'
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

  it('goalSatisfied reprova perdas acima do limite', () => {
    const lvl3 = state({ level: 3 }) // ≥60 kW com perdas <10%
    expect(goalSatisfied(lvl3, 60, 0.1)).toBe(true)
    expect(goalSatisfied(lvl3, 60, 12)).toBe(false)
    expect(goalSatisfied(lvl3, 50, 0.1)).toBe(false) // abaixo do mínimo
  })
})
