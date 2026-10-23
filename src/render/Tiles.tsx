import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Coloca um modelo .glb (ex.: kit de estradas Kenney) em várias posições usando InstancedMesh.
// Só renderiza se o arquivo existir; caso contrário, nada (o procedural cobre o resto).
const cache = new Map<string, Promise<boolean>>()
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

interface InstProps {
  url: string
  positions: [number, number][]
  size: number
  y?: number
  rotY?: number
  castShadow?: boolean
  receiveShadow?: boolean
}
function Instanced({ url, positions, size, y = 0, rotY = 0, castShadow = false, receiveShadow = true }: InstProps) {
  const { scene } = useGLTF(url, true, true)
  const { geometry, material } = useMemo(() => {
    let geometry: THREE.BufferGeometry | null = null
    let material: THREE.Material | THREE.Material[] | null = null
    scene.traverse(o => { const m = o as THREE.Mesh; if (!geometry && m.isMesh) { geometry = m.geometry; material = m.material } })
    return { geometry, material }
  }, [scene])
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const d = new THREE.Object3D()
    positions.forEach((p, i) => { d.position.set(p[0], y, p[1]); d.rotation.set(0, rotY, 0); d.scale.setScalar(size); d.updateMatrix(); im.setMatrixAt(i, d.matrix) })
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
  }, [positions, size, y, rotY])
  if (!geometry || !material) return null
  return <instancedMesh ref={ref} args={[geometry, material, positions.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
}

export default function Tiles(props: InstProps) {
  const [ok, setOk] = useState(false)
  useEffect(() => { let alive = true; exists(props.url).then(v => { if (alive) setOk(v) }); return () => { alive = false } }, [props.url])
  if (!ok) return null
  return <Suspense fallback={null}><Instanced {...props} /></Suspense>
}
