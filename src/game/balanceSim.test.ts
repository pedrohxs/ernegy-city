import { describe, expect, it } from 'vitest'
import { formatGrowthTable, formatTable, growthCurve, runAll, SimResult } from './balanceSim'

describe('balanceamento por simulação', () => {
  const results: SimResult[] = runAll()

  it('imprime a tabela dos níveis 1-10', () => {
    console.log('\n' + formatTable(results))
  })

  it('todos os níveis 1-10 são alcançáveis', () => {
    const notReached = results.filter(r => !r.reached).map(r => r.level)
    expect(notReached).toEqual([])
  })

  it('nenhum layout de referência estoura o orçamento do nível', () => {
    const overBudget = results.filter(r => r.cost > r.budget).map(r => r.level)
    expect(overBudget).toEqual([])
  })

  it('sempre concede ao menos 1 estrela', () => {
    expect(results.every(r => r.stars >= 1)).toBe(true)
  })
})

describe('crescimento × orçamento', () => {
  const growth = growthCurve()

  it('imprime a tabela de crescimento dos níveis', () => {
    console.log('\n' + formatGrowthTable(growth))
  })

  it('o orçamento do nível cobre o layout inicial + o crescimento durante o nível', () => {
    const over = growth.filter(g => !g.fits).map(g => g.level)
    expect(over).toEqual([])
  })
})
