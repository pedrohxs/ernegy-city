import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getVisualTime } from '../game/visualClock'

export interface FlowState { speed: number; color: THREE.Color; visible: boolean }

// Lê velocidade/cor/visibilidade de um ref a cada quadro: evita re-render por tick.
export function Flow({ curve, state }: { curve: THREE.Curve<THREE.Vector3>; state: MutableRefObject<FlowState> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const st = state.current, t = getVisualTime()
    refs.current.forEach((m, i) => {
      if (!m) return
      m.visible = st.visible
      m.position.copy(curve.getPoint((t * st.speed + i / 5) % 1))
      ;(m.material as THREE.MeshBasicMaterial).color.copy(st.color)
    })
  })
  return <>{[0, 1, 2, 3, 4].map(i => <mesh key={i} ref={el => { refs.current[i] = el }} visible={false}><sphereGeometry args={[0.7]} /><meshBasicMaterial /></mesh>)}</>
}

export function Smoke({ x, y, z }: { x: number; y: number; z: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const mats = useMemo(() => Array.from({ length: 10 }, () => new THREE.MeshBasicMaterial({ color: '#334155', transparent: true })), [])
  useFrame(() => refs.current.forEach((m, i) => {
    if (!m) return
    const t = getVisualTime(), k = (t * 0.35 + i / 10) % 1
    m.position.set(x + Math.sin(i * 7 + t) * k * 2.5, y + k * 12, z + Math.cos(i * 5 + t) * k * 2.5)
    m.scale.setScalar(1 + k * 3); mats[i].opacity = 0.7 * (1 - k)
  }))
  return <>{mats.map((mt, i) => <mesh key={i} ref={el => { refs.current[i] = el }} material={mt}><sphereGeometry args={[0.8]} /></mesh>)}</>
}

const sparkMat = new THREE.MeshBasicMaterial({ color: '#fde047' })
export function Sparks({ x, y, z }: { x: number; y: number; z: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => refs.current.forEach(m => {
    if (!m) return
    m.visible = Math.random() < 0.3
    m.position.set(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.3) * 4, z + (Math.random() - 0.5) * 5)
  }))
  return <>{[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} ref={el => { refs.current[i] = el }} material={sparkMat}><sphereGeometry args={[0.25]} /></mesh>)}</>
}

export function Fire({ x, y, z }: { x: number; y: number; z: number }) {
  const r = useRef<THREE.Mesh>(null)
  useFrame(() => { if (r.current) r.current.scale.setScalar(1 + 0.5 * Math.sin(getVisualTime() * 12)) })
  return <>
    <mesh ref={r} position={[x, y, z]}><sphereGeometry args={[1.8]} /><meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={2} /></mesh>
    <Smoke x={x} y={y} z={z} /><Sparks x={x} y={y} z={z} />
  </>
}
