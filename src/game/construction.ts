import { BUILD_SPACING, COOL, COST, GENS, HEAT, HV, PRICE, T_AMB, T_MAX } from '../data/balance'
import { ampacity, jouleLoss, resistance, type GNode, type Material } from '../electrical/engine'
import type { S } from '../store/gameStore'

export const lotOccupied = (nodes: GNode[], x: number, z: number, except?: number | null) =>
  nodes.some(n => n.id !== except && Math.hypot(n.x - x, n.z - z) < BUILD_SPACING)

export const constructionCost = (tool: S['tool'], genType: S['genType']) =>
  tool === 'gen' ? GENS[genType].cost : COST[tool] ?? 0

export function cableQuote(a: GNode, b: GNode, material: Material, area: number, mult = 1, rmult = 1) {
  const length = Math.hypot(a.x - b.x, a.z - b.z)
  const R = resistance(material, length, area)
  const cost = length * PRICE[material] * (area / 35)
  const limit = ampacity(material, area)
  const zone = a.kind === 'zone' ? a : b.kind === 'zone' ? b : null
  const other = zone === a ? b : a
  const voltage = zone ? (other.kind === 'gen' || other.kind === 'sub' ? HV : other.volt) : HV
  const mismatch = zone !== null && voltage !== zone.volt
  const current = zone && other.kind === 'trafo' && !mismatch ? zone.kW * 1000 * mult / voltage : null
  const effectiveR = R * rmult
  const drop = current === null ? null : effectiveR * current
  const loss = current === null ? null : jouleLoss(effectiveR, current)
  const equilibrium = loss === null ? null : T_AMB + loss * HEAT / COOL
  return {
    length, R, effectiveR, cost, limit, voltage, current, drop, loss, equilibrium, mismatch,
    overcurrent: current !== null && current > limit,
    overheating: equilibrium !== null && equilibrium >= T_MAX,
    voltageDrop: drop !== null && drop > voltage * 0.1,
  }
}
