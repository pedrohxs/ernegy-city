import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAVE_VERSION, loadSlot, migrate, parseSave, serialize, SaveSource } from './save'
import { makeNode } from '../electrical/engine'

const cable = { id: 10, a: 1, b: 2, material: 'cobre' as const, area: 35, length: 10, R: 0.02, cost: 0, current: 0, volt: 220, drop: 0, loss: 0, temp: 25, failed: false }

describe('save: migração e validação', () => {
  it('migra o formato antigo (sem version) para a versão atual', () => {
    const legacy = JSON.stringify({
      nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'trafo', 0, 10, 220)],
      cables: [cable],
      budget: 1234,
      nextId: 11,
      score: 9,
      level: 2,
      time: 30,
      mode: 'campanha',
      done: ['m1']
    })
    const d = parseSave(legacy)
    expect(d).not.toBeNull()
    expect(d!.version).toBe(SAVE_VERSION)
    expect(d!.budget).toBe(1234)
    expect(d!.level).toBe(2)
    expect(d!.time).toBe(30)
    expect(d!.done).toEqual(['m1'])
    expect(d!.nodes).toHaveLength(2)
    expect(d!.cables).toHaveLength(1)
  })

  it('rejeita JSON inválido sem lançar', () => {
    expect(parseSave('{ não é json')).toBeNull()
    expect(parseSave(null)).toBeNull()
    expect(parseSave('null')).toBeNull()
    expect(parseSave('[]')).toBeNull()
  })

  it('rejeita estruturas corrompidas', () => {
    expect(migrate({ nodes: 'x', cables: [] })).toBeNull()
    expect(migrate({ nodes: [{ id: 1, kind: 'invalido', x: 0, z: 0 }], cables: [] })).toBeNull()
    expect(migrate({ nodes: [makeNode(1, 'gen', 0, 0, 0)], cables: [{ ...cable, a: 1, b: 99 }] })).toBeNull() // cabo órfão
  })

  it('rejeita save de versão futura', () => {
    expect(migrate({ version: SAVE_VERSION + 1, nodes: [], cables: [] })).toBeNull()
  })

  it('preserva campos novos (genType, online, maintained, custo do cabo)', () => {
    const gen = { ...makeNode(1, 'gen', 0, 0, 0), genType: 'hidro' as const, online: false, startLeft: 5, maintained: true, cap: 900 }
    const src: SaveSource = { nodes: [gen, makeNode(2, 'trafo', 10, 0, 220)], cables: [{ ...cable, cost: 1234 }], budget: 1, nextId: 3, score: 0, level: 1, time: 0, mode: 'sandbox', done: [] }
    const d = parseSave(serialize(src))
    expect(d!.nodes[0].genType).toBe('hidro')
    expect(d!.nodes[0].online).toBe(false)
    expect(d!.nodes[0].startLeft).toBe(5)
    expect(d!.nodes[0].maintained).toBe(true)
    expect(d!.cables[0].cost).toBe(1234)
  })

  it('save antigo sem campos novos assume padrões seguros', () => {
    const legacy = JSON.stringify({
      nodes: [{ id: 1, kind: 'gen', x: 0, z: 0, kW: 0, volt: 0, cap: 400, temp: 25, load: 0, failed: false }],
      cables: [],
      budget: 1,
      nextId: 2,
      score: 0,
      level: 1,
      time: 0,
      mode: 'campanha',
      done: []
    })
    const d = parseSave(legacy)
    expect(d!.nodes[0].online).toBe(true)
    expect(d!.nodes[0].maintained).toBe(false)
    expect(d!.nodes[0].startLeft).toBe(0)
    expect(d!.stars).toBe(0)
    expect(d!.totalStars).toBe(0)
    expect(d!.challengeDone).toBe(false)
    expect(d!.everPowered).toBe(false)
    expect(d!.maintenanceOn).toBe(false)
    expect(d!.goalT).toBe(0)
  })

  it('preserva estrelas, desafio, continuidade e meta do nível', () => {
    const src: SaveSource = {
      nodes: [makeNode(1, 'gen', 0, 0, 0)],
      cables: [],
      budget: 500,
      nextId: 2,
      score: 10,
      level: 4,
      time: 90,
      mode: 'campanha',
      done: ['m1'],
      stars: 2,
      totalStars: 7,
      challengeDone: true,
      everPowered: true,
      maintenanceOn: true,
      goalT: 12.5
    }
    const d = parseSave(serialize(src))
    expect(d!.stars).toBe(2)
    expect(d!.totalStars).toBe(7)
    expect(d!.challengeDone).toBe(true)
    expect(d!.everPowered).toBe(true)
    expect(d!.maintenanceOn).toBe(true)
    expect(d!.goalT).toBe(12.5)
  })

  it('save v2 com continuidade já iniciada conta como "já teve luz"', () => {
    const legacy = JSON.stringify({ version: 2, nodes: [makeNode(1, 'gen', 0, 0, 0)], cables: [], budget: 1, nextId: 2, score: 0, level: 1, time: 0, mode: 'campanha', done: [], serviceT: 15 })
    const d = parseSave(legacy)
    expect(d!.everPowered).toBe(true)
  })

  it('rejeita cabo corrompido (R não numérico)', () => {
    expect(migrate({ nodes: [makeNode(1, 'gen', 0, 0, 0)], cables: [{ ...cable, R: 'x' }] })).toBeNull()
  })

  it('serializa com versão e relê de forma idêntica', () => {
    const src: SaveSource = { nodes: [makeNode(1, 'gen', 0, 0, 0)], cables: [], budget: 100, nextId: 2, score: 0, level: 1, time: 0, mode: 'sandbox', done: [], view: 'orbit' }
    const back = parseSave(serialize(src))
    expect(back!.version).toBe(SAVE_VERSION)
    expect(back!.mode).toBe('sandbox')
    expect(back!.view).toBe('orbit')
  })

  it('loadSlot retorna null quando o localStorage falha', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      }
    })
    expect(loadSlot(0)).toBeNull()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})
