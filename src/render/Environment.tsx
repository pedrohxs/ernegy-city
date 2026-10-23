import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { SUNRISE, SUNSET } from '../data/balance'
import { dayFactor, hourOf, nightFactor } from '../game/clock'
import { PALETTE, QUALITY } from './art'
import Tiles from './Tiles'

const C_DAY = new THREE.Color(PALETTE.skyDay), C_NIGHT = new THREE.Color(PALETTE.skyNight)
const F_DAY = new THREE.Color(PALETTE.fogDay), F_NIGHT = new THREE.Color(PALETTE.fogNight)
const ROADS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
const COORDS = ROADS.map(i => i * 40)
// malha de estradas estilo Kenney: cruzamentos + retas de 10 em 10
const INTERSECTIONS: [number, number][] = []
for (const a of COORDS) for (const b of COORDS) INTERSECTIONS.push([a, b])
const STRAIGHTS_X: [number, number][] = [], STRAIGHTS_Z: [number, number][] = []
for (const b of COORDS) for (let m = 0; m < COORDS.length - 1; m++) for (let k = 1; k <= 3; k++) { STRAIGHTS_X.push([COORDS[m] + k * 10, b]); STRAIGHTS_Z.push([b, COORDS[m] + k * 10]) }
const ROAD_KIT = '/models/estradas-roads'
const LAMPS: [number, number][] = []
for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) LAMPS.push([i * 40 + 7, j * 40 + 7])
const TREES: [number, number][] = (() => {
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const near = (v: number) => Math.abs(v - Math.round(v / 40) * 40) < 9
  const a: [number, number][] = []
  while (a.length < 70) { const x = (r() - 0.5) * 380, z = (r() - 0.5) * 380; if (!near(x) && !near(z) && Math.hypot(x, z) > 70) a.push([x, z]) }
  return a
})()

function place(ref: React.RefObject<THREE.InstancedMesh>, pts: [number, number][], y: number) {
  const d = new THREE.Object3D()
  pts.forEach(([x, z], i) => { d.position.set(x, y, z); d.updateMatrix(); ref.current!.setMatrixAt(i, d.matrix) })
  ref.current!.instanceMatrix.needsUpdate = true
}
function Lamps({ on }: { on: boolean }) {
  const poles = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => { place(poles, LAMPS, 4); place(heads, LAMPS, 8.3) }, [])
  useFrame(() => { // esmaece a iluminação pública conforme anoitece (sem re-render)
    const mat = heads.current?.material as THREE.MeshStandardMaterial | undefined
    if (!mat) return
    const nf = nightFactor(hourOf(useGame.getState().time))
    mat.emissiveIntensity = on ? 2.5 * Math.max(0, (nf - 0.35) / 0.65) : 0
  })
  return <>
    <instancedMesh ref={poles} args={[undefined, undefined, LAMPS.length]} castShadow><cylinderGeometry args={[0.25, 0.3, 8]} /><meshStandardMaterial color={PALETTE.metalDark} /></instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, LAMPS.length]}><sphereGeometry args={[0.9]} /><meshStandardMaterial color={PALETTE.lamp} emissive={PALETTE.lamp} /></instancedMesh>
  </>
}
function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null), crowns = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => { place(trunks, TREES, 1.5); place(crowns, TREES, 5.5) }, [])
  return <>
    <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]} castShadow><cylinderGeometry args={[0.4, 0.5, 3]} /><meshStandardMaterial color={PALETTE.trunk} /></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, TREES.length]} castShadow><coneGeometry args={[2.6, 6, 8]} /><meshStandardMaterial color={PALETTE.crown} flatShading /></instancedMesh>
  </>
}

export default function Environment() {
  const night = useGame(s => s.night), supplied = useGame(s => s.supplied), demand = useGame(s => s.demand)
  const quality = useGame(s => s.quality)
  const preset = QUALITY[quality]
  const bg = useRef<THREE.Color>(null), fog = useRef<THREE.Fog>(null), sun = useRef<THREE.DirectionalLight>(null), amb = useRef<THREE.AmbientLight>(null)
  const sky = useRef<{ material?: THREE.ShaderMaterial } | null>(null)
  const was = useRef(false)
  useFrame(() => {
    const hour = hourOf(useGame.getState().time)
    const angle = ((hour - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI // 0 no nascer, π no pôr
    const el = Math.sin(angle)
    const day = dayFactor(hour)
    bg.current?.copy(C_NIGHT).lerp(C_DAY, day); fog.current?.color.copy(F_NIGHT).lerp(F_DAY, day)
    const pos = new THREE.Vector3(Math.cos(angle) * 100, 20 + el * 80, 40)
    if (sun.current) { sun.current.intensity = 0.15 + day * 1.15; sun.current.position.copy(pos) }
    if (sky.current?.material?.uniforms?.sunPosition) sky.current.material.uniforms.sunPosition.value.copy(pos)
    if (amb.current) amb.current.intensity = 0.15 + 0.45 * day
    // histerese: evita piscar o flag de noite (usado pelo gerador solar)
    const nightNow = was.current ? el < 0.08 : el < -0.08
    if (nightNow !== was.current) { was.current = nightNow; useGame.getState().set({ night: nightNow }) }
  })
  const lampsOn = night && supplied > 0 && !(demand > 0 && supplied < demand * 0.5)
  return <>
    <color ref={bg} attach="background" args={[PALETTE.skyDay]} />
    <fog ref={fog} attach="fog" args={[PALETTE.fogDay, 180, 520]} />
    <Sky ref={sky as never} distance={4500} sunPosition={[100, 80, 40]} />
    {night && preset.stars && <Stars radius={300} depth={50} count={1500} factor={6} fade />}
    <ambientLight ref={amb} />
    <hemisphereLight args={[PALETTE.skyDay, PALETTE.ground, 0.35]} />
    <directionalLight
      ref={sun}
      castShadow={preset.shadows}
      shadow-mapSize-width={preset.shadowMap}
      shadow-mapSize-height={preset.shadowMap}
      shadow-radius={3}
      shadow-bias={-0.0004}
      shadow-camera-left={-120}
      shadow-camera-right={120}
      shadow-camera-top={120}
      shadow-camera-bottom={-120}
      shadow-camera-far={400}
    />
    <Tiles url={`${ROAD_KIT}/road-crossroad.glb`} positions={INTERSECTIONS} size={10} y={0.04} />
    <Tiles url={`${ROAD_KIT}/road-straight.glb`} positions={STRAIGHTS_X} size={10} y={0.04} />
    <Tiles url={`${ROAD_KIT}/road-straight.glb`} positions={STRAIGHTS_Z} size={10} y={0.04} rotY={Math.PI / 2} />
    <Trees /><Lamps on={lampsOn} />
  </>
}
