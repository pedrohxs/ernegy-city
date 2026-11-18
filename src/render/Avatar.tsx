import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { footTarget, hipHeight, LOWER_LEG, solveLeg, UPPER_LEG, type AvatarMotion } from './gait'

const roundedBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.17)
const sphere = new THREE.SphereGeometry(1, 14, 8)
const dome = new THREE.SphereGeometry(1, 16, 8, 0, 2 * Math.PI, 0, Math.PI / 2)
const swatches = {
  navy: '#274650', seam: '#182e36', vest: '#c3d77a', reflective: '#e6efdc', boot: '#26343a',
  sole: '#162025', skin: '#bc8062', amber: '#eab94e', gold: '#9d702c', pouch: '#745944',
}
type Fabric = keyof typeof swatches
const materials = Object.fromEntries(Object.entries(swatches).map(([name, color]) => [
  name, new THREE.MeshStandardMaterial({ color, roughness: name === 'amber' ? 0.48 : 0.84 }),
])) as Record<Fabric, THREE.MeshStandardMaterial>

type Triple = [number, number, number]
function Part({ at, size, color, geometry = roundedBox, shadow = true }: {
  at: Triple; size: Triple; color: Fabric; geometry?: THREE.BufferGeometry; shadow?: boolean
}) {
  return <mesh position={at} scale={size} geometry={geometry} material={materials[color]} castShadow={shadow} />
}

const sides = [-1, 1] as const

export default function Avatar({ motion }: { motion: MutableRefObject<AvatarMotion> }) {
  const body = useRef<THREE.Group>(null)
  const hips = useRef<(THREE.Group | null)[]>([])
  const knees = useRef<(THREE.Group | null)[]>([])
  const ankles = useRef<(THREE.Group | null)[]>([])
  const shoulders = useRef<(THREE.Group | null)[]>([])
  const elbows = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    const movement = motion.current
    const pelvis = hipHeight(movement)
    if (body.current) {
      body.current.position.y = pelvis
      body.current.rotation.set(-movement.weight * (0.055 + movement.run * 0.12), Math.sin(movement.phase * 2 * Math.PI) * movement.weight * 0.12, 0)
    }
    for (const [i, side] of sides.entries()) {
      const foot = footTarget(movement, i * 0.5)
      const angles = solveLeg(pelvis, foot.y, foot.z)
      const hip = hips.current[i], knee = knees.current[i], ankle = ankles.current[i]
      const shoulder = shoulders.current[i], elbow = elbows.current[i]
      if (!hip || !knee || !ankle || !shoulder || !elbow) continue
      hip.position.y = pelvis
      hip.rotation.x = angles.hip
      knee.rotation.x = angles.knee
      ankle.rotation.x = foot.pitch - angles.hip - angles.knee
      shoulder.rotation.x = foot.z * (1.2 + 0.35 * movement.run)
      shoulder.rotation.z = side * (0.12 + 0.07 * movement.weight)
      elbow.rotation.x = 0.13 + 0.12 * movement.weight + movement.run * 0.32 + Math.max(0, foot.z) * 0.45
    }
  })

  return <group name="electrician" dispose={null}>
    <group ref={body} position={[0, hipHeight(motion.current), 0]}>
      <Part at={[0, 0.045, 0]} size={[0.44, 0.2, 0.31]} color="navy" />
      <Part at={[0, 0.345, 0]} size={[0.51, 0.49, 0.31]} color="navy" />
      <Part at={[0, 0.348, -0.006]} size={[0.455, 0.41, 0.344]} color="vest" />
      <Part at={[0, 0.174, -0.006]} size={[0.46, 0.052, 0.35]} color="reflective" shadow={false} />
      <Part at={[0, 0.37, -0.179]} size={[0.025, 0.34, 0.016]} color="navy" shadow={false} />
      <Part at={[-0.135, 0.408, -0.184]} size={[0.11, 0.09, 0.024]} color="navy" shadow={false} />
      <Part at={[0, 0.105, 0]} size={[0.45, 0.06, 0.329]} color="seam" />
      <Part at={[-0.23, 0.098, 0.015]} size={[0.115, 0.155, 0.195]} color="pouch" />
      <Part at={[0.21, 0.16, 0.14]} size={[0.1, 0.16, 0.07]} color="boot" />
      <Part at={[0, 0.587, -0.015]} size={[0.15, 0.16, 0.14]} color="skin" />
      <Part at={[0, 0.762, -0.013]} size={[0.167, 0.192, 0.151]} color="skin" geometry={sphere} />
      <Part at={[0, 0.764, -0.163]} size={[0.032, 0.044, 0.04]} color="skin" geometry={sphere} shadow={false} />
      <Part at={[0, 0.875, -0.034]} size={[0.41, 0.05, 0.4]} color="amber" />
      <Part at={[0, 0.895, 0]} size={[0.194, 0.182, 0.184]} color="amber" geometry={dome} />
      <Part at={[0, 0.889, 0.155]} size={[0.17, 0.036, 0.034]} color="gold" shadow={false} />
      {sides.map((side, i) => <group key={side}>
        <Part at={[side * 0.161, 0.75, -0.012]} size={[0.032, 0.06, 0.04]} color="skin" geometry={sphere} shadow={false} />
        <Part at={[side * 0.062, 0.788, -0.152]} size={[0.024, 0.029, 0.018]} color="sole" shadow={false} />
        <group ref={el => { shoulders.current[i] = el }} position={[side * 0.285, 0.506, 0]}>
          <Part at={[0, -0.125, 0]} size={[0.158, 0.3, 0.166]} color="navy" />
          <group ref={el => { elbows.current[i] = el }} position={[0, -0.257, 0]}>
            <Part at={[0, -0.102, 0]} size={[0.133, 0.244, 0.14]} color="navy" />
            <Part at={[0, -0.179, 0]} size={[0.141, 0.046, 0.147]} color="reflective" shadow={false} />
            <Part at={[0, -0.244, -0.018]} size={[0.133, 0.144, 0.126]} color="boot" />
          </group>
        </group>
      </group>)}
    </group>
    {sides.map((side, i) => <group key={side} ref={el => { hips.current[i] = el }} position={[side * 0.118, hipHeight(motion.current), 0]}>
      <Part at={[0, -0.194, 0]} size={[0.211, 0.45, 0.243]} color="navy" />
      <group ref={el => { knees.current[i] = el }} position={[0, -UPPER_LEG, 0]}>
        <Part at={[0, -0.178, 0]} size={[0.17, 0.403, 0.184]} color="navy" />
        <Part at={[0, -0.061, -0.081]} size={[0.157, 0.165, 0.081]} color="seam" shadow={false} />
        <Part at={[0, -0.282, 0]} size={[0.177, 0.047, 0.191]} color="reflective" shadow={false} />
        <group name={i === 0 ? 'left-boot' : 'right-boot'} ref={el => { ankles.current[i] = el }} position={[0, -LOWER_LEG, 0]}>
          <Part at={[0, -0.037, -0.066]} size={[0.196, 0.145, 0.298]} color="boot" />
          <Part at={[0, -0.103, -0.068]} size={[0.202, 0.034, 0.306]} color="sole" />
          <Part at={[0, 0.035, 0.003]} size={[0.175, 0.141, 0.193]} color="boot" />
        </group>
      </group>
    </group>)}
  </group>
}
