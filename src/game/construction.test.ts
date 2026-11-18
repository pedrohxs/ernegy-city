import { describe, expect, it } from 'vitest'
import { makeNode } from '../electrical/engine'
import { cableQuote } from './construction'

const trafo = makeNode(1, 'trafo', 0, 0, 110)
const house = makeNode(2, 'zone', 20, 0, 110)

describe('prévia de cabos', () => {
  it('calcula compra e risco da mesma maneira nos dois sentidos', () => {
    const quote = cableQuote(trafo, house, 'cobre', 35)
    expect(quote).toEqual(cableQuote(house, trafo, 'cobre', 35))
    expect(quote).toMatchObject({ cost: 1840, length: 20, voltage: 110, mismatch: false, overcurrent: true })
    expect(quote.current).toBeCloseTo(181.82, 2)
    expect(cableQuote(trafo, house, 'cobre', 95).overcurrent).toBe(false)
    expect(cableQuote(trafo, { ...house, volt: 220 }, 'cobre', 35)).toMatchObject({ current: null, mismatch: true })
    expect(cableQuote(makeNode(3, 'gen', 0, 0, 110), trafo, 'cobre', 35)).toMatchObject({ voltage: 13800, current: null })
  })
})
