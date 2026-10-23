import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame } from './gameStore'

const g = () => useGame.getState()

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
    removeItem: (k: string) => {
      data.delete(k)
    },
    clear: () => {
      data.clear()
    }
  }
}

describe('save/load do jogo', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    g().newGame('campanha')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserva progresso, continuidade e manutenção ao carregar', () => {
    g().set({
      stars: 2,
      totalStars: 5,
      challengeDone: true,
      everPowered: true,
      maintenanceOn: true,
      goalT: 11.5,
      budget: 12345,
      level: 4
    })
    expect(g().save(0)).toBe(true)

    g().set({ stars: 0, totalStars: 0, challengeDone: false, everPowered: false, maintenanceOn: false, goalT: 0, budget: 0, level: 1 })
    g().load(0)

    expect(g().stars).toBe(2)
    expect(g().totalStars).toBe(5)
    expect(g().challengeDone).toBe(true)
    expect(g().everPowered).toBe(true)
    expect(g().maintenanceOn).toBe(true)
    expect(g().goalT).toBe(11.5)
    expect(g().budget).toBe(12345)
    expect(g().level).toBe(4)
  })
})
