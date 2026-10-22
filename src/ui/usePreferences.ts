import { useEffect, useState } from 'react'
import { setMuted } from '../audio/audio'
import { loadPrefs, savePrefs } from '../data/prefs'
import { useGame } from '../store/gameStore'

/** Carrega as preferências uma vez e mantém o localStorage sincronizado. */
export function usePreferences(): void {
  const quality = useGame((s) => s.quality)
  const volumes = useGame((s) => s.volumes)
  const sensitivity = useGame((s) => s.sensitivity)
  const muted = useGame((s) => s.muted)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const p = loadPrefs()
    if (p) {
      const s = useGame.getState()
      s.setQuality(p.quality)
      s.setSensitivity(p.sensitivity)
      s.set({ muted: p.muted })
      for (const bus of ['master', 'music', 'sfx', 'ambient'] as const) s.setVolume(bus, p.volumes[bus])
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    savePrefs({ quality, volumes, sensitivity, muted })
  }, [ready, quality, volumes, sensitivity, muted])

  // O módulo de áudio tem estado próprio; mantém o mute sincronizado com o save.
  useEffect(() => {
    setMuted(muted)
  }, [muted])
}
