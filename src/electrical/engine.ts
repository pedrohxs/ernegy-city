// Motor elétrico (independe de React/Three). CC. Solver nodal (Kirchhoff) com cargas de potência constante.
// Regra de laços: malhas são SUPORTADAS (cabos em paralelo dividem corrente). O solver é nodal, então
// qualquer topologia conectada converge, inclusive múltiplos geradores em paralelo.
import { CAP, COOL, HEAT, HV, MAINT_WEAR, NODE_HEAT, RHO, T_AMB, T_MAX, ZONE_KW } from '../data/balance'
import type { GenType, ZoneType } from '../data/balance'
export type Material = 'cobre' | 'aluminio'
export type Kind = 'gen' | 'sub' | 'trafo' | 'zone'
export interface GNode {
  id: number; kind: Kind; x: number; z: number; kW: number; volt: number; cap: number; temp: number; load: number; failed: boolean
  online: boolean; startLeft: number; maintained: boolean; genType?: GenType; zoneType?: ZoneType
}
export interface Cable {
  id: number; a: number; b: number; material: Material; area: number; length: number
  R: number; cost: number; current: number; volt: number; drop: number; loss: number; temp: number; failed: boolean
}
export const resistance = (m: Material, L: number, A: number) => (RHO[m] * L) / A // R = ρL/A
export const jouleLoss = (R: number, I: number) => R * I * I // P = R·I²

export function makeNode(id: number, kind: Kind, x: number, z: number, volt: number): GNode {
  return { id, kind, x, z, volt, cap: CAP[kind], kW: kind === 'zone' ? ZONE_KW[volt] ?? 20 : 0, temp: T_AMB, load: 0, failed: false, online: true, startLeft: 0, maintained: false }
}

export interface SolveResult {
  current: Record<number, number>; volt: Record<number, number>; drop: Record<number, number>
  nodeLoad: Record<number, number>; nodeV: Record<number, number>; powered: Set<number>; mismatch: Set<number>
}
interface E { c: Cable; i: number; j: number; g: number }

