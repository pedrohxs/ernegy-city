// Passo da simulação (puro): aplica o resultado do solver ao estado.
// Economia: receita por energia, custo de perdas, penalidade por apagão, combustível e manutenção.
import {
  BLACKOUT_AT, BLACKOUT_PENALTY, CHALLENGE_BUDGET, CRITICAL_PENALTY, ENERGY_PRICE, EVENT_EVERY, GENS,
  GROWTH_EVERY, HEAT_WAVE_AFTER, LOSS_COST, MAINTENANCE_COST, MAX_ZONES, SPIKE_MULT,
  SPIKE_TIME, STORM_MULT, STORM_TIME, SUB_LOSS, TRIP_TIME, WAVE_MULT, ZONES, ZoneType, levelAt,
} from '../data/balance'
import { makeNode, stepCable, stepNode } from '../electrical/engine'
import type { S } from '../store/gameStore'
import { ACHIEVEMENTS, MISSIONS } from './missions'
import { nextLot } from './city'
import { strings } from '../i18n/pt-BR'
import { campaignComplete, isHeatWave, objective } from './objectives'
import { faultDetail } from './diagnose'
import { dayFactor, hourOf } from './clock'

export interface Res { current: Record<number, number>; volt: Record<number, number>; drop: Record<number, number>; nodeLoad: Record<number, number>; nodeV: Record<number, number>; powered: number[]; mismatch: number[] }
const FIXES = [...strings.report.fixes]

