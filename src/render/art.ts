// Direção de arte: paleta e presets de qualidade (ver docs/ART.md).
import * as THREE from 'three'

export type Quality = 'baixa' | 'media' | 'alta'

export interface QualityPreset {
  bloom: boolean
  ssao: boolean
  vignette: boolean
  shadows: boolean
  shadowMap: number
  pixelRatio: number
  stars: boolean
}

export const QUALITY: Record<Quality, QualityPreset> = {
  baixa: { bloom: false, ssao: false, vignette: false, shadows: false, shadowMap: 512, pixelRatio: 1, stars: false },
  media: { bloom: true, ssao: false, vignette: true, shadows: true, shadowMap: 1024, pixelRatio: 1.25, stars: true },
  alta: { bloom: true, ssao: true, vignette: true, shadows: true, shadowMap: 2048, pixelRatio: 1.5, stars: true },
}

export const PALETTE = {
  skyDay: '#8fc7f0',
  skyNight: '#050912',
  fogDay: '#a9d3f0',
  fogNight: '#0a1220',
  ground: '#4a6b4a',
  road: '#20262e',
  roadLine: '#c9b458',
  building: '#8a97a6',
  buildingRoof: '#39424e',
  zone110: '#6b7a8f',
  zone220: '#7d6b8f',
  hazardPurple: '#b06bff',
  dead: '#7f1d1d',
  metal: '#cbd5e1',
  metalDark: '#64748b',
  insulator: '#e2e8f0',
  trunk: '#5b3a1e',
  crown: '#2f8f4e',
  crownDark: '#1f6b39',
  lamp: '#fde68a',
} as const

// Saúde da rede: verde (ok) → amarelo (limite) → vermelho (falha).
export const HEALTH = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444' } as const

export const color = (hex: string) => new THREE.Color(hex)
