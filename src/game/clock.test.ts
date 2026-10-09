import { describe, expect, it } from 'vitest'
import { DAY_SECONDS } from '../data/balance'
import { dayFactor, formatClock, hourOf, nightFactor, sunElevation } from './clock'

describe('relógio do jogo', () => {
  it('começa às 08:00 e cobre 24 h em DAY_SECONDS', () => {
    expect(hourOf(0)).toBeCloseTo(8, 6)
    expect(hourOf(DAY_SECONDS / 2)).toBeCloseTo(20, 6)
    expect(hourOf(DAY_SECONDS)).toBeCloseTo(8, 6)
  })

  it('elevação do sol: 0 no nascer/pôr, 1 ao meio-dia, -1 à meia-noite', () => {
    expect(sunElevation(6)).toBeCloseTo(0, 6)
    expect(sunElevation(18)).toBeCloseTo(0, 6)
    expect(sunElevation(12)).toBeCloseTo(1, 6)
    expect(sunElevation(0)).toBeCloseTo(-1, 6)
  })

  it('fatores de dia/noite são complementares', () => {
    expect(dayFactor(12)).toBeCloseTo(1, 6)
    expect(nightFactor(12)).toBeCloseTo(0, 6)
    expect(dayFactor(0)).toBeCloseTo(0, 6)
    expect(nightFactor(0)).toBeCloseTo(1, 6)
  })

  it('formata HH:MM', () => {
    expect(formatClock(8)).toBe('08:00')
    expect(formatClock(13.5)).toBe('13:30')
    expect(formatClock(0.25)).toBe('00:15')
    expect(formatClock(23.99)).toBe('23:59')
  })
})
