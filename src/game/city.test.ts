import { describe, expect, it } from 'vitest'
import { buildSeedCity, isLot, nextLot } from './city'

describe('bairro semente', () => {
  const seed = buildSeedCity()

  it('cria três casas de 110 V totalizando 60 kW', () => {
    expect(seed.nodes).toHaveLength(3)
    expect(seed.nodes.every(n => n.kind === 'zone' && n.zoneType === 'casa')).toBe(true)
    expect(seed.nodes.every(n => n.volt === 110)).toBe(true)
    expect(seed.demand).toBe(60)
  })

  it('ids únicos e nextId correto', () => {
    const ids = seed.nodes.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(seed.nextId).toBe(Math.max(...ids) + 1)
  })

  it('fica fora das ruas (múltiplos de 40) e sem sobreposição', () => {
    for (const n of seed.nodes) {
      expect(n.x % 40).not.toBe(0)
      expect(n.z % 40).not.toBe(0)
    }
    for (const a of seed.nodes) for (const b of seed.nodes) {
      if (a.id !== b.id) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(7)
    }
  })

  it('nextLot cresce num lote livre vizinho ao que está energizado', () => {
    const powered = new Set([seed.nodes[0].id])
    const lot = nextLot(seed.nodes, powered)!
    expect(lot).not.toBeNull()
    expect(isLot(lot.x) && isLot(lot.z)).toBe(true)
    expect(seed.nodes.every(n => Math.hypot(n.x - lot.x, n.z - lot.z) >= 8)).toBe(true)
    expect(Math.hypot(lot.x - seed.nodes[0].x, lot.z - seed.nodes[0].z)).toBeLessThanOrEqual(60)
  })

  it('nextLot retorna null quando não cabe mais nada', () => {
    expect(nextLot([], new Set())).toBeNull()
  })
})
