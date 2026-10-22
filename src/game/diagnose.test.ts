import { describe, expect, it } from 'vitest'
import { makeNode } from '../electrical/engine'
import type { Cable } from '../electrical/engine'
import { diagnoseCable, diagnoseZone, nextAction } from './diagnose'

const cable = (id: number, a: number, b: number): Cable => ({
  id,
  a,
  b,
  material: 'cobre',
  area: 35,
  length: 20,
  R: 0.01,
  cost: 1000,
  current: 10,
  volt: 110,
  drop: 0.1,
  loss: 1,
  temp: 25,
  failed: false
})

const gen = { ...makeNode(1, 'gen', 0, 0, 0), cap: 500, online: true }
const trafo = { ...makeNode(2, 'trafo', 0, 20, 110), cap: 150 }
const casa = { ...makeNode(3, 'zone', 0, 40, 110), kW: 20, zoneType: 'casa' as const }

describe('diagnóstico de zona', () => {
  it('explica tensão errada com o valor esperado e o recebido', () => {
    const d = diagnoseZone(casa, 220, false, true)
    expect(d.tone).toBe('bad')
    expect(d.title).toBe('Tensão errada')
    expect(d.detail).toContain('220')
    expect(d.detail).toContain('110')
    expect(d.fix).toBeTruthy()
  })

  it('confirma uma zona energizada', () => {
    const d = diagnoseZone(casa, 110, true, false)
    expect(d.tone).toBe('ok')
    expect(d.detail).toContain('110')
  })

  it('distingue zona sem caminho de zona com tensão errada', () => {
    const d = diagnoseZone(casa, 0, false, false)
    expect(d.tone).toBe('warn')
    expect(d.title).toBe('Zona sem energia')
    expect(d.detail).toContain('Nenhuma tensão')
  })
})

describe('diagnóstico de cabo', () => {
  it('identifica cabo queimado', () => {
    const d = diagnoseCable({ ...cable(10, 1, 2), failed: true })
    expect(d.tone).toBe('bad')
    expect(d.title).toBe('Cabo queimado')
  })

  it('avisa quando o cabo está aquecendo', () => {
    const d = diagnoseCable({ ...cable(10, 1, 2), temp: 80 })
    expect(d.tone).toBe('warn')
    expect(d.title).toBe('Cabo aquecendo')
    expect(d.fix).toContain('seção')
  })
})

describe('próxima ação do HUD', () => {
  const base = { powered: new Set<number>(), mismatch: new Set<number>(), nodeV: {}, supplied: 0, demand: 20 }

  it('começa pedindo um gerador', () => {
    expect(nextAction({ ...base, nodes: [], cables: [] }).title).toBe('Coloque um gerador')
  })

  it('depois pede um transformador', () => {
    const d = nextAction({ ...base, nodes: [gen, casa], cables: [cable(10, 1, 3)] })
    expect(d.title).toBe('Coloque um transformador')
  })

  it('avisa que o gerador ainda está partindo', () => {
    const d = nextAction({ ...base, nodes: [{ ...gen, online: false, startLeft: 2 }, trafo, casa], cables: [] })
    expect(d.title).toBe('Aguardando o gerador')
  })

  it('explica a tensão errada', () => {
    const d = nextAction({
      ...base,
      nodes: [gen, trafo, casa],
      cables: [cable(10, 1, 2), cable(11, 2, 3)],
      mismatch: new Set([3]),
      nodeV: { 3: 220 },
      demand: 20
    })
    expect(d.tone).toBe('bad')
    expect(d.title).toBe('Tensão errada')
    expect(d.detail).toContain('220')
  })

  it('pede o cabo que falta', () => {
    const d = nextAction({ ...base, nodes: [gen, trafo, casa], cables: [] })
    expect(d.title).toBe('Ligue o gerador ao trafo')
  })

  it('avisa quando um equipamento está perto do limite', () => {
    const d = nextAction({
      ...base,
      nodes: [gen, { ...trafo, load: 140 }, casa],
      cables: [cable(10, 1, 2), cable(11, 2, 3)],
      powered: new Set([3]),
      nodeV: { 3: 110 },
      supplied: 20,
      demand: 20
    })
    expect(d.tone).toBe('warn')
    expect(d.title).toContain('perto do limite')
  })

  it('reconhece quando tudo está aceso', () => {
    const d = nextAction({
      ...base,
      nodes: [gen, trafo, casa],
      cables: [cable(10, 1, 2), cable(11, 2, 3)],
      powered: new Set([3]),
      nodeV: { 3: 110 },
      supplied: 20,
      demand: 20
    })
    expect(d.tone).toBe('ok')
    expect(d.title).toBe('Tudo aceso')
  })
})
