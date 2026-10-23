import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { GNode } from '../electrical/engine'
import GltfOr from './GltfOr'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const damp = (a: number, b: number, lambda: number, dt: number) => THREE.MathUtils.damp(a, b, lambda, dt)

// Colisão de câmera: encurta o vetor foco→câmera se ele cruzar uma construção.
function clampCamera(from: THREE.Vector3, to: THREE.Vector3, nodes: GNode[]): THREE.Vector3 {
  const dir = to.clone().sub(from); const dist = dir.length()
  if (dist < 0.01) return to
  dir.divideScalar(dist)
  let maxT = dist
  for (const n of nodes) {
    const r = n.kind === 'gen' ? 8 : 7
    const c = new THREE.Vector3(n.x, n.kind === 'zone' ? (n.volt === 110 ? 4 : 8) : 3, n.z)
    const t = clamp(c.clone().sub(from).dot(dir), 0, dist)
    const p = from.clone().addScaledVector(dir, t)
    if (p.distanceTo(c) < r) maxT = Math.min(maxT, Math.max(2.5, t - 1.5))
  }
  return from.clone().addScaledVector(dir, maxT)
}

export default function Player() {
  const view = useGame(s => s.view)
  const photo = useGame(s => s.photo)
  const overlay = useGame(s => s.overlay)
  const paused = useGame(s => s.paused)
  const report = useGame(s => s.report)
  const { camera } = useThree()
  const grp = useRef<THREE.Group>(null), legs = useRef<(THREE.Group | null)[]>([])
  const st = useRef({ x: 0, z: 40, yaw: 0, pitch: 0.3, walk: 0, vx: 0, vz: 0, init: false })
  const vel = useRef(new THREE.Vector3())
  const camPos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const keys = useRef<Record<string, boolean>>({})
  useEffect(() => {
    const ok = (e: Event) => !(e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement)
    const kd = (e: KeyboardEvent) => { if (ok(e)) keys.current[e.code] = true }
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const mm = (e: PointerEvent) => {
      const g = useGame.getState()
      if ((e.buttons & 1) && g.screen === 'game' && g.view !== 'orbit' && !g.photo) {
        const sens = 0.005 * g.sensitivity
        st.current.yaw -= e.movementX * sens; st.current.pitch = clamp(st.current.pitch + e.movementY * sens * 0.8, -0.6, 1.1)
      }
    }
    // Se a janela perde o foco, o keyup pode nunca chegar: zera tudo.
    const stop = () => { keys.current = {}; vel.current.set(0, 0, 0) }
    const onVisibility = () => { if (document.visibilityState === 'hidden') stop() }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('pointermove', mm)
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('pointermove', mm)
      window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  useEffect(() => { st.current.init = false }, [view, photo])
  // Trocar de câmera, abrir menu/pausa ou receber um relatório cancela o movimento.
  useEffect(() => { keys.current = {}; vel.current.set(0, 0, 0) }, [view, photo, overlay, paused, report])
  useFrame((_, dt) => {
    const s3 = useGame.getState()
    const v = s3.view
    if (s3.screen !== 'game' || v === 'orbit' || s3.photo || s3.overlay !== null || s3.paused || s3.report !== null) {
      vel.current.set(0, 0, 0)
      return
    }
    const s = st.current, k = keys.current
    if (k.ArrowLeft || k.KeyQ) s.yaw += 1.8 * dt
    if (k.ArrowRight || k.KeyE) s.yaw -= 1.8 * dt
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw)
    let mx = 0, mz = 0
    if (k.KeyW || k.ArrowUp) { mx += fx; mz += fz }
    if (k.KeyS || k.ArrowDown) { mx -= fx; mz -= fz }
    if (k.KeyD) { mx -= fz; mz += fx }
    if (k.KeyA) { mx += fz; mz -= fx }
    const moving = mx !== 0 || mz !== 0, run = k.ShiftLeft || k.ShiftRight
    const sp = run ? 22 : 10
    const l = Math.hypot(mx, mz)
    const tx = moving ? (mx / l) * sp : 0, tz = moving ? (mz / l) * sp : 0
    vel.current.x = damp(vel.current.x, tx, 10, dt); vel.current.z = damp(vel.current.z, tz, 10, dt)
    s.x += vel.current.x * dt; s.z += vel.current.z * dt
    if (Math.hypot(vel.current.x, vel.current.z) > 0.5) s.walk += dt * (run ? 14 : 9)
    for (const n of s3.nodes) {
      const dx = s.x - n.x, dz = s.z - n.z, d = Math.hypot(dx, dz), r = n.kind === 'zone' ? 6 : 7
      if (d < r && d > 0) { s.x = n.x + (dx / d) * r; s.z = n.z + (dz / d) * r }
    }
    s.x = clamp(s.x, -195, 195); s.z = clamp(s.z, -195, 195)
    if (grp.current) {
      const bob = moving ? Math.abs(Math.sin(s.walk)) * 0.16 : 0
      grp.current.position.set(s.x, bob, s.z); grp.current.rotation.y = s.yaw; grp.current.visible = v === 'terceira' && !s3.photo
    }
    const sw = moving ? Math.sin(s.walk) * 0.8 : 0
    if (legs.current[0]) legs.current[0].rotation.x = sw
    if (legs.current[1]) legs.current[1].rotation.x = -sw
    const focus = new THREE.Vector3(s.x, 2.5, s.z)
    let desired: THREE.Vector3, lookAt: THREE.Vector3
    if (v === 'terceira') {
      const d = 14, cp = Math.cos(s.pitch)
      desired = new THREE.Vector3(s.x + Math.sin(s.yaw) * d * cp, 3 + Math.sin(s.pitch) * d, s.z + Math.cos(s.yaw) * d * cp)
      lookAt = focus
    } else {
      const p = s.pitch - 0.3
      desired = new THREE.Vector3(s.x, 3.4, s.z)
      lookAt = new THREE.Vector3(s.x + fx * Math.cos(p) * 10, 3.4 - Math.sin(p) * 10, s.z + fz * Math.cos(p) * 10)
    }
    if (!s.init) { camPos.current.copy(camera.position); look.current.copy(lookAt); s.init = true }
    camPos.current.x = damp(camPos.current.x, desired.x, 8, dt); camPos.current.y = damp(camPos.current.y, desired.y, 8, dt); camPos.current.z = damp(camPos.current.z, desired.z, 8, dt)
    look.current.x = damp(look.current.x, lookAt.x, 8, dt); look.current.y = damp(look.current.y, lookAt.y, 8, dt); look.current.z = damp(look.current.z, lookAt.z, 8, dt)
    const safe = clampCamera(focus, camPos.current, s3.nodes)
    camera.position.copy(safe)
    camera.lookAt(look.current)
  })
  return (
    <group ref={grp} position={[0, 0, 40]}>
      <GltfOr name="player" scale={1} fit={2.2}>
        <mesh position={[0, 2.3, 0]}><boxGeometry args={[1.4, 1.6, 0.8]} /><meshStandardMaterial color="#2563eb" /></mesh>
        <mesh position={[0, 3.5, 0]}><sphereGeometry args={[0.55]} /><meshStandardMaterial color="#fcd5b0" /></mesh>
        <mesh position={[-0.95, 2.3, 0]}><boxGeometry args={[0.4, 1.4, 0.5]} /><meshStandardMaterial color="#2563eb" /></mesh>
        <mesh position={[0.95, 2.3, 0]}><boxGeometry args={[0.4, 1.4, 0.5]} /><meshStandardMaterial color="#2563eb" /></mesh>
        {[-0.35, 0.35].map((x, i) => (
          <group key={x} position={[x, 1.5, 0]} ref={el => { legs.current[i] = el }}>
            <mesh position={[0, -0.75, 0]}><boxGeometry args={[0.55, 1.5, 0.6]} /><meshStandardMaterial color="#1e293b" /></mesh>
          </group>
        ))}
      </GltfOr>
    </group>
  )
}
