import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { makeNode } from '../electrical/engine'
import { buildSeedCity } from '../game/city'
import { cableQuote, constructionCost, lotOccupied } from '../game/construction'
import { expansionStep, firstLight } from '../game/firstLight'
import { getVisualTime } from '../game/visualClock'
import { strings } from '../i18n/pt-BR'
import { useGame } from '../store/gameStore'
import { DISTRICT_MODEL_SCALE, HEALTH, PALETTE } from './art'
import { DistrictModel } from './DistrictModels'
import { connectionHeight, districtBounds } from './districtParts'
import { Fire, Sparks } from './Effects'
import Environment from './Environment'
import Player from './Player'

const CELL = 10
const snap = (v: number) => Math.round(v / CELL) * CELL
const isBuilding = (tool: string) => tool === 'gen' || tool === 'sub' || tool === 'trafo' || tool === 'zone'
const noRaycast = () => {}
const badgeStyle = {
  color: '#eff7ed', background: '#202c31', border: '1px solid #6e8576', padding: '2px 6px',
  pointerEvents: 'none' as const, borderRadius: 5, whiteSpace: 'nowrap' as const, fontSize: 11, fontWeight: 650,
}

function cableCurve(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const a = new THREE.Vector3(ax, ay, az)
  const b = new THREE.Vector3(bx, by, bz)
  const control = a.clone().lerp(b, 0.5)
  control.y = Math.max(0.8, control.y - Math.min(a.distanceTo(b) * 0.062, 4.5))
  return new THREE.QuadraticBezierCurve3(a, control, b)
}

function Tube({ curve, radius, color }: { curve: THREE.QuadraticBezierCurve3; radius: number; color: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 16, radius, 5, false), [curve, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}>
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
}

function CablePulse({ curve }: { curve: THREE.QuadraticBezierCurve3 }) {
  const dot = useRef<THREE.Mesh>(null)
  useFrame(() => { if (dot.current) curve.getPoint((getVisualTime() * 0.6) % 1, dot.current.position) })
  return <mesh ref={dot} raycast={noRaycast}><sphereGeometry args={[0.36, 8, 6]} /><meshBasicMaterial color={PALETTE.marker} /></mesh>
}

const CableView = memo(function CableView({ id, ax, ay, az, bx, by, bz }: { id: number; ax: number; ay: number; az: number; bx: number; by: number; bz: number }) {
  const { failed, hot, live, selected, canSelect, photo, heatFault } = useGame(useShallow(s => {
    const c = s.cables.find(c => c.id === id)
    return {
      failed: !!c?.failed, heatFault: c?.fault === 'heat', hot: !!c && c.temp > 75,
      live: !!c && c.current > 0.05, selected: s.sel?.type === 'cable' && s.sel.id === id,
      canSelect: s.view === 'orbit' && !s.photo && s.tool === 'sel', photo: s.photo,
    }
  }))
  const curve = useMemo(() => cableCurve(ax, ay, az, bx, by, bz), [ax, ay, az, bx, by, bz])
  const mid = useMemo(() => curve.getPoint(0.5), [curve])
  const color = failed ? PALETTE.failedWire : hot ? HEALTH.warn : selected && !photo ? PALETTE.marker : live ? PALETTE.live : PALETTE.wire
  return <group onClick={canSelect ? e => { if (e.delta < 5) { e.stopPropagation(); useGame.getState().set({ sel: { type: 'cable', id } }) } } : undefined}>
    <Tube curve={curve} radius={selected && !photo ? 0.26 : 0.18} color={color} />
    {selected && live && !hot && !failed && !photo && <CablePulse curve={curve} />}
    {hot && !failed && <Sparks x={mid.x} y={mid.y} z={mid.z} />}
    {failed && heatFault && <Fire x={mid.x} y={mid.y} z={mid.z} />}
    {failed && !photo && <Html position={[mid.x, mid.y + 1.2, mid.z]} center zIndexRange={[5, 1]} style={{ pointerEvents: 'none' }}>
      <span style={{ ...badgeStyle, borderColor: HEALTH.bad }}>{strings.report.cableFailed} · C-{id}</span>
    </Html>}
  </group>
})

