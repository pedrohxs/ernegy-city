// Preferências da interface, separadas dos slots de save.
// Assim, trocar de slot não muda volume, qualidade gráfica ou sensibilidade.
export type PrefQuality = 'baixa' | 'media' | 'alta'

export interface Prefs {
  quality: PrefQuality
  volumes: { master: number; music: number; sfx: number; ambient: number }
  sensitivity: number
  muted: boolean
}

export const PREFS_KEY = 'energy-city-prefs'
export const DEFAULT_VOLUMES = { master: 0.8, music: 0.2, sfx: 0.8, ambient: 0.6 }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Lê e valida preferências; retorna null se o texto não for utilizável. */
export function parsePrefs(text: string | null): Prefs | null {
  if (!text) return null
  try {
    const raw: unknown = JSON.parse(text)
    if (!isObj(raw)) return null
    const q = raw.quality
    if (q !== 'baixa' && q !== 'media' && q !== 'alta') return null
    const v = isObj(raw.volumes) ? raw.volumes : {}
    return {
      quality: q,
      volumes: {
        master: clamp(num(v.master, DEFAULT_VOLUMES.master), 0, 1),
        music: clamp(num(v.music, DEFAULT_VOLUMES.music), 0, 1),
        sfx: clamp(num(v.sfx, DEFAULT_VOLUMES.sfx), 0, 1),
        ambient: clamp(num(v.ambient, DEFAULT_VOLUMES.ambient), 0, 1)
      },
      sensitivity: clamp(num(raw.sensitivity, 1), 0.2, 3),
      muted: raw.muted === true
    }
  } catch {
    return null
  }
}

export function loadPrefs(): Prefs | null {
  try {
    return parsePrefs(localStorage.getItem(PREFS_KEY))
  } catch {
    return null
  }
}

export function savePrefs(p: Prefs): boolean {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
    return true
  } catch {
    return false
  }
}
