import { describe, expect, it } from 'vitest'
import { BUILD_SPACING, GEN_ORDER, ZONE_ORDER, ZONES } from '../data/balance'
import { makeNode } from '../electrical/engine'
import { connectionHeight, districtBounds } from './districtParts'
import { ANKLE_HEIGHT, footTarget, hipHeight, LOWER_LEG, solveLeg, strideLength, UPPER_LEG } from './gait'

describe('passada do personagem', () => {
  it('mantém o pé apoiado no lugar quando o corpo avança', () => {
    const start = footTarget({ phase: 0.15, weight: 1, run: 0 }, 0)
    const end = footTarget({ phase: 0.25, weight: 1, run: 0 }, 0)
    expect(end.z - start.z).toBeCloseTo(0.1 * strideLength(0))
    expect(start.y).toBe(ANKLE_HEIGHT)
    expect(end.y).toBe(ANKLE_HEIGHT)
  })

  it('alcança o alvo de cada pé ao caminhar e correr', () => {
    for (const run of [0, 0.5, 1]) {
      for (let i = 0; i < 20; i++) {
        const gait = { phase: i / 20, weight: 1, run }
        const y = hipHeight(gait)
        const foot = footTarget(gait, 0)
        const { hip, knee } = solveLeg(y, foot.y, foot.z)
        const ankleY = y - UPPER_LEG * Math.cos(hip) - LOWER_LEG * Math.cos(hip + knee)
        const ankleZ = -UPPER_LEG * Math.sin(hip) - LOWER_LEG * Math.sin(hip + knee)
        expect(ankleY).toBeCloseTo(foot.y, 3)
        expect(ankleZ).toBeCloseTo(foot.z, 3)
      }
    }
  })

  it('volta à postura ereta com os dois pés apoiados', () => {
    const gait = { phase: 0.82, weight: 0, run: 0.7 }
    const y = hipHeight(gait)
    for (const offset of [0, 0.5]) {
      const foot = footTarget(gait, offset)
      expect(foot.y).toBe(ANKLE_HEIGHT)
      expect(foot.z).toBeCloseTo(0)
      expect(Math.abs(solveLeg(y, foot.y, foot.z).knee)).toBeLessThan(0.25)
    }
  })
})

it('mantém as peças ampliadas dentro do espaçamento e o cabo na altura da peça', () => {
  const nodes = [
    ...GEN_ORDER.map(genType => ({ ...makeNode(1, 'gen', 0, 0, 0), genType })),
    ...ZONE_ORDER.map(zoneType => ({ ...makeNode(1, 'zone', 0, 0, ZONES[zoneType].volt), zoneType })),
    makeNode(1, 'trafo', 0, 0, 110),
    makeNode(1, 'sub', 0, 0, 0),
  ]
  for (const node of nodes) {
    const { min, max } = districtBounds(node)
    expect(max.x - min.x).toBeLessThan(BUILD_SPACING)
    expect(max.z - min.z).toBeLessThan(BUILD_SPACING)
    expect(connectionHeight(node)).toBeLessThanOrEqual(max.y + 1e-4)
  }
})
