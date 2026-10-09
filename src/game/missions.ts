import type { S } from '../store/gameStore'
export interface Goal { id: string; title: string; reward: number; check: (s: S, powered: Set<number>) => boolean }
const zoneOn = (s: S, p: Set<number>, v: number) => s.nodes.some(n => n.kind === 'zone' && n.volt === v && p.has(n.id))
export const MISSIONS: Goal[] = [
  { id: 'm1', title: 'Alimente uma zona', reward: 5000, check: s => s.supplied > 0 },
  { id: 'm2', title: 'Distribua 110 V corretamente', reward: 8000, check: (s, p) => zoneOn(s, p, 110) },
  { id: 'm3', title: 'Atenda uma indústria de 220 V', reward: 8000, check: (s, p) => zoneOn(s, p, 220) },
  { id: 'm4', title: 'Perdas < 10% com ≥ 60 kW', reward: 15000, check: s => s.supplied >= 60 && s.losses / s.supplied < 0.1 },
  { id: 'm5', title: 'Atenda 200 kW', reward: 25000, check: s => s.supplied >= 200 },
  { id: 'm6', title: '120 s sem falhas', reward: 15000, check: s => s.calm >= 120 },
  { id: 'm7', title: '🏥 Hospital energizado por 60 s', reward: 20000, check: s => s.criticalT >= 60 },
  { id: 'm8', title: '📶 Continuidade ≥ 95% por 2 min', reward: 25000, check: s => s.serviceT >= 120 && s.serviceT / Math.max(s.serviceT + s.outageT, 1) >= 0.95 },
  { id: 'm9', title: '🚫 Apagão zero: 90 s com tudo aceso', reward: 30000, check: s => s.serviceT >= 90 && s.outageT === 0 },
]
export const ACHIEVEMENTS: Goal[] = [
  { id: 'a1', title: '💡 Primeira luz', reward: 0, check: s => s.supplied > 0 },
  { id: 'a2', title: '🔥 Combo ×5', reward: 0, check: s => s.combo >= 5 },
  { id: 'a3', title: '🏙 Nível 3', reward: 0, check: s => s.level >= 3 },
  { id: 'a4', title: '🧯 Sobreviveu a uma falha', reward: 0, check: s => s.report !== null },
  { id: 'a5', title: '🏥 Hospital salvo', reward: 0, check: s => s.criticalT >= 30 },
]
