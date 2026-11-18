export interface AvatarMotion {
  phase: number
  weight: number
  run: number
}

export const UPPER_LEG = 0.43
export const LOWER_LEG = 0.42
export const ANKLE_HEIGHT = 0.12
const WALK_HIP_HEIGHT = 0.87
const IDLE_HIP_HEIGHT = ANKLE_HEIGHT + UPPER_LEG + LOWER_LEG - 0.005

export const strideLength = (run: number) => 1.18 + 0.47 * run

export function hipHeight({ phase, weight, run }: AvatarMotion) {
  return IDLE_HIP_HEIGHT + weight * (WALK_HIP_HEIGHT - IDLE_HIP_HEIGHT - 0.045 * run - (0.017 + 0.011 * run) * Math.cos(phase * 4 * Math.PI))
}

export function footTarget({ phase, weight, run }: AvatarMotion, offset: number) {
  const cycle = (phase + offset) % 1
  const stance = 0.64 - 0.1 * run
  const range = strideLength(run) * stance * weight
  if (cycle < stance) {
    // Enquanto o pé apoia, o recuo local acompanha a distância percorrida pelo corpo.
    return { z: range * (cycle / stance - 0.5), y: ANKLE_HEIGHT, pitch: 0 }
  }
  const swing = (cycle - stance) / (1 - stance)
  const blend = swing * swing * (3 - 2 * swing)
  const arc = Math.sin(swing * Math.PI)
  return {
    z: range * (0.5 - blend),
    y: ANKLE_HEIGHT + arc * arc * (0.12 + 0.14 * run) * weight,
    pitch: Math.sin(swing * 2 * Math.PI) * arc * 0.24 * weight,
  }
}

export function solveLeg(hipY: number, footY: number, footZ: number) {
  const down = hipY - footY
  const distance = Math.min(UPPER_LEG + LOWER_LEG - 1e-5, Math.max(0.05, Math.hypot(down, footZ)))
  const square = distance * distance
  const upperAngle = Math.acos((UPPER_LEG ** 2 + square - LOWER_LEG ** 2) / (2 * UPPER_LEG * distance))
  const kneeAngle = Math.acos((UPPER_LEG ** 2 + LOWER_LEG ** 2 - square) / (2 * UPPER_LEG * LOWER_LEG))
  return { hip: Math.atan2(-footZ, down) + upperAngle, knee: kneeAngle - Math.PI }
}
