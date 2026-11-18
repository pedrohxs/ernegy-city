import { Level } from '../data/balance'
import { strings } from '../i18n/pt-BR'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const reais = (value: number) => money.format(value)

export function goalText(l: Level): string {
  const t = strings.objective
  if (l.goal === 'supply') return t.supplyGoal(l.target, l.hold)
  if (l.goal === 'heatwave') return t.heatGoal(l.target, l.hold)
  return t.lossGoal(l.minLoss ?? l.target, l.hold, l.maxLossPct ?? 10)
}