function Ring({ color, size = 4.8, filled = false }: { color: string; size?: number; filled?: boolean }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.105, 0]} raycast={noRaycast}>
    <ringGeometry args={[filled ? size * 0.56 : size * 0.92, size, 4, 1, Math.PI / 4]} />
    <meshBasicMaterial color={color} transparent opacity={filled ? 0.37 : 0.95} depthWrite={false} />
  </mesh>
}

function MapLabel({ color, y, children }: { color: string; y: number; children: string }) {
  return <Html position={[0, y, 0]} center zIndexRange={[6, 1]} style={{ pointerEvents: 'none' }}>
    <span style={{ ...badgeStyle, borderColor: color }}>{children}</span>
  </Html>
}

const NodeView = memo(function NodeView({ id, x, z }: { id: number; x: number; z: number }) {
  const state = useGame(useShallow(s => {
    const n = s.nodes.find(n => n.id === id)
    return {
      kind: n?.kind, zoneType: n?.zoneType, genType: n?.genType, volt: n?.volt,
      powered: s.powered.includes(id), mismatch: s.mismatch.includes(id), failed: !!n?.failed,
      near: !!n && n.cap > 0 && n.load > n.cap * 0.85,
      active: s.view === 'orbit' && !s.photo, photo: s.photo, cable: s.tool === 'cabo',
      pending: s.pending === id, moving: s.moving === id, hovered: s.hoverNode === id,
      selected: s.sel?.type === 'node' && s.sel.id === id,
    }
  }))
  const node = useMemo(() => {
    if (!state.kind) return null
    return { ...makeNode(id, state.kind, x, z, state.volt ?? 220), genType: state.genType, zoneType: state.zoneType }
  }, [id, x, z, state.kind, state.volt, state.genType, state.zoneType])
  if (!node) return null
  const color = state.failed ? HEALTH.bad : state.mismatch ? PALETTE.mismatch : state.near ? HEALTH.warn
    : state.pending || state.moving ? PALETTE.origin : state.selected || state.hovered ? PALETTE.marker : null
  const label = state.failed ? strings.map.failed : state.mismatch ? strings.map.incompatible : state.near ? strings.map.capacity : null
  return <group position={[x, 0, z]} onClick={e => {
    if (!state.active || e.delta >= 5) return
    e.stopPropagation()
    useGame.getState().clickNode(id)
  }} onPointerOver={() => {
    if (state.active && state.cable && useGame.getState().hoverNode !== id) useGame.getState().set({ hoverNode: id })
  }} onPointerOut={() => {
    if (useGame.getState().hoverNode === id) useGame.getState().set({ hoverNode: null })
  }}>
    <DistrictModel node={node} powered={state.powered} mismatch={state.mismatch} failed={state.failed} />
    {color && !state.photo && <Ring color={color} size={6.9} />}
    {label && !state.photo && <MapLabel y={districtBounds(node).max.y + 1.45} color={color ?? PALETTE.marker}>{label}</MapLabel>}
  </group>
})

function GuideMarkers() {
  const marker = useGame(useShallow(s => {
    if (!s.guideVisible || s.photo || s.view !== 'orbit') return null
    const step = firstLight(s) ?? expansionStep(s)
    if (!step) return null
    if ('lot' in step && step.lot && s.tool === (step.kind === 'expandTrafo' ? 'trafo' : step.kind)) {
      return { kind: 'lot' as const, x: step.lot.x, z: step.lot.z }
    }
    if (s.tool !== 'cabo' || !('from' in step)) return null
    const from = s.nodes.find(n => n.id === step.from)
    const to = s.nodes.find(n => n.id === step.to)
    if (!from || !to || (s.pending !== null && s.pending !== from.id)) return null
    return {
      kind: 'link' as const, fromX: from.x, fromZ: from.z, toX: to.x, toZ: to.z, showSource: s.pending === null,
      fromY: districtBounds(from).max.y + 1.1, toY: districtBounds(to).max.y + 1.1,
    }
  }))
  if (!marker) return null
  if (marker.kind === 'lot') return <group position={[marker.x, 0, marker.z]}>
    <Ring color={PALETTE.marker} size={6.2} filled />
    <MapLabel y={1.15} color={PALETTE.marker}>{strings.guide.highlight}</MapLabel>
  </group>
  return <>
    {marker.showSource && <group position={[marker.fromX, 0, marker.fromZ]}>
      <Ring color={PALETTE.origin} size={6.9} />
      <MapLabel y={marker.fromY} color={PALETTE.origin}>{strings.guide.from}</MapLabel>
    </group>}
    <group position={[marker.toX, 0, marker.toZ]}>
      <Ring color={PALETTE.marker} size={6.9} />
      <MapLabel y={marker.toY} color={PALETTE.marker}>{strings.guide.to}</MapLabel>
    </group>
  </>
}

