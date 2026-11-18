import { CHALLENGE_KW, GOAL_SECONDS, HEAT_WAVE_AFTER, LEVELS, WAVE_PERIOD, WAVE_TIME, levelAt } from '../data/balance'
import type { S } from '../store/gameStore'

export type ObjectiveBlock = 'fault' | 'supply' | 'losses' | 'heat'
type ObjectiveState = Pick<S, 'mode' | 'level' | 'challengeDone' | 'demand' | 'supplied' | 'losses' | 'nodes' | 'cables' | 'time'>

export const isHeatWave = (time: number) => time > HEAT_WAVE_AFTER && time % WAVE_PERIOD < WAVE_TIME
export const campaignComplete = (level: number) => level > LEVELS.length
export const secondsToHeat = (time: number) => Math.max(WAVE_PERIOD, (Math.floor(time / WAVE_PERIOD) + 1) * WAVE_PERIOD) - time

export function objective(s: ObjectiveState) {
  if (s.mode === 'sandbox' || (s.mode === 'campanha' && campaignComplete(s.level)) || (s.mode === 'desafio' && s.challengeDone)) return null
  const campaign = s.mode === 'campanha'
  const level = levelAt(s.level)
  const hold = campaign ? level.hold : GOAL_SECONDS
  const target = campaign ? (level.minLoss ?? level.target) : CHALLENGE_KW
  let block: ObjectiveBlock | null = null
  if (s.nodes.some(n => n.failed) || s.cables.some(c => c.failed)) block = 'fault'
  else if (campaign && level.goal === 'heatwave' && !isHeatWave(s.time)) block = 'heat'
  else if (campaign ? s.supplied < target : s.demand < target || s.supplied < s.demand) block = 'supply'
  else if (campaign && level.goal === 'losses' && 100 * s.losses > (level.maxLossPct ?? 10) * s.supplied) block = 'losses'
  return { target, hold, block }
}
