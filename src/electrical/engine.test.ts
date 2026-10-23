import { describe, expect, it } from 'vitest'
import { Cable, ampacity, jouleLoss, makeCable, makeNode, resistance, solve, stepCable, stepNode, wearRate } from './engine'
import { RUPTURE_FACTOR, T_MAX, WEAR_BASE } from '../data/balance'

const cab = (id: number, a: number, b: number, R: number, area = 35): Cable => makeCable(id, a, b, 'cobre', area, 10, R)
const net = (lv: number[], zoneV = 220) => ({
  nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'trafo', 10, 0, 220), makeNode(3, 'zone', 20, 0, zoneV)],
  cables: [cab(10, 1, 2, 0.001), ...lv.map((R, i) => cab(11 + i, 2, 3, R))],
})

describe('fórmulas', () => {
  it('R = ρL/A', () => expect(resistance('cobre', 127, 35)).toBeCloseTo(0.0617, 3))
  it('P = R·I²', () => expect(jouleLoss(0.081, 482)).toBeCloseTo(18818.2, 0))
})
describe('solver nodal', () => {
  it('queda de tensão no cabo BT', () => {
    const { nodes, cables } = net([0.1]), r = solve(nodes, cables)
    expect(r.powered.has(3)).toBe(true)
    expect(r.nodeV[3]).toBeGreaterThan(190); expect(r.nodeV[3]).toBeLessThan(215)
    expect(r.drop[11]).toBeGreaterThan(10)
  })
  it('malha: cabos em paralelo dividem a corrente', () => {
    const { nodes, cables } = net([0.2, 0.2]), r = solve(nodes, cables)
    expect(r.current[11]).toBeCloseTo(r.current[12], 3)
    const expected = 40000 / r.nodeV[3]
    expect(Math.abs(r.current[11] + r.current[12] - expected) / expected).toBeLessThan(0.01)
  })
  it('tensão errada não alimenta a zona', () => {
    const { nodes, cables } = net([0.01], 110), r = solve(nodes, cables)
    expect(r.powered.has(3)).toBe(false); expect(r.mismatch.has(3)).toBe(true)
  })
  it('zona desconectada fica sem energia', () => {
    const { nodes, cables } = net([]), r = solve(nodes, cables)
    expect(r.powered.has(3)).toBe(false)
  })
  it('cabo falhado desconecta a zona', () => {
    const { nodes, cables } = net([0.1]); cables[1].failed = true // cabo BT 2-3
    const r = solve(nodes, cables)
    expect(r.powered.has(3)).toBe(false)
    expect(r.nodeV[3]).toBe(0)
  })
  it('cabo primário falhado isola toda a rede', () => {
    const { nodes, cables } = net([0.1]); cables[0].failed = true // cabo HV 1-2
    const r = solve(nodes, cables)
    expect(r.powered.size).toBe(0)
  })
  it('rede sem gerador não energiza nada', () => {
    const nodes = [makeNode(2, 'trafo', 10, 0, 220), makeNode(3, 'zone', 20, 0, 220)]
    const r = solve(nodes, [cab(11, 2, 3, 0.1)])
    expect(r.powered.size).toBe(0)
    expect(r.mismatch.size).toBe(0)
    expect(r.nodeV[3]).toBe(0)
  })
})
describe('passos térmicos', () => {
  it('cabo esquenta por efeito Joule e falha em T_MAX', () => {
    // 95 mm² (I_z ≈ 233 A): 500 A aquece até falhar, mas fica abaixo do limite de rompimento (3·I_z)
    let c = cab(1, 1, 2, 0.1, 95)
    for (let i = 0; i < 500 && !c.failed; i++) c = stepCable(c, 500, 220, 0, 0.1)
    expect(c.failed).toBe(true)
    expect(c.fault).toBe('heat')
    expect(c.temp).toBeGreaterThanOrEqual(T_MAX)
  })
  it('cabo sem corrente esfria até a temperatura ambiente', () => {
    let c = { ...cab(1, 1, 2, 0.1), temp: 80 }
    for (let i = 0; i < 500; i++) c = stepCable(c, 0, 220, 0, 0.1)
    expect(c.failed).toBe(false)
    expect(c.temp).toBeCloseTo(25, 0)
  })
  it('trafo esquenta com (carga/capacidade)² e falha por sobrecarga', () => {
    let n = makeNode(1, 'trafo', 0, 0, 220) // cap 150 kW
    for (let i = 0; i < 5000 && !n.failed; i++) n = stepNode(n, 300, 0.1)
    expect(n.failed).toBe(true)
  })
  it('trafo abaixo de 85% da capacidade não falha', () => {
    let n = makeNode(1, 'trafo', 0, 0, 220)
    for (let i = 0; i < 2000; i++) n = stepNode(n, 120, 0.1)
    expect(n.failed).toBe(false)
  })
  it('manutenção reduz o aquecimento', () => {
    let norm = makeNode(1, 'trafo', 0, 0, 220), mant = { ...makeNode(2, 'trafo', 0, 0, 220), maintained: true }
    for (let i = 0; i < 100; i++) { norm = stepNode(norm, 300, 0.1); mant = stepNode(mant, 300, 0.1) }
    expect(mant.temp).toBeLessThan(norm.temp)
  })
})