function ConnectionPreview() {
  const { from, to, area, material, mult, rmult, budget } = useGame(useShallow(s => ({
    from: s.nodes.find(n => n.id === s.pending), to: s.nodes.find(n => n.id === s.hoverNode),
    area: s.area, material: s.material, mult: s.mult, rmult: s.rmult, budget: Math.floor(s.budget),
  })))
  const ax = from?.x, az = from?.z, ay = from && connectionHeight(from)
  const bx = to?.x, bz = to?.z, by = to && connectionHeight(to)
  const curve = useMemo(() => ax === undefined || ay === undefined || az === undefined || bx === undefined || by === undefined || bz === undefined
    ? null : cableCurve(ax, ay, az, bx, by, bz), [ax, ay, az, bx, by, bz])
  if (!from || !to || from.id === to.id || !curve) return null
  const q = cableQuote(from, to, material, area, mult, rmult)
  const color = q.mismatch ? PALETTE.mismatch : q.overheating || q.voltageDrop || q.cost > budget ? HEALTH.bad : q.overcurrent ? HEALTH.warn : PALETTE.marker
  return <Tube curve={curve} radius={0.23} color={color} />
}

function GroundLayer() {
  const { tool, view, photo, moving, genType, hasFunds } = useGame(useShallow(s => ({
    tool: s.tool, view: s.view, photo: s.photo, moving: s.moving, genType: s.genType,
    hasFunds: constructionCost(s.tool, s.genType) <= s.budget,
  })))
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null)
  const active = view === 'orbit' && !photo
  const placing = active && (isBuilding(tool) || (tool === 'move' && moving !== null))
  const blocked = useGame(s => hover ? lotOccupied(s.nodes, hover.x, hover.z, moving) : false)
  const valid = hasFunds && !blocked
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}
      onPointerMove={e => {
        if (!placing) return
        const x = snap(e.point.x), z = snap(e.point.z)
        setHover(p => p?.x === x && p.z === z ? p : { x, z })
      }}
      onPointerOut={() => setHover(null)}
      onClick={e => {
        if (!active || e.delta >= 5) return
        const s = useGame.getState()
        if (s.tool === 'sel') s.set({ sel: null })
        else if (s.tool === 'cabo') s.set({ pending: null, hoverNode: null })
        else s.place(snap(e.point.x), snap(e.point.z))
      }}>
      <planeGeometry args={[400, 400]} /><meshBasicMaterial visible={false} />
    </mesh>
    {placing && <gridHelper args={[400, 40, '#788c7a', '#7d917d']} position={[0, 0.102, 0]} raycast={noRaycast} />}
    {placing && hover && <group position={[hover.x, 0, hover.z]}>
      <Ring color={valid ? PALETTE.marker : HEALTH.bad} size={6.1} filled />
      <mesh position={[0, 1.8 * DISTRICT_MODEL_SCALE[1], 0]} scale={DISTRICT_MODEL_SCALE} raycast={noRaycast}>
        <boxGeometry args={[tool === 'trafo' ? 5.1 : 7, genType === 'solar' && tool === 'gen' ? 2.5 : 3.5, 6]} />
        <meshBasicMaterial color={valid ? PALETTE.marker : HEALTH.bad} wireframe transparent opacity={0.65} />
      </mesh>
    </group>}
  </>
}

