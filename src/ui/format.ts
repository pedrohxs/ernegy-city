import { Level } from '../data/balance'

export function goalText(l: Level): string {
  if (l.goal === 'supply') return `atenda ≥ ${l.target} kW por ${l.hold}s`
  if (l.goal === 'heatwave') return `atenda ≥ ${l.target} kW durante a onda de calor por ${l.hold}s`
  return `atenda ≥ ${l.minLoss} kW com perdas < ${l.maxLossPct}% por ${l.hold}s`
}