describe('múltiplos geradores, subestação e tempestade', () => {
  const multi = () => ({
    nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'gen', 0, 10, 0), makeNode(3, 'trafo', 20, 0, 220), makeNode(4, 'zone', 30, 0, 220)],
    cables: [cab(10, 1, 3, 0.01), cab(11, 2, 3, 0.01), cab(12, 3, 4, 0.05)],
  })
  it('dois geradores dividem a carga', () => {
    const { nodes, cables } = multi(), r = solve(nodes, cables)
    expect(r.powered.has(4)).toBe(true)
    expect(r.nodeLoad[1]).toBeGreaterThan(0)
    expect(r.nodeLoad[2]).toBeGreaterThan(0)
    expect(r.nodeLoad[1] + r.nodeLoad[2]).toBeGreaterThan(39) // ≥ demanda (40 kW) menos aproximação
  })
  it('gerador offline não é fonte', () => {
    const { nodes, cables } = multi()
    const off = nodes.map(n => (n.kind === 'gen' ? { ...n, online: false } : n))
    const r = solve(off, cables)
    expect(r.powered.size).toBe(0)
  })
  it('subestação tem throughput e alimenta a zona', () => {
    const nodes = [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'sub', 10, 0, 0), makeNode(3, 'trafo', 20, 0, 220), makeNode(4, 'zone', 30, 0, 220)]
    const cables = [cab(10, 1, 2, 0.01), cab(11, 2, 3, 0.01), cab(12, 3, 4, 0.05)]
    const r = solve(nodes, cables)
    expect(r.powered.has(4)).toBe(true)
    expect(r.nodeLoad[2]).toBeGreaterThan(0) // throughput da sub
  })
  it('tempestade aumenta a resistência e a queda de tensão', () => {
    const { nodes, cables } = net([0.1])
    const normal = solve(nodes, cables, 1, 1), storm = solve(nodes, cables, 1, 1.3)
    expect(storm.drop[11]).toBeGreaterThan(normal.drop[11])
  })
})

describe('ampacidade, rompimento e desgaste', () => {
  it('ampacidade corresponde à tabela NBR 5410 (cobre B1)', () => {
    const table: [number, number][] = [[16, 76], [25, 101], [35, 125], [50, 151], [70, 192], [95, 232]]
    for (const [A, Iz] of table) expect(ampacity('cobre', A)).toBe(Iz)
    expect(ampacity('cobre', 20)).toBeCloseTo(76 + (4 / 9) * 25)
    expect(ampacity('aluminio', 35)).toBeLessThan(ampacity('cobre', 35))
  })
  it('corrente acima de 3·I_z rompe o cabo no mesmo passo (curto)', () => {
    const c = cab(1, 1, 2, 0.001, 16) // I_z ≈ 77 A
    const r = stepCable(c, ampacity('cobre', 16) * RUPTURE_FACTOR * 1.01, 220, 0, 0.1)
    expect(r.failed).toBe(true)
    expect(r.fault).toBe('overcurrent')
  })
  it('corrente nominal não rompe nem aquece até falhar', () => {
    let c = cab(1, 1, 2, 0.001, 35)
    for (let i = 0; i < 1000; i++) c = stepCable(c, ampacity('cobre', 35), 220, 0, 0.1)
    expect(c.failed).toBe(false)
  })
  it('desgaste: zero sem carga, base em serviço, acelera acima de 85%', () => {
    expect(wearRate(0, false)).toBe(0)
    expect(wearRate(0.5, false)).toBeCloseTo(WEAR_BASE, 6)
    expect(wearRate(1, false)).toBeGreaterThan(wearRate(0.85, false) * 10)
    expect(wearRate(1, true)).toBeLessThan(wearRate(1, false)) // manutenção preserva
  })
  it('integridade zerada derruba o componente por fim de vida útil', () => {
    const c = stepCable({ ...cab(1, 1, 2, 0.001, 35), health: 0.0001 }, 50, 220, 0, 1)
    expect(c.failed).toBe(true)
    expect(c.fault).toBe('wear')
    const n = stepNode({ ...makeNode(2, 'trafo', 0, 0, 220), health: 0.0001 }, 50, 1)
    expect(n.failed).toBe(true)
    expect(n.fault).toBe('wear')
  })
  it('sobrecarga gasta a integridade do trafo mais rápido', () => {
    let ok = makeNode(1, 'trafo', 0, 0, 220), over = makeNode(2, 'trafo', 0, 0, 220)
    for (let i = 0; i < 100; i++) { ok = stepNode(ok, 75, 0.1); over = stepNode(over, 150, 0.1) }
    expect(over.health).toBeLessThan(ok.health)
    expect(ok.health).toBeLessThan(100)
  })
})
