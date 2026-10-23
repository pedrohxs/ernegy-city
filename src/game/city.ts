// Bairro semente: a cidade inicial que o jogador precisa energizar.
// Fica na malha de ruas (múltiplos de 40), dentro de um quarteirão, sem sobrepor.
import { GNode, makeNode } from '../electrical/engine'
import { ZoneType, ZONES } from '../data/balance'

const zone = (id: number, type: ZoneType, x: number, z: number): GNode => {
  const spec = ZONES[type]
  const n = makeNode(id, 'zone', x, z, spec.volt)
  return { ...n, kW: spec.kW, zoneType: type }
}

export interface SeedCity { nodes: GNode[]; nextId: number; demand: number }

/** Três casas numa rua, à espera de energia. */
export function buildSeedCity(): SeedCity {
  const nodes = [zone(1, 'casa', 10, 20), zone(2, 'casa', 30, 20), zone(3, 'casa', 50, 20)]
  return { nodes, nextId: 4, demand: nodes.reduce((a, n) => a + n.kW, 0) }
}

/** Um lote válido fica na malha de 10 unidades e fora das ruas (múltiplos de 40). */
export const isLot = (v: number): boolean => Math.abs(v - Math.round(v / 40) * 40) > 9

const NEIGHBORS: [number, number][] = [[10, 0], [-10, 0], [0, 10], [0, -10], [40, 0], [-40, 0], [0, 40], [0, -40]]

/**
 * Crescimento BFS: um lote livre vizinho a construções já energizadas (ou existentes),
 * andando pela malha de ruas. Retorna null se não houver espaço.
 */
export function nextLot(nodes: GNode[], powered: Set<number>, rng: () => number = Math.random): { x: number; z: number } | null {
  const energized = nodes.filter(n => n.kind === 'zone' && powered.has(n.id))
  const base = energized.length ? energized : nodes.filter(n => n.kind === 'zone')
  if (!base.length) return null
  const occupied = (x: number, z: number) => nodes.some(n => Math.hypot(n.x - x, n.z - z) < 8)
  const seen = new Set<string>(), cands: { x: number; z: number }[] = []
  for (const a of base) for (const [dx, dz] of NEIGHBORS) {
    const x = a.x + dx, z = a.z + dz, key = `${x},${z}`
    if (Math.abs(x) > 170 || Math.abs(z) > 170 || seen.has(key)) continue
    seen.add(key)
    if (!isLot(x) || !isLot(z) || occupied(x, z)) continue
    cands.push({ x, z })
  }
  if (!cands.length) return null
  return cands[Math.floor(rng() * cands.length)]
}
