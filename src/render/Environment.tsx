import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { dayFactor, hourOf } from '../game/clock'
import { PALETTE, QUALITY } from './art'
import { lightWindows } from './districtParts'

const dayColor = new THREE.Color(PALETTE.skyDay), nightColor = new THREE.Color(PALETTE.skyNight)
const roads = Array.from({ length: 11 }, (_, i) => 40 * (i - 5))
const roadStrips = roads.flatMap(i => [
  { x: i, y: 0.025, z: 0, w: 6.5, h: 0.05, d: 400 },
  { x: 0, y: 0.035, z: i, w: 400, h: 0.05, d: 6.5 },
])
const blocks = roads.slice(0, -1).flatMap((x, i) => roads.slice(0, -1).map((z, j) => ({
  x: x + 20, y: 0.04, z: z + 20, w: 32.8, h: 0.08, d: 32.8, tint: PALETTE.crops[(i * 3 + j * 2 + i * j) % PALETTE.crops.length],
})))
const curbs = roads.flatMap(i => [-3.57, 3.57].flatMap(d => [
  { x: i + d, y: 0.02, z: 0, w: 0.75, h: 0.045, d: 400 },
  { x: 0, y: 0.032, z: i + d, w: 400, h: 0.045, d: 0.75 },
]))
const lampSites = [[-3.7, 4.9], [43.7, 4.9], [77, 4.9], [-4.9, 43.7], [77, 36.3], [-37, -4.9], [-37, 36.3], [43.7, -37], [117, 36.3]]
const treeSites = (() => {
  const locations: [number, number][] = [[-17, 14], [67, 14], [71, 18], [65, 34], [18, -22], [23, -24], [5, 34], [51, 46], [-14, 59], [-17, 55]]
  let seed = 31
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  while (locations.length < 45) {
    const x = (random() - 0.5) * 360, z = (random() - 0.5) * 360
    if (Math.hypot(x - 30, z - 20) > 65 && Math.min(Math.abs(x % 40), Math.abs(z % 40)) > 5) locations.push([x, z])
  }
  return locations
})()
const trunk = new THREE.CylinderGeometry(0.2, 0.32, 1, 6)
const canopy = new THREE.IcosahedronGeometry(0.5, 1)
const box = new THREE.BoxGeometry()
const poles = lampSites.map(([x, z]) => ({ x, y: 2.6, z, w: 0.24, h: 5.2, d: 0.24 }))
const lampHeads = lampSites.map(([x, z]) => ({ x: x + 0.42, y: 5.18, z, w: 1.15, h: 0.19, d: 0.38 }))
const stems = treeSites.map(([x, z]) => ({ x, y: 1.3, z, w: 1, h: 2.6, d: 1 }))
const crowns = treeSites.map(([x, z], i) => ({
  x, y: 3.6 + (i % 4) * 0.28, z, w: 4.7 + i % 3 * 0.6, h: 4.9 + i % 4 * 0.58, d: 4.7 + i % 3 * 0.6,
  tint: PALETTE.foliage[i % PALETTE.foliage.length],
}))

type Placement = { x: number; y: number; z: number; w: number; h: number; d: number; tint?: string }
function Instances({ placements, geometry = box, color, shadow = false, material }: {
  placements: Placement[]; geometry?: THREE.BufferGeometry; color: string; shadow?: boolean; material?: THREE.MeshStandardMaterial
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const transform = new THREE.Object3D()
    for (const [i, p] of placements.entries()) {
      transform.position.set(p.x, p.y, p.z)
      transform.scale.set(p.w, p.h, p.d)
      transform.updateMatrix()
      mesh.setMatrixAt(i, transform.matrix)
      if (p.tint) mesh.setColorAt(i, new THREE.Color(p.tint))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements])
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} receiveShadow castShadow={shadow}>
    {!material && <meshStandardMaterial color={color} roughness={0.94} flatShading />}
  </instancedMesh>
}

export default memo(function Environment({ preview }: { preview: boolean }) {
  const quality = useGame(s => s.quality)
  const preset = QUALITY[quality]
  const bg = useRef<THREE.Color>(null)
  const fog = useRef<THREE.Fog>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a7c55', emissive: PALETTE.lamp, emissiveIntensity: 0 }), [])
  useFrame(() => {
    const state = useGame.getState()
    const day = preview ? 0.9 : dayFactor(hourOf(state.time))
    bg.current?.copy(nightColor).lerp(dayColor, day)
    if (bg.current) fog.current?.color.copy(bg.current)
    if (sun.current) sun.current.intensity = 0.25 + day * 2.05
    if (fill.current) fill.current.intensity = 0.88 + day * 0.78
    lightWindows(day)
    lamp.emissiveIntensity = preview || state.supplied > 0 ? Math.max(0, 1 - day * 2) : 0
  })
  return <>
    <color ref={bg} attach="background" args={[PALETTE.skyDay]} />
    <fog ref={fog} attach="fog" args={[PALETTE.skyDay, 112, 295]} />
    <hemisphereLight ref={fill} args={['#e6f3fc', '#757461', 1.5]} />
    <directionalLight ref={sun} position={[-35, 95, 48]} color="#fff0d9" intensity={2}
      castShadow={preset.shadows} shadow-mapSize-width={preset.shadowMap} shadow-mapSize-height={preset.shadowMap}
      shadow-camera-left={-82} shadow-camera-right={82} shadow-camera-top={82} shadow-camera-bottom={-82}
      shadow-camera-near={20} shadow-camera-far={250} shadow-bias={-0.0002} shadow-normalBias={0.035} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]} receiveShadow>
      <planeGeometry args={[1100, 1100]} /><meshStandardMaterial color={PALETTE.ground} roughness={1} />
    </mesh>
    <Instances placements={roadStrips} color={PALETTE.road} />
    <Instances placements={curbs} color={PALETTE.curb} />
    <Instances placements={blocks} color="#ffffff" />
    <Instances placements={stems} geometry={trunk} color={PALETTE.trunk} />
    <Instances placements={crowns} geometry={canopy} color="#ffffff" shadow />
    <Instances placements={poles} color={PALETTE.road} />
    <Instances placements={lampHeads} color={PALETTE.lamp} material={lamp} />
  </>
})
