// Passo da simulação (puro): aplica o resultado do solver ao estado.
// Economia: receita por energia, custo de perdas, penalidade por apagão, combustível e manutenção.
import {
  BLACKOUT_AT, BLACKOUT_PENALTY, CHALLENGE_BUDGET, CHALLENGE_KW, CRITICAL_PENALTY, ENERGY_PRICE, EVENT_EVERY, GENS,
  GOAL_SECONDS, GROWTH_EVERY, HEAT_WAVE_AFTER, LEVEL_BONUS, LOSS_COST, MAINTENANCE_COST, MAX_ZONES, SPIKE_MULT,
  SPIKE_TIME, STORM_MULT, STORM_TIME, SUB_LOSS, TRIP_TIME, WAVE_MULT, ZONES, ZoneType, levelAt,
} from '../data/balance'
import { makeNode, stepCable, stepNode } from '../electrical/engine'
import type { S } from '../store/gameStore'
import { beep } from '../audio/audio'
import { ACHIEVEMENTS, MISSIONS } from './missions'
import { nextLot } from './city'
import { strings } from '../i18n/pt-BR'

export interface Res { current: Record<number, number>; volt: Record<number, number>; drop: Record<number, number>; nodeLoad: Record<number, number>; nodeV: Record<number, number>; powered: number[]; mismatch: number[] }
const FIXES = [...strings.report.fixes]

/** Objetivo do nível cumprido agora? (usado para acumular goalT e no script de balanceamento). */
export function goalSatisfied(s: S, supplied: number, losses: number): boolean {
  const lvl = levelAt(s.level)
  const heat = s.time > HEAT_WAVE_AFTER && s.time % 90 < 20
  if (lvl.goal === 'supply') return supplied >= lvl.target
  if (lvl.goal === 'heatwave') return supplied >= lvl.target && heat
  const min = lvl.minLoss ?? lvl.target
  return supplied >= min && (losses / Math.max(supplied, 1)) * 100 <= (lvl.maxLossPct ?? 10)
}