export function advance(s: S, r: Res, dt: number, random = Math.random): Partial<S> {
  const time = s.time + dt, pw = new Set(r.powered)
  const night = dayFactor(hourOf(time)) < 0.5
  let nodes = s.nodes.map(n => {
    // partida de gerador / reconexão após queda; solar só opera de dia
    let online = n.online, startLeft = n.startLeft
    if (n.kind === 'gen') {
      if (startLeft > 0) startLeft = Math.max(0, startLeft - dt)
      online = startLeft <= 0 && !(n.genType === 'solar' && night)
    }
    return stepNode({ ...n, online, startLeft, maintained: s.maintenanceOn }, r.nodeLoad[n.id] ?? 0, dt)
  })
  const cables = s.cables.map(c => stepCable(c, r.current[c.id] ?? 0, r.volt[c.id] ?? 220, r.drop[c.id] ?? 0, dt, s.maintenanceOn, s.rmult))
  let { nextId, event, msg, report, budget, level, stars, totalStars, eventT, eventIdx, levelResult, everPowered, serviceT, outageT, criticalT } = s

  // falhas novas -> relatório Post-Mortem
  const fc = cables.find((c, i) => c.failed && !s.cables[i].failed)
  const fn = nodes.find((n, i) => n.failed && !s.nodes[i].failed)
  if (fc) {
    const effectiveR = fc.R * s.rmult
    report = {
      title: strings.report.collapseCable(fc.id),
      lines: [faultDetail(fc), strings.report.cableCurrent(fc), strings.report.cableResistance(fc.R, effectiveR),
        strings.report.cableJoule(effectiveR, fc.current, fc.loss), strings.report.temperature(fc.temp)],
      fixes: FIXES,
      target: { type: 'cable', id: fc.id },
    }
  } else if (fn) {
    report = {
      title: strings.report.collapseNode(fn.kind, fn.id),
      lines: [faultDetail(fn), strings.report.nodeLoad(fn.load, fn.cap), strings.report.temperature(fn.temp)],
      fixes: FIXES,
      target: { type: 'node', id: fn.id },
    }
  }

  // eventos determinísticos após a primeira onda de calor
  let spikeT = Math.max(0, s.spikeT - dt), stormT = Math.max(0, s.stormT - dt)
  let tripId = nodes.some(n => n.id === s.tripId && n.startLeft > 0) ? s.tripId : null
  if (s.mode !== 'sandbox' && time > HEAT_WAVE_AFTER) {
    eventT = Math.max(0, eventT - dt)
    if (eventT <= 0) {
      eventT = EVENT_EVERY
      const kind = eventIdx % 3; eventIdx++
      if (kind === 0) spikeT = SPIKE_TIME
      else if (kind === 1) stormT = STORM_TIME
      else {
        const gens = nodes.filter(n => n.kind === 'gen' && n.online && !n.failed)
        if (gens.length) {
          const g = gens[Math.floor(random() * gens.length)]
          nodes = nodes.map(n => (n.id === g.id ? { ...n, online: false, startLeft: TRIP_TIME } : n))
          tripId = g.id
        }
      }
    }
  }
  const heat = s.mode === 'campanha' && isHeatWave(s.time)
  const nextHeat = s.mode === 'campanha' && isHeatWave(time)
  const mult = nextHeat ? WAVE_MULT : spikeT > 0 ? SPIKE_MULT : 1
  const rmult = stormT > 0 ? STORM_MULT : 1
  event = heat ? strings.events.heat : s.spikeT > 0 ? strings.events.spike : s.stormT > 0 ? strings.events.storm : s.tripId !== null ? strings.events.trip(s.tripId) : ''

  const zones = nodes.filter(n => n.kind === 'zone')
  let demand = zones.reduce((a, n) => a + n.kW * s.mult, 0)
  const supplied = zones.filter(n => pw.has(n.id)).reduce((a, n) => a + n.kW * s.mult, 0)
  const cableLoss = cables.reduce((a, c) => a + c.loss, 0) / 1000
  const subLoss = nodes.filter(n => n.kind === 'sub').reduce((a, n) => a + (r.nodeLoad[n.id] ?? 0) * SUB_LOSS, 0)
  const losses = cableLoss + subLoss
  if (supplied > 0) everPowered = true
  // continuidade (só conta depois da primeira luz): tempo atendido × em apagão
  if (everPowered && demand > 0) {
    if (supplied >= demand) serviceT += dt
    else if (supplied < demand * BLACKOUT_AT) outageT += dt
  }
  if (zones.some(n => n.zoneType === 'hospital' && pw.has(n.id))) criticalT += dt

  // crescimento urbano (BFS pelas ruas) a partir do que está energizado; só com a cidade atendida
  if (s.mode !== 'sandbox' && demand > 0 && supplied >= demand && zones.length < MAX_ZONES && Math.floor(time / GROWTH_EVERY) > Math.floor(s.time / GROWTH_EVERY)) {
    const pool: ZoneType[] = ['casa', 'casa', 'casa', 'predio', 'predio', 'hospital']
    const zt = pool[Math.floor(random() * pool.length)]
    const spec = ZONES[zt]
    const lot = nextLot(nodes, pw, random)
    if (lot) {
      const zn = makeNode(nextId++, 'zone', lot.x, lot.z, spec.volt)
      nodes = [...nodes, { ...zn, kW: spec.kW, zoneType: zt }]
      demand += spec.kW * s.mult
      msg = strings.events.growth(spec.label, spec.volt)
    }
  }

  // economia (não em sandbox). Hospital sem energia pesa mais.
  const unpowered = zones.filter(n => !pw.has(n.id))
  const deficit = unpowered.reduce((a, n) => a + n.kW * s.mult, 0)
  const criticalDeficit = unpowered.filter(n => n.zoneType === 'hospital').reduce((a, n) => a + n.kW * s.mult, 0)
  const blackout = demand > 0 && supplied < demand * BLACKOUT_AT
  if (s.mode !== 'sandbox') {
    const fuel = nodes.filter(n => n.kind === 'gen' && n.online && !n.failed).reduce((a, n) => a + (r.nodeLoad[n.id] ?? 0) * (n.genType ? GENS[n.genType].fuel : 0), 0)
    const maint = s.maintenanceOn ? nodes.length * MAINTENANCE_COST : 0
    budget += (supplied * ENERGY_PRICE - losses * LOSS_COST - (blackout ? (deficit + criticalDeficit * CRITICAL_PENALTY) * BLACKOUT_PENALTY : 0) - fuel - maint) * dt
    if (budget < 0) budget = 0
  }

  const calm = fc || fn ? 0 : s.calm + dt, combo = 1 + Math.min(9, Math.floor(calm / 20))
  const goal = objective({ ...s, demand, supplied, losses, nodes, cables })
  let goalT = goal && goal.block === null ? s.goalT + dt : 0
  let challengeDone = s.challengeDone
  if (goal && goalT + 1e-8 >= goal.hold) {
    goalT = 0
    if (s.mode === 'desafio') {
      challengeDone = true
      levelResult = { kind: 'challenge', supply: supplied, spend: Math.max(0, CHALLENGE_BUDGET - budget) }
    } else {
      const done = levelAt(level)
      const earned = budget >= done.stars[0] ? (budget >= done.stars[1] ? 3 : 2) : 1
      level++
      const complete = campaignComplete(level)
      const grant = complete ? 0 : Math.max(0, levelAt(level).budget - budget)
      levelResult = { kind: complete ? 'final' : 'level', level: done.n, stars: earned, supply: supplied, grant }
      stars = earned; totalStars += earned
      budget += grant
    }
  }

  const part: Partial<S> = {
    time, night, sampleTime: s.time, sampleRmult: s.rmult, nodes, cables, nextId, event, mult, rmult, spikeT, stormT, tripId, eventT, eventIdx, report, calm, combo, goalT, level, stars, totalStars, budget, msg, levelResult,
    demand, supplied, losses, challengeDone, everPowered, serviceT, outageT, criticalT, nodeV: r.nodeV,
    score: s.score + supplied * combo * dt * 0.1, powered: r.powered, mismatch: r.mismatch,
  }
  const next = { ...s, ...part } as S, done = [...s.done]
  for (const g of [...MISSIONS, ...ACHIEVEMENTS]) if (!done.includes(g.id) && g.check(next, pw)) {
    done.push(g.id)
    if (g.reward && s.mode !== 'sandbox') part.budget = (part.budget ?? 0) + g.reward
  }
  part.done = done
  return part
}
