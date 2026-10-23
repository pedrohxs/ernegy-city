// Simulação de balanceamento: monta layouts de referência, roda partidas automáticas
// com passo fixo e verifica se as metas dos níveis 1-10 são alcançáveis e quanto sobra de orçamento.
import { COST, ENERGY_PRICE, GENS, GROWTH_EVERY, HEAT_WAVE_AFTER, Level, LEVELS, LOSS_COST, PRICE, SUB_LOSS, WAVE_MULT } from '../data/balance'
import { Cable, GNode, makeCable, makeNode, resistance, solve, stepCable, stepNode } from '../electrical/engine'
import { goalSatisfied } from './advance'
import type { S } from '../store/gameStore'

const AREA = 95, HV_LEN = 20, LV_LEN = 10, DT = 0.1
const HV_CABLE_AREA = 95
const isHeat = (t: number) => t > HEAT_WAVE_AFTER && t % 90 < 20

interface Layout { nodes: GNode[]; cables: Cable[]; cost: number; zones: GNode[] }
let uid = 1
const mkCable = (a: number, b: number, len: number, area: number): Cable =>
  makeCable(uid++, a, b, 'cobre', area, len, resistance('cobre', len, area), len * PRICE.cobre * (area / 35))

/** Layout de referência: clusters independentes gerador→subestação→trafos→zonas. */
export function buildLayout(target: number): Layout {
  uid = 1
  const nodes: GNode[] = [], cables: Cable[] = [], zones: GNode[] = []
  const totalZones = Math.max(1, Math.ceil(target / 40))
  const clusters = Math.max(1, Math.ceil((totalZones * 40) / 250))
  const base = Math.floor(totalZones / clusters), rem = totalZones % clusters
  let cost = 0
  for (let c = 0; c < clusters; c++) {
    const zc = base + (c < rem ? 1 : 0)
    const x0 = c * 120
    const gen = { ...makeNode(uid++, 'gen', x0, 0, 0), genType: 'gas' as const, cap: GENS.gas.cap }
    const sub = makeNode(uid++, 'sub', x0 + 20, 0, 0)
    nodes.push(gen, sub); cost += GENS.gas.cost + COST.sub
    cables.push(mkCable(gen.id, sub.id, HV_LEN, HV_CABLE_AREA))
    const trafos = Math.max(1, Math.ceil(zc / 3))
    const perTrafo = Math.ceil(zc / trafos)
    let placed = 0
    for (let t = 0; t < trafos; t++) {
      const tr = makeNode(uid++, 'trafo', x0 + 40 + t * 20, 20, 220)
      nodes.push(tr); cost += COST.trafo
      cables.push(mkCable(sub.id, tr.id, HV_LEN, HV_CABLE_AREA))
      for (let k = 0; k < perTrafo && placed < zc; k++, placed++) {
        const z = makeNode(uid++, 'zone', x0 + 60 + t * 20, 40 + k * 20, 220)
        zones.push(z); nodes.push(z)
        cables.push(mkCable(tr.id, z.id, LV_LEN, AREA))
      }
    }
  }
  for (const c of cables) cost += c.cost
  return { nodes, cables, cost, zones }
}

export interface SimResult {
  level: number; title: string; goal: string; reached: boolean; supply: number; lossPct: number
  cost: number; budget: number; leftover: number; stars: number; failures: number; seconds: number
}

