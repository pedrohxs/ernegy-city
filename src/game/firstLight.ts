import { STARTER_NETWORK } from '../data/balance'
import type { S } from '../store/gameStore'
import { lotOccupied } from './construction'

type Lot = { x: number; z: number }
export type FirstLightStep =
  | { kind: 'gen' | 'trafo'; lot?: Lot }
  | { kind: 'feeder' | 'branch'; from: number; to: number; area: number; connected: number; total: number }
  | { kind: 'start' | 'hold' }

type FirstLightState = Pick<S, 'mode' | 'level' | 'nodes' | 'cables'>

export function firstLight(s: FirstLightState): FirstLightStep | null {
  if (s.mode !== 'campanha' || s.level !== 1) return null
  const { nodes, cables } = s
  const houses = nodes.filter(n => n.kind === 'zone' && n.volt === 110 && !n.failed).slice(0, 3)
  if (!houses.length || nodes.some(n => n.failed) || cables.some(c => c.failed)) return null
  const generator = nodes.find(n => n.kind === 'gen')
  const offeredLot = (point: Lot) => lotOccupied(nodes, point.x, point.z) ? undefined : point
  if (!generator) return { kind: 'gen', lot: offeredLot(STARTER_NETWORK.generator) }
  const transformers = nodes.filter(n => n.kind === 'trafo' && n.volt === 110)
  if (!transformers.length) return { kind: 'trafo', lot: offeredLot(STARTER_NETWORK.transformer) }

  // Somente subestações estendem o caminho didático no lado de alta tensão.
  const reached = new Set(nodes.filter(n => n.kind === 'gen').map(n => n.id))
  const highVoltage = new Set(nodes.filter(n => n.kind !== 'zone').map(n => n.id))
  for (const id of reached) {
    for (const cable of cables) {
      const other = cable.a === id ? cable.b : cable.b === id ? cable.a : null
      if (other !== null && highVoltage.has(other)) reached.add(other)
    }
  }
  const feeders = transformers.filter(n => reached.has(n.id))
  if (!feeders.length) return { kind: 'feeder', from: generator.id, to: transformers[0].id, area: STARTER_NETWORK.feederArea, connected: 0, total: houses.length }
  const feederIds = new Set(feeders.map(n => n.id))
  const served = new Set<number>()
  for (const cable of cables) {
    if (feederIds.has(cable.a)) served.add(cable.b)
    if (feederIds.has(cable.b)) served.add(cable.a)
  }
  const remaining = houses.filter(house => !served.has(house.id))
  if (!remaining.length) return nodes.some(n => n.kind === 'gen' && n.online) ? { kind: 'hold' } : { kind: 'start' }
  const house = remaining[0]
  const distance = (n: Lot) => Math.hypot(n.x - house.x, n.z - house.z)
  const trafo = feeders.reduce((a, b) => distance(a) <= distance(b) ? a : b)
  return { kind: 'branch', from: trafo.id, to: house.id, area: STARTER_NETWORK.branchArea, connected: houses.length - remaining.length, total: houses.length }
}
