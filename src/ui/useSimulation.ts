import { useEffect } from 'react'
import { SimulationLoop } from '../game/simulation'
import { simulationSpeed, useGame } from '../store/gameStore'
import { beep, playClick, setVolumes, startAudio, updateAudio } from '../audio/audio'
import { advanceVisualTime } from '../game/visualClock'
import { logError } from '../data/telemetry'

const AUDIO_EVERY = 0.2 // s

/** Liga o laço de passo fixo (10 Hz) e o áudio. Não usa setInterval. */
export function useSimulation(): void {
  useEffect(() => {
    let audioAcc = 0
    const loop = new SimulationLoop({
      step: dt => useGame.getState().stepSim(dt),
      getScale: () => simulationSpeed(useGame.getState()),
      onFrame: (realDt, scale) => {
        advanceVisualTime(realDt * scale)
        audioAcc += realDt
        if (audioAcc < AUDIO_EVERY) return
        audioAcc = 0
        const s = useGame.getState()
        setVolumes(s.volumes)
        updateAudio({
          hum: s.nodes.filter(n => n.kind === 'trafo').reduce((t, n) => t + n.load, 0),
          siren: s.everPowered && s.demand > 0 && s.supplied < s.demand * 0.5,
          hot: s.cables.some(c => !c.failed && c.temp > 75),
        })
      },
      onError: e => { logError('simulation', e); console.error('[simulation]', e) },
    })
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (state.report && state.report !== previous.report) beep()
    })
    const first = () => startAudio()
    window.addEventListener('pointerdown', first, { once: true })
    const onClick = (e: MouseEvent) => { if ((e.target as HTMLElement)?.closest?.('button')) playClick() }
    window.addEventListener('click', onClick)
    loop.start()
    return () => {
      loop.stop()
      unsubscribe()
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('click', onClick)
    }
  }, [])
}