/** Roda uma partida automática para um nível. */
export function simulateLevel(level: Level): SimResult {
  const layout = buildLayout(level.target)
  let nodes = layout.nodes, cables = layout.cables
  let budget = level.budget - layout.cost
  // a onda de calor ocorre quando time%90 < 20 e time > HEAT_WAVE_AFTER → primeira janela aos 90-110s
  const horizon = level.goal === 'heatwave' ? 90 + level.hold + 12 : level.hold + 12
  let metT = 0, supply = 0, lossPct = 0, failures = 0, second = 0, reached = false
  for (let t = 0; t < horizon; t = +(t + DT).toFixed(4)) {
    const mult = isHeat(t) ? WAVE_MULT : 1
    const r = solve(nodes, cables, mult, 1)
    const pw = new Set(r.powered)
    const supplied = layout.zones.filter(z => pw.has(z.id)).reduce((a, z) => a + z.kW * mult, 0)
    const cableLoss = cables.reduce((a, c) => a + c.loss, 0) / 1000
    const subLoss = nodes.filter(n => n.kind === 'sub').reduce((a, n) => a + (r.nodeLoad[n.id] ?? 0) * SUB_LOSS, 0)
    const losses = cableLoss + subLoss
    supply = supplied; lossPct = supplied > 0 ? (losses / supplied) * 100 : 0
    const met = goalSatisfied({ level: level.n, time: t } as S, supplied, losses)
    metT = met ? metT + DT : 0
    budget += (supplied * ENERGY_PRICE - losses * LOSS_COST) * DT
    cables = cables.map(c => stepCable(c, r.current[c.id] ?? 0, r.volt[c.id] ?? 220, r.drop[c.id] ?? 0, DT))
    nodes = nodes.map(n => stepNode(n, r.nodeLoad[n.id] ?? 0, DT))
    failures = nodes.filter(n => n.failed).length + cables.filter(c => c.failed).length
    second = t
    if (metT >= level.hold) { reached = true; break }
  }
  const leftover = Math.max(0, budget)
  const stars = 1 + (leftover >= level.stars[0] ? 1 : 0) + (leftover >= level.stars[1] ? 1 : 0)
  return { level: level.n, title: level.title, goal: level.goal, reached, supply, lossPct, cost: layout.cost, budget: level.budget, leftover, stars, failures, seconds: second }
}

export function runAll(): SimResult[] {
  return LEVELS.map(simulateLevel)
}

// Média de kW por crescimento: pool [casa,casa,casa,predio,predio,hospital] = 20..60 → ~33,3 kW.
const AVG_GROWTH_KW = 100 / 3

export interface GrowthResult {
  level: number; events: number; addedKW: number
  startCost: number; endCost: number; budget: number; fits: boolean
}

/** Quanto a cidade cresce durante o nível (+ um minuto) e se o orçamento cobre o layout final. */
export function growthCurve(extraSeconds = 60): GrowthResult[] {
  return LEVELS.map(l => {
    const events = Math.floor((l.hold + extraSeconds) / GROWTH_EVERY)
    const addedKW = events * AVG_GROWTH_KW
    const startCost = buildLayout(l.target).cost
    const endCost = buildLayout(l.target + addedKW).cost
    return { level: l.n, events, addedKW, startCost, endCost, budget: l.budget, fits: endCost <= l.budget }
  })
}

export function formatGrowthTable(rs: GrowthResult[]): string {
  const head = 'nível  cresc  +kW     custo início  custo final  orçamento  cabe?'
  const rows = rs.map(r =>
    `${String(r.level).padEnd(5)} ${String(r.events).padStart(5)} ${r.addedKW.toFixed(0).padStart(6)} ${String(Math.round(r.startCost)).padStart(13)} ${String(Math.round(r.endCost)).padStart(12)} ${String(r.budget).padStart(10)}  ${r.fits ? 'SIM' : 'NÃO'}`,
  )
  return [head, ...rows].join('\n')
}

export function formatTable(results: SimResult[]): string {
  const head = 'nível  alcançável  fornec(kW)  perdas%  custo      sobra      ⭐  seg'
  const rows = results.map(r =>
    `${String(r.level).padEnd(5)} ${(r.reached ? 'SIM' : 'NÃO').padEnd(10)} ${r.supply.toFixed(0).padStart(9)} ${r.lossPct.toFixed(1).padStart(7)} ${String(r.cost).padStart(9)} ${String(Math.round(r.leftover)).padStart(9)}  ${r.stars}  ${r.seconds.toFixed(0)}`,
  )
  return [head, ...rows].join('\n')
}
