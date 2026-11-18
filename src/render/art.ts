export type Quality = 'baixa' | 'media' | 'alta'

export interface QualityPreset {
  bloom: boolean
  ssao: boolean
  shadows: boolean
  shadowMap: number
  pixelRatio: number
}

export const QUALITY: Record<Quality, QualityPreset> = {
  baixa: { bloom: false, ssao: false, shadows: false, shadowMap: 512, pixelRatio: 1 },
  media: { bloom: false, ssao: false, shadows: true, shadowMap: 1024, pixelRatio: 1.2 },
  alta: { bloom: true, ssao: true, shadows: true, shadowMap: 2048, pixelRatio: 1.5 },
}

export const PALETTE = {
  skyDay: '#c1d7cc',
  skyNight: '#1a273d',
  ground: '#8da28c',
  road: '#586569',
  curb: '#9da299',
  crops: ['#91a48c', '#9bac94', '#899f84'],
  trunk: '#6b6350',
  foliage: ['#708c71', '#55765e', '#82946f'],
  lamp: '#ffd99d',
  mismatch: '#b98afa',
  wire: '#526067',
  live: '#176453',
  failedWire: '#892f31',
  marker: '#e1f599',
  origin: '#9dd1f2',
} as const

export const HEALTH = { ok: '#5ed8a8', warn: '#ffc46f', bad: '#f16f68' } as const
export const DISTRICT_MODEL_SCALE = [1.04, 1.14, 1.04] as const