export function advance(s: S, r: Res, dt: number): Partial<S> {
  const time = s.time + dt, pw = new Set(r.powered)
  let nodes = s.nodes.map(n => {
    // partida de gerador / reconexão após queda; solar só opera de dia
    let online = n.online, startLeft = n.startLeft
    if (n.kind === 'gen') {
      if (startLeft > 0) startLeft = Math.max(0, startLeft - dt)
      online = startLeft <= 0 && !(n.genType === 'solar' && s.night)
    }
    return stepNode({ ...n, online, startLeft, maintained: s.maintenanceOn }, r.nodeLoad[n.id] ?? 0, dt)
  })
  const cables = s.cables.map(c => stepCable(c, r.current[c.id] ?? 0, r.volt[c.id] ?? 220, r.drop[c.id] ?? 0, dt))
  let { nextId, event, msg, report, budget, level, stars, totalStars, eventT, eventIdx, levelResult, everPowered, serviceT, outageT, criticalT } = s

  // falhas novas -> relatório Post-Mortem
  const fc = cables.find((c, i) => c.failed && !s.cables[i].failed)
  const fn = nodes.find((n, i) => n.failed && !s.nodes[i].failed)
  if (fc) report = { title: `COLAPSO — Cabo C-${fc.id}`, lines: [`Corrente: ${fc.current.toFixed(0)} A (${fc.volt} V), queda ${fc.drop.toFixed(1)} V`, `R = ρ×L/A = ${fc.R.toFixed(3)} Ω`, `P = R×I² = ${fc.R.toFixed(3)} × ${fc.current.toFixed(0)}² ≈ ${(fc.loss / 1000).toFixed(1)} kW`, `Temperatura chegou a ${fc.temp.toFixed(0)} °C`], fixes: FIXES, target: { type: 'cable', id: fc.id } }
  if (fn) report = { title: `COLAPSO — ${fn.kind === 'gen' ? 'Gerador' : fn.kind === 'sub' ? 'Subestação' : 'Transformador'} #${fn.id}`, lines: [`Carga: ${fn.load.toFixed(0)} kW`, `Capacidade: ${fn.cap} kW`, `Sobrecarga: ${((fn.load / Math.max(fn.cap, 1) - 1) * 100).toFixed(1)}%`], fixes: FIXES, target: { type: 'node', id: fn.id } }
  if (fc || fn) beep()

  // eventos determinísticos após a primeira onda de calor
  let spikeT = Math.max(0, s.spikeT - dt), stormT = Math.max(0, s.stormT - dt)
  if (s.mode !== 'sandbox' && time > HEAT_WAVE_AFTER) {
    eventT = Math.max(0, eventT - dt)
    if (eventT <= 0) {
      eventT = EVENT_EVERY
      const kind = eventIdx % 3; eventIdx++
      if (kind === 0) { spikeT = SPIKE_TIME; event = '⚡ Pico de consumo: demanda +50%' }
      else if (kind === 1) { stormT = STORM_TIME; event = '⛈ Tempestade: resistência dos cabos +30%' }
      else {
        const gens = nodes.filter(n => n.kind === 'gen' && n.online && !n.failed)
        if (gens.length) {
          const g = gens[Math.floor(Math.random() * gens.length)]
          nodes = nodes.map(n => (n.id === g.id ? { ...n, online: false, startLeft: TRIP_TIME } : n))
          event = `🔧 Queda do gerador #${g.id}: religando em ${TRIP_TIME}s`
        }
      }
    }
  }
  const heat = s.mode === 'campanha' && time > HEAT_WAVE_AFTER && time % 90 < 20
  const mult = heat ? WAVE_MULT : spikeT > 0 ? SPIKE_MULT : 1
  const rmult = stormT > 0 ? STORM_MULT : 1
  if (heat) event = '⚠ Onda de calor: demanda +20%'
  else if (event.startsWith('⚠')) event = ''

  const zones = nodes.filter(n => n.kind === 'zone')
  const demand = zones.reduce((a, n) => a + n.kW * mult, 0)
  const supplied = zones.filter(n => pw.has(n.id)).reduce((a, n) => a + n.kW * mult, 0)
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
    const zt = pool[Math.floor(Math.random() * pool.length)]
    const spec = ZONES[zt]
    const lot = nextLot(nodes, pw)
    if (lot) {
      const zn = makeNode(nextId++, 'zone', lot.x, lot.z, spec.volt)
      nodes = [...nodes, { ...zn, kW: spec.kW, zoneType: zt }]
      event = `📈 Crescimento urbano: nova ${spec.label.toLowerCase()} no bairro`
    }
  }

  // economia (não em sandbox). Hospital sem energia pesa mais.
  const unpowered = zones.filter(n => !pw.has(n.id))
  const deficit = unpowered.reduce((a, n) => a + n.kW * mult, 0)
  const criticalDeficit = unpowered.filter(n => n.zoneType === 'hospital').reduce((a, n) => a + n.kW * mult, 0)
  const blackout = demand > 0 && supplied < demand * BLACKOUT_AT
  if (s.mode !== 'sandbox') {
    const fuel = nodes.filter(n => n.kind === 'gen' && n.online && !n.failed).reduce((a, n) => a + (r.nodeLoad[n.id] ?? 0) * (n.genType ? GENS[n.genType].fuel : 0), 0)
    const maint = s.maintenanceOn ? nodes.length * MAINTENANCE_COST : 0
    budget += (supplied * ENERGY_PRICE - losses * LOSS_COST - (blackout ? (deficit + criticalDeficit * CRITICAL_PENALTY) * BLACKOUT_PENALTY : 0) - fuel - maint) * dt
    if (budget < 0) budget = 0
  }

  const calm = fc || fn ? 0 : s.calm + dt, combo = 1 + Math.min(9, Math.floor(calm / 20))
  const target = s.mode === 'desafio' ? CHALLENGE_KW : levelAt(level).target
  const hold = s.mode === 'desafio' ? GOAL_SECONDS : levelAt(level).hold
  const met = s.mode === 'desafio' ? demand >= target && supplied >= demand : goalSatisfied(s, supplied, losses)
  let goalT = met ? s.goalT + dt : 0
  let challengeDone = s.challengeDone
  if (goalT >= hold) {
    goalT = 0
    if (s.mode === 'desafio') { challengeDone = true; msg = `🏆 Desafio concluído gastando R$ ${(CHALLENGE_BUDGET - budget).toFixed(0)}!` }
    else if (s.mode === 'campanha') {
      const done = levelAt(level)
      const earned = budget >= done.stars[0] ? (budget >= done.stars[1] ? 3 : 2) : 1
      levelResult = { level: done.n, stars: earned, supply: supplied, spend: Math.max(0, done.budget - budget) }
      stars = Math.max(stars, earned); totalStars += earned
      level++
      budget = levelAt(level).budget
      msg = `🎉 Nível ${level}: ${levelAt(level).title}! ⭐${'★'.repeat(earned)}${'☆'.repeat(3 - earned)} +R$ ${LEVEL_BONUS}`
    } else {
      level++
      budget += LEVEL_BONUS
      msg = `🎉 Nível ${level}!`
    }
  }

  const part: Partial<S> = {
    time, nodes, cables, nextId, event, mult, rmult, spikeT, stormT, eventT, eventIdx, report, calm, combo, goalT, level, stars, totalStars, budget, msg, levelResult,
    demand, supplied, losses, challengeDone, everPowered, serviceT, outageT, criticalT, nodeV: r.nodeV,
    score: s.score + supplied * combo * dt * 0.1, powered: r.powered, mismatch: r.mismatch,
  }
  const next = { ...s, ...part } as S, done = [...s.done]
  for (const g of [...MISSIONS, ...ACHIEVEMENTS]) if (!done.includes(g.id) && g.check(next, pw)) {
    done.push(g.id)
    if (g.reward) { part.budget = (part.budget ?? 0) + g.reward; part.msg = `✅ Missão: ${g.title} (+R$ ${g.reward})` }
  }
  part.done = done
  return part
}
