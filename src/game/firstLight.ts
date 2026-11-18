import { STARTER_NETWORK } from '../data/balance'
import type { S } from '../store/gameStore'
import { lotOccupied } from './construction'

type Lot = { x: number; z: number }
export type FirstLightStep =
  | { kind: 'gen' | 'trafo'; lot?: Lot }
  | { kind: 'feeder' | 'branch'; from: number; to: number; area: number; connected: number; total: number }
  | { kind: 'start' | 'hold' }

type FirstLightState = Pick<S, 'mode' | 'level' | 'nodes' | 'cables' | 'powered'>

function highVoltageReach({ nodes, cables }: FirstLightState) {
  const usable = new Set(nodes.filter(n => n.kind !== 'zone' && !n.failed).map(n => n.id))
  const reached = new Set(nodes.filter(n => n.kind === 'gen' && !n.failed).map(n => n.id))
  for (const id of reached) {
    for (const cable of cables) {
      if (cable.failed) continue
      const other = cable.a === id ? cable.b : cable.b === id ? cable.a : null
      if (other !== null && usable.has(other)) reached.add(other)
    }
  }
  return reached
}

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

  // As zonas ficam no lado de baixa tensão e não estendem o caminho de alta.
  const reached = highVoltageReach(s)
  const feeders = transformers.filter(n => reached.has(n.id))
  if (!feeders.length) return { kind: 'feeder', from: generator.id, to: transformers[0].id, area: STARTER_NETWORK.feederArea, connected: 0, total: houses.length }
  const feederIds = new Set(feeders.map(n => n.id))
  const served = new Set(s.powered)
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

export type ExpansionStep =
  | { kind: 'expandTrafo'; lot?: Lot; voltage: number }
  | { kind: 'expandFeeder' | 'expandBranch'; from: number; to: number; area: number; voltage: number }

export function expansionStep(s: FirstLightState): ExpansionStep | null {
  if (s.mode === 'sandbox' || (s.mode === 'campanha' && s.level === 1)) return null
  if (s.nodes.some(n => n.failed) || s.cables.some(c => c.failed)) return null
  const generator = s.nodes.find(n => n.kind === 'gen')
  const zone = s.nodes.find(n => n.kind === 'zone' && !s.powered.includes(n.id) && !s.cables.some(c => c.a === n.id || c.b === n.id))
  if (!generator || !zone) return null
  const reached = highVoltageReach(s)
  const local = s.nodes.filter(n => n.kind === 'trafo' && n.volt === zone.volt)
  const distance = (n: Lot) => Math.hypot(n.x - zone.x, n.z - zone.z)
  const candidate = local.sort((a, b) => distance(a) - distance(b))
  const transformer = candidate.find(n => reached.has(n.id)) ?? candidate[0]
  if (!transformer) {
    const lots = [{ x: zone.x - 10, z: zone.z }, { x: zone.x + 10, z: zone.z }, { x: zone.x, z: zone.z - 10 }, { x: zone.x, z: zone.z + 10 }]
    const lot = lots.find(p => Math.abs(p.x) <= 200 && Math.abs(p.z) <= 200 && !lotOccupied(s.nodes, p.x, p.z))
    return { kind: 'expandTrafo', lot, voltage: zone.volt }
  }
  return reached.has(transformer.id)
    ? { kind: 'expandBranch', from: transformer.id, to: zone.id, area: STARTER_NETWORK.branchArea, voltage: zone.volt }
    : { kind: 'expandFeeder', from: generator.id, to: transformer.id, area: STARTER_NETWORK.feederArea, voltage: zone.volt }
}
