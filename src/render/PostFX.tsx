import type { ReactElement } from 'react'
import { EffectComposer, Bloom, SSAO, ToneMapping } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useGame } from '../store/gameStore'
import { QUALITY } from './art'

// Pós-processamento com chave de qualidade (ver docs/ART.md).
export default function PostFX() {
  const quality = useGame(s => s.quality)
  const night = useGame(s => s.night)
  const preset = QUALITY[quality]
  if (!preset.bloom && !preset.ssao) return null
  const effects: ReactElement[] = []
  if (preset.ssao) effects.push(
    <SSAO key="ssao" blendFunction={BlendFunction.MULTIPLY} luminanceInfluence={0.6} radius={0.08} intensity={5}
      worldDistanceThreshold={0} worldDistanceFalloff={0} worldProximityThreshold={0} worldProximityFalloff={0} />,
  )
  if (preset.bloom) effects.push(
    <Bloom key="bloom" intensity={night ? 0.6 : 0.24} luminanceThreshold={1} luminanceSmoothing={0.3} mipmapBlur />,
  )
  effects.push(<ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />)
  return <EffectComposer multisampling={preset.ssao ? 4 : 0} enableNormalPass={preset.ssao}>{effects}</EffectComposer>
}
