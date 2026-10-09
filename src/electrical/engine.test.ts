import { describe, expect, it } from 'vitest'
import { Cable, jouleLoss, makeNode, resistance, solve, stepCable, stepNode } from './engine'
import { T_MAX } from '../data/balance'

const cab = (id: number, a: number, b: number, R: number): Cable => ({ id, a, b, material: 'cobre', area: 35, length: 10, R, cost: 0, current: 0, volt: 220, drop: 0, loss: 0, temp: 25, failed: false })
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
    let c = cab(1, 1, 2, 0.1)
    for (let i = 0; i < 500 && !c.failed; i++) c = stepCable(c, 500, 220, 0, 0.1)
    expect(c.failed).toBe(true)
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
  it('trafo dentro da capacidade não falha', () => {
    let n = makeNode(1, 'trafo', 0, 0, 220)
    for (let i = 0; i < 2000; i++) n = stepNode(n, 150, 0.1)
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
