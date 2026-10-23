// Integração do fluxo principal: construir → simular → falhar → relatório.
import { beforeEach, describe, expect, it } from 'vitest'
import { REFUND, REPAIR_FRACTION, T_AMB } from '../data/balance'
import { useGame } from './gameStore'

const g = () => useGame.getState()
const step = async (n: number, dt = 0.5) => { for (let i = 0; i < n; i++) await g().stepSim(dt) }

beforeEach(() => {
  g().newGame('sandbox')
})

describe('fluxo principal', () => {
  it('constrói gerador→trafo→zona, energiza e acumula resultado', async () => {
    g().set({ tool: 'gen', genType: 'gas' }); g().place(0, 0)
    g().set({ tool: 'trafo', tv: 220 }); g().place(0, 40)
    g().set({ tool: 'zone', zoneType: 'predio' }); g().place(0, 80)
    g().set({ tool: 'cabo' }); g().clickNode(1); g().clickNode(2)
    g().set({ tool: 'cabo' }); g().clickNode(2); g().clickNode(3)
    expect(g().nodes).toHaveLength(3)
    expect(g().cables).toHaveLength(2)

    await step(20) // 10 s de simulação (partida do gerador = 2 s)
    expect(g().powered).toContain(3)
    expect(g().supplied).toBeGreaterThan(0)
    expect(g().losses).toBeGreaterThan(0)
  })

  it('sobrecarrega um cabo, gera Post-Mortem e permite reparar/remover', async () => {
    g().set({ tool: 'gen', genType: 'gas' }); g().place(0, 0)
    g().set({ tool: 'trafo', tv: 220 }); g().place(0, 40)
    g().set({ tool: 'zone', zoneType: 'predio' }); g().place(0, 80)
    g().set({ tool: 'cabo' }); g().clickNode(1); g().clickNode(2)
    g().set({ tool: 'cabo' }); g().clickNode(2); g().clickNode(3)
    await step(20)

    // zona distante + cabo fino (16 mm², 200 m → R ≈ 0,21 Ω) → colapso térmico
    g().set({ tool: 'zone', zoneType: 'predio' }); g().place(0, 240)
    const zoneId = g().nodes[g().nodes.length - 1].id
    const trafoId = g().nodes.find(n => n.kind === 'trafo')!.id
    g().set({ tool: 'cabo', area: 16 }); g().clickNode(trafoId); g().clickNode(zoneId)
    await step(60)

    const r = g().report
    expect(r).not.toBeNull()
    expect(r!.title).toContain('COLAPSO')
    expect(r!.lines.length).toBeGreaterThanOrEqual(3)
    expect(r!.lines.join(' ')).toMatch(/R =/)
    expect(r!.lines.join(' ')).toMatch(/P = R/)
    expect(g().cables.some(c => c.failed)).toBe(true)

    // O Post-Mortem aponta o cabo exato para permitir a recuperação.
    const failed = g().cables.find(c => c.failed)
    if (!failed) throw new Error('nenhum cabo falhou')
    expect(r!.target).toEqual({ type: 'cable', id: failed.id })

    // Reparo: 25% do custo, volta ao ar e o relatório fecha.
    const beforeRepair = g().budget
    const repairCost = Math.round(failed.cost * REPAIR_FRACTION)
    expect(g().repairCable(failed.id)).toBe(true)
    const repaired = g().cables.find(c => c.id === failed.id)
    expect(repaired?.failed).toBe(false)
    expect(repaired?.temp).toBe(T_AMB)
    expect(g().budget).toBe(beforeRepair - repairCost)
    expect(g().report).toBeNull()
    expect(g().repairCable(failed.id)).toBe(false)

    // Remoção: devolve 50% e o undo restaura o cabo.
    const beforeRemove = g().budget
    const refund = Math.round(failed.cost * REFUND)
    expect(g().removeCable(failed.id)).toBe(true)
    expect(g().cables.some(c => c.id === failed.id)).toBe(false)
    expect(g().budget).toBe(beforeRemove + refund)
    g().undo()
    expect(g().cables.some(c => c.id === failed.id)).toBe(true)
    expect(g().budget).toBe(beforeRemove)
    expect(g().removeCable(9999)).toBe(false)
  })
})