// Cada trafo tem 2 vértices: id (lado 13,8 kV) e -id (lado BT). Geradores são fontes fixas em HV.
// rmult = multiplicador de resistência (tempestade). mult = multiplicador de demanda (onda de calor/pico).
export function solve(nodes: GNode[], cables: Cable[], mult = 1, rmult = 1): SolveResult {
  const res: SolveResult = { current: {}, volt: {}, drop: {}, nodeLoad: {}, nodeV: {}, powered: new Set(), mismatch: new Set() }
  const byId = new Map(nodes.map(n => [n.id, n]))
  const edges: E[] = [], adj = new Map<number, E[]>()
  const add = (v: number, e: E) => { const l = adj.get(v); if (l) l.push(e); else adj.set(v, [e]) }
  for (const c of cables) {
    const a = byId.get(c.a), b = byId.get(c.b)
    if (c.failed || !a || !b || a.failed || b.failed) continue
    const hvZone = (a.kind === 'zone' && (b.kind === 'gen' || b.kind === 'sub')) || (b.kind === 'zone' && (a.kind === 'gen' || a.kind === 'sub'))
    if (hvZone) { res.mismatch.add(a.kind === 'zone' ? a.id : b.id); continue }
    if (a.kind === 'zone' && b.kind === 'zone' && a.volt !== b.volt) continue
    const vt = (n: GNode, o: GNode) => (n.kind === 'trafo' && o.kind === 'zone' ? -n.id : n.id)
    const e = { c, i: vt(a, b), j: vt(b, a), g: 1 / Math.max(c.R * rmult, 1e-4) }
    edges.push(e); add(e.i, e); add(e.j, e)
  }
  const flood = (starts: Map<number, number>) => {
    const nom = new Map(starts), q = [...starts.keys()]
    for (let k = 0; k < q.length; k++) for (const e of adj.get(q[k]) ?? []) {
      const o = e.i === q[k] ? e.j : e.i
      if (!nom.has(o)) { nom.set(o, nom.get(q[k])!); q.push(o) }
    }
    return nom
  }
  const fixed = new Map<number, number>()
  nodes.forEach(n => { if (n.kind === 'gen' && !n.failed && n.online) fixed.set(n.id, HV) })
  const hv = flood(fixed)
  nodes.forEach(n => { if (n.kind === 'trafo' && !n.failed && hv.has(n.id)) fixed.set(-n.id, n.volt) })
  const nom = flood(fixed)
  const V = new Map(nom), pTr = new Map<number, number>()
  const zoneP = (n: GNode) => n.kW * 1000 * mult
  const out = (v: number) => (adj.get(v) ?? []).reduce((s, e) => s + (V.get(v)! - V.get(e.i === v ? e.j : e.i)!) * e.g, 0)
  // Gauss-Seidel com critério de convergência (evita rodar 300 iterações sempre).
  const TOL = 1e-3 // V
  for (let it = 0; it < 300; it++) {
    let maxDelta = 0
    for (const [v, nm] of nom) {
      if (fixed.has(v)) continue
      let sg = 0, sv = 0
      for (const e of adj.get(v) ?? []) { sg += e.g; sv += e.g * V.get(e.i === v ? e.j : e.i)! }
      const n = byId.get(v)
      const P = n?.kind === 'zone' ? zoneP(n) : n?.kind === 'trafo' ? pTr.get(n.id) ?? 0 : 0
      if (sg > 0) {
        const nv = Math.max(0.3 * nm, (sv - P / V.get(v)!) / sg)
        if (Math.abs(nv - V.get(v)!) > maxDelta) maxDelta = Math.abs(nv - V.get(v)!)
        V.set(v, nv)
      }
    }
    for (const n of nodes) if (fixed.has(-n.id)) pTr.set(n.id, Math.max(0, out(-n.id) * n.volt))
    if (maxDelta < TOL) break
  }
  for (const e of edges) {
    if (!nom.has(e.i)) continue
    const d = Math.abs(V.get(e.i)! - V.get(e.j)!)
    res.drop[e.c.id] = d; res.current[e.c.id] = d * e.g; res.volt[e.c.id] = nom.get(e.i)!
  }
  for (const n of nodes) {
    const v = V.get(n.id)
    res.nodeV[n.id] = V.get(-n.id) ?? v ?? 0
    if (n.kind === 'gen' && v !== undefined) res.nodeLoad[n.id] = (out(n.id) * HV) / 1000
    if (n.kind === 'trafo') res.nodeLoad[n.id] = (pTr.get(n.id) ?? 0) / 1000
    if (n.kind === 'sub' && v !== undefined) {
      // throughput ≈ metade do fluxo total nas arestas incidentes (entrada + saída)
      let thru = 0
      for (const e of adj.get(n.id) ?? []) {
        const o = e.i === n.id ? e.j : e.i
        thru += Math.abs(V.get(n.id)! - V.get(o)!) * e.g * V.get(n.id)!
      }
      res.nodeLoad[n.id] = thru / 2000 // W → kW (metade = throughput)
    }
    if (n.kind === 'zone' && v !== undefined) {
      if (Math.abs(v / n.volt - 1) <= 0.1) { res.powered.add(n.id); res.nodeLoad[n.id] = zoneP(n) / 1000 } else res.mismatch.add(n.id)
    }
  }
  return res
}

export function stepCable(c: Cable, I: number, V: number, drop: number, dt: number): Cable {
  const loss = jouleLoss(c.R, I)
  const temp = c.temp + (loss * HEAT - (c.temp - T_AMB) * COOL) * dt
  return { ...c, current: I, volt: V, drop, loss, temp, failed: c.failed || temp >= T_MAX }
}
export function stepNode(n: GNode, loadKW: number, dt: number): GNode {
  if (n.cap <= 0) return { ...n, load: loadKW }
  const wear = n.maintained ? MAINT_WEAR : 1
  const temp = n.temp + (T_AMB + NODE_HEAT * (loadKW / n.cap) ** 2 * wear - n.temp) * COOL * dt
  return { ...n, load: loadKW, temp, failed: n.failed || temp >= T_MAX }
}
