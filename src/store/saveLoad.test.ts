import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame } from './gameStore'
import { loadSlot } from '../data/save'

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

  it('protege a campanha do autosave de um cenário do Codex', async () => {
    g().set({ tool: 'gen' }); g().place(20, 10)
    g().loadScenario('parallel')
    expect(g().isScenario).toBe(true)
    expect(loadSlot(g().slot)?.mode).toBe('campanha')
    expect(loadSlot(g().slot)?.nodes).toHaveLength(4)
    for (let i = 0; i < 12; i++) await g().stepSim(0.5)
    expect(loadSlot(g().slot)?.mode).toBe('campanha')
    g().load()
    expect(g().isScenario).toBe(false)
    expect(g().nodes).toHaveLength(4)
  })
})
