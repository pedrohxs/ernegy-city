import { Component, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MODEL_OVERRIDES } from './modelOverrides'
import { hourOf, nightFactor } from '../game/clock'
import { useGame } from '../store/gameStore'

// Usa /models/<nome>.glb se existir; senão desenha o modelo procedural (fallback).
// - Aceita lista de nomes: tenta na ordem (ex.: ['casa', 'zone']).
// - `fit`: ajusta sozinho a maior dimensão horizontal para esse valor e apoia a base no chão.
// - Ajustes finos opcionais ficam em modelOverrides.ts.
const cache = new Map<string, Promise<boolean>>()
// cacheia só resultados positivos; negativos são re-checados (evita "ficar procedural" após adicionar o arquivo)
const exists = (url: string) => {
  if (!cache.has(url)) {
    const p = fetch(url, { method: 'HEAD' })
      .then(r => r.ok && !(r.headers.get('content-type') ?? '').includes('html'))
      .catch(() => false)
      .then(ok => { if (!ok) cache.delete(url); return ok })
    cache.set(url, p)
  }
  return cache.get(url)!
}
class EB extends Component<{ fallback: ReactNode; children: ReactNode }, { e: boolean }> {
  state = { e: false }
  static getDerivedStateFromError() { return { e: true } }
  render() { return this.state.e ? this.props.fallback : this.props.children }
}
function Loaded({ url, scale, fit, lit }: { url: string; scale: number; fit?: number; lit?: boolean }) {
  // useGLTF cacheia por URL; draco + meshopt habilitados para .glb comprimidos.
  const { scene } = useGLTF(url, true, true)
  const emissives = useRef<THREE.MeshStandardMaterial[]>([])
  const obj = useMemo(() => {
    const cloned = scene.clone(true)
    if (fit && fit > 0) {
      const box = new THREE.Box3().setFromObject(cloned)
      const size = box.getSize(new THREE.Vector3())
      const maxXZ = Math.max(size.x, size.z)
      if (maxXZ > 1e-4) cloned.scale.multiplyScalar(fit / maxXZ)
      cloned.updateMatrixWorld(true)
      const box2 = new THREE.Box3().setFromObject(cloned)
      cloned.position.y -= box2.min.y // apoia a base em Y=0
    }
    const name = url.replace('/models/', '').replace('.glb', '')
    const ov = MODEL_OVERRIDES[name]
    cloned.scale.multiplyScalar(scale * (ov?.scale ?? 1))
    cloned.rotation.y += ov?.rotY ?? 0
    cloned.position.y += ov?.y ?? 0
    emissives.current = []
    cloned.traverse(o => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true; m.receiveShadow = true
      const mat = m.material as THREE.MeshStandardMaterial | undefined
      if (lit && mat && mat.map) { // fachada acende de leve à noite
        mat.emissive = new THREE.Color('#ffd9a0')
        mat.emissiveMap = mat.map
        mat.emissiveIntensity = 0
        emissives.current.push(mat)
      }
    })
    return cloned
  }, [scene, url, scale, fit, lit])
  useFrame(() => {
    if (!lit || !emissives.current.length) return
    const nf = nightFactor(hourOf(useGame.getState().time))
    for (const m of emissives.current) m.emissiveIntensity = 0.25 * nf
  })
  return <primitive object={obj} />
}
export default function GltfOr({ name, scale = 1, fit, lit, children }: { name: string | string[]; scale?: number; fit?: number; lit?: boolean; children: ReactNode }) {
  const key = Array.isArray(name) ? name.join('|') : name
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true, timer: number | undefined, tries = 0
    const check = async () => {
      for (const n of key.split('|')) {
        const u = `/models/${n}.glb`
        if (await exists(u)) { if (alive) setUrl(u); return }
      }
      if (alive) {
        setUrl(null)
        if (tries++ < 3) timer = window.setTimeout(check, 1500) // auto-recupera se o arquivo aparecer depois
      }
    }
    check()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [key])
  if (!url) return <>{children}</>
  return <EB fallback={children}><Suspense fallback={children}><Loaded url={url} scale={scale} fit={fit} lit={lit} /></Suspense></EB>
}