const GameDistrict = memo(function GameDistrict() {
  useGame(s => s.nodes.map(n => n.id + ':' + n.x + ':' + n.z + ':' + connectionHeight(n)).join('|'))
  useGame(s => s.cables.map(c => c.id + ':' + c.a + ':' + c.b).join('|'))
  const preview = useGame(s => !s.photo && s.view === 'orbit' && s.tool === 'cabo' && s.pending !== null)
  const { nodes, cables } = useGame.getState()
  const locations = new Map(nodes.map(n => [n.id, n]))
  return <>
    <GroundLayer />
    {nodes.map(n => <NodeView key={n.id} id={n.id} x={n.x} z={n.z} />)}
    {cables.map(c => {
      const a = locations.get(c.a), b = locations.get(c.b)
      return a && b ? <CableView key={c.id} id={c.id} ax={a.x} ay={connectionHeight(a)} az={a.z} bx={b.x} by={connectionHeight(b)} bz={b.z} /> : null
    })}
    <GuideMarkers />
    {preview && <ConnectionPreview />}
  </>
})

const demoGen = makeNode(4, 'gen', 20, 7, 0)
const demoTrafo = makeNode(5, 'trafo', 31, 10, 110)
const demoNodes = [
  ...buildSeedCity().nodes, demoGen, demoTrafo,
  { ...makeNode(6, 'zone', 61, 31, 220), zoneType: 'predio' as const },
  { ...makeNode(7, 'zone', 47, 31, 220), zoneType: 'hospital' as const },
  { ...makeNode(8, 'gen', 70, 10, 0), genType: 'solar' as const },
]
const demoLinks = [[3, 4], [4, 0], [4, 1], [4, 2]].map(([i, j]) => {
  const a = demoNodes[i], b = demoNodes[j]
  return cableCurve(a.x, connectionHeight(a), a.z, b.x, connectionHeight(b), b.z)
})
const MenuDistrict = memo(function MenuDistrict() {
  return <>
    {demoNodes.map(n => <group key={n.id} position={[n.x, 0, n.z]}><DistrictModel node={n} powered={n.id < 6} /></group>)}
    {demoLinks.map((curve, i) => <Tube key={i} curve={curve} radius={0.2} color={PALETTE.live} />)}
  </>
})

function DistrictCamera({ preview }: { preview: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  const { view, photo, session, cameraReset } = useGame(useShallow(s => ({ view: s.view, photo: s.photo, session: s.session, cameraReset: s.cameraReset })))
  const portrait = size.width < size.height
  const orbit = view === 'orbit' || photo
  useLayoutEffect(() => {
    if (!orbit && !preview) return
    const target = new THREE.Vector3(30, 0, 18)
    const nodes = useGame.getState().nodes
    const zones = nodes.filter(n => n.kind === 'zone')
    const district = zones.length ? zones : nodes
    if (preview) target.set(portrait ? 41 : 18, 0, portrait ? 34 : 25)
    else if (district.length) target.set(district.reduce((sum, n) => sum + n.x, 0) / district.length, 0, district.reduce((sum, n) => sum + n.z, 0) / district.length)
    if (portrait && !preview) target.y = 15
    const offset = preview ? (portrait ? [42, 57, 70] : [54, 56, 80]) : (portrait ? [36, 72, 83] : [37, 61, 76])
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = portrait ? 52 : 42
      camera.updateProjectionMatrix()
    }
    camera.position.set(target.x + offset[0], offset[1], target.z + offset[2])
    camera.lookAt(target)
    camera.updateMatrixWorld()
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [camera, orbit, preview, portrait, session, cameraReset])
  if (preview || !orbit) return null
  return <OrbitControls ref={controls} makeDefault maxPolarAngle={Math.PI / 2.12} minDistance={17} maxDistance={265} enableDamping dampingFactor={0.16} />
}

export default function Scene() {
  const preview = useGame(s => s.screen === 'menu')
  return <>
    <Environment preview={preview} />
    {preview ? <MenuDistrict /> : <><GameDistrict /><Player /></>}
    <DistrictCamera preview={preview} />
  </>
}
