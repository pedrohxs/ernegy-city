import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { COOL, GENS, HEAT, PRICE, T_AMB, T_MAX, ZoneType } from '../data/balance'
import { hourOf, nightFactor } from '../game/clock'
import { GNode, Kind, jouleLoss, resistance } from '../electrical/engine'
import { HEALTH, PALETTE } from './art'
import GltfOr from './GltfOr'
import Environment from './Environment'
import Player from './Player'
import { Fire, Flow, Sparks, FlowState } from './Effects'

const CELL = 10
const MIN_DIST = 7
const snap = (v: number) => Math.round(v / CELL) * CELL
const FAILED = new THREE.Color('#3a1414')
const hotColor = (out: THREE.Color, t: number) => out.setHSL((1 - Math.min(1, Math.max(0, (t - T_AMB) / (T_MAX - T_AMB)))) * 0.33, 1, 0.5)

let tex: THREE.CanvasTexture | null = null
function winTex() {
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128
    const x = c.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#fff'
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) x.fillRect(6 + i * 15, 6 + j * 15, 9, 9)
    tex = new THREE.CanvasTexture(c)
  }
  return tex
}
function curveOf(ax: number, az: number, bx: number, bz: number) {
  const p0 = new THREE.Vector3(ax, 6, az), p2 = new THREE.Vector3(bx, 6, bz)
  const p1 = p0.clone().lerp(p2, 0.5); p1.y -= Math.min(p0.distanceTo(p2) * 0.06 + 0.5, 8)
  return new THREE.QuadraticBezierCurve3(p0, p1, p2)
}

const NodeModel = memo(function NodeModel({ id, kind, volt, zoneType }: { id: number; kind: Kind; volt: number; zoneType?: ZoneType }) {
  const failed = useGame(s => s.nodes.find(n => n.id === id)?.failed ?? false)
  const on = useGame(s => s.powered.includes(id))
  const bad = useGame(s => s.mismatch.includes(id))
  const near = useGame(s => { const n = s.nodes.find(n => n.id === id); return !!n && n.cap > 0 && n.load > n.cap * 0.85 })
  const grp = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (grp.current && grp.current.scale.x < 1) grp.current.scale.setScalar(Math.min(1, grp.current.scale.x + dt * 4)) })
  const base = failed ? PALETTE.dead : bad ? PALETTE.hazardPurple : near ? HEALTH.warn : kind === 'zone' ? (volt === 110 ? PALETTE.zone110 : PALETTE.zone220) : kind === 'sub' ? PALETTE.building : PALETTE.metal
  const halo = near || bad
  return (
    <group ref={grp} scale={0.01}>
      {kind === 'zone' && <ZoneBody type={zoneType ?? (volt === 110 ? 'casa' : 'predio')} dead={failed} bad={bad} on={on} />}
      {kind === 'gen' && <>
        <mesh position={[0, 3, 0]} castShadow receiveShadow><boxGeometry args={[10, 6, 8]} /><meshStandardMaterial color={failed ? PALETTE.dead : PALETTE.metal} metalness={0.4} roughness={0.5} /></mesh>
        {[-3, 3].map(x => <mesh key={x} position={[x, 11, 0]} castShadow><cylinderGeometry args={[1, 1.4, 10]} /><meshStandardMaterial color={PALETTE.metalDark} /></mesh>)}
        <mesh position={[0, 6.3, 0]}><boxGeometry args={[10.4, 0.6, 8.4]} /><meshStandardMaterial color={PALETTE.lamp} emissive={PALETTE.lamp} emissiveIntensity={failed ? 0 : 0.6} /></mesh>
      </>}
      {(kind === 'sub' || kind === 'trafo') && <>
        {kind === 'sub'
          ? <mesh position={[0, 1.5, 0]} castShadow receiveShadow><boxGeometry args={[10, 3, 10]} /><meshStandardMaterial color={base} metalness={0.3} roughness={0.6} /></mesh>
          : <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[3, 3, 6]} /><meshStandardMaterial color={base} /></mesh>}
        {[-1.8, 0, 1.8].map(x => <mesh key={x} position={[x, kind === 'sub' ? 4.5 : 7.5, 0]} castShadow><cylinderGeometry args={[0.4, 0.6, 3]} /><meshStandardMaterial color={PALETTE.insulator} /></mesh>)}
      </>}
      {halo && <mesh position={[0, kind === 'zone' ? (zoneType === 'casa' ? 4 : zoneType === 'hospital' ? 7 : 9) : 5, 0]}><sphereGeometry args={[6, 16, 12]} /><meshBasicMaterial color={failed ? HEALTH.bad : near ? HEALTH.warn : HEALTH.bad} transparent opacity={0.12} /></mesh>}
    </group>
  )
})

// Material das janelas: esmaece com o anoitecer sem re-renderizar o componente.
function WindowMat({ on, color, tint = '#ffd27a', base = 0.25, gain = 1.55, roughness = 0.7 }: { on: boolean; color: string; tint?: string; base?: number; gain?: number; roughness?: number }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (!ref.current) return
    const nf = nightFactor(hourOf(useGame.getState().time))
    ref.current.emissiveIntensity = on ? base + nf * gain : 0
  })
  return <meshStandardMaterial ref={ref} color={color} emissive={tint} emissiveMap={winTex()} roughness={roughness} />
}

function ZoneBody({ type, dead, bad, on }: { type: ZoneType; dead: boolean; bad: boolean; on: boolean }) {
  const wall = dead ? PALETTE.dead : bad ? PALETTE.hazardPurple : type === 'hospital' ? '#e8eef5' : PALETTE.building
  if (type === 'casa') return <>
    <mesh position={[0, 2.5, 0]} castShadow receiveShadow><boxGeometry args={[6, 5, 6]} /><WindowMat on={on} color={wall} roughness={0.75} /></mesh>
    <mesh position={[0, 5.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[4.6, 3, 4]} /><meshStandardMaterial color={PALETTE.buildingRoof} flatShading /></mesh>
  </>
  if (type === 'hospital') return <>
    <mesh position={[0, 5, 0]} castShadow receiveShadow><boxGeometry args={[8, 10, 8]} /><WindowMat on={on} color={wall} tint="#dbeafe" base={0.15} gain={0.35} roughness={0.6} /></mesh>
    <mesh position={[0, 10.2, 0]} castShadow><boxGeometry args={[8.4, 0.6, 8.4]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
    <mesh position={[0, 11.5, 0]}><boxGeometry args={[2.6, 0.7, 0.4]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} /></mesh>
    <mesh position={[0, 11.5, 0]}><boxGeometry args={[0.7, 2.6, 0.4]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} /></mesh>
  </>
  return <>
    <mesh position={[0, 8, 0]} castShadow receiveShadow><boxGeometry args={[7, 16, 7]} /><WindowMat on={on} color={wall} /></mesh>
    <mesh position={[0, 16.4, 0]} castShadow><boxGeometry args={[7.4, 0.8, 7.4]} /><meshStandardMaterial color={PALETTE.buildingRoof} /></mesh>
  </>
}

const CableView = memo(function CableView({ id, ax, az, bx, bz }: { id: number; ax: number; az: number; bx: number; bz: number }) {
  const set = useGame(s => s.set)
  const failed = useGame(s => s.cables.find(c => c.id === id)?.failed ?? false)
  const hot = useGame(s => { const c = s.cables.find(c => c.id === id); return !!c && !c.failed && c.temp > 75 })
  const meshRef = useRef<THREE.Mesh>(null)
  const flow = useRef<FlowState>({ speed: 0, color: new THREE.Color('#ffffff'), visible: false })
  const target = useRef(new THREE.Color())
  const curve = useMemo(() => curveOf(ax, az, bx, bz), [ax, az, bx, bz])
  // Geometria própria do cabo (tubo), recriada só quando as pontas mudam (não a cada tick).
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 20, 0.35, 6, false), [curve])
  useEffect(() => () => geometry.dispose(), [geometry])
  const mid = useMemo(() => curve.getPoint(0.5), [curve])
  useFrame((_, dt) => {
    const c = useGame.getState().cables.find(c => c.id === id)
    const mat = meshRef.current?.material as THREE.MeshStandardMaterial | undefined
    if (!c || !mat) return
    if (c.failed) target.current.copy(FAILED)
    else hotColor(target.current, c.temp)
    mat.color.lerp(target.current, Math.min(1, dt * 6))
    const heat = Math.min(1, Math.max(0, (c.temp - 60) / 35))
    mat.emissive.copy(mat.color).multiplyScalar(heat * 0.8)
    mat.emissiveIntensity = heat
    flow.current.color.copy(mat.color)
    flow.current.speed = 0.1 + Math.min(1, (c.current * c.volt) / 50000) * 0.6
    flow.current.visible = !c.failed && c.current > 0
  })
  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} castShadow onClick={e => { e.stopPropagation(); set({ sel: { type: 'cable', id } }) }}>
        <meshStandardMaterial color={hotColor(new THREE.Color(), 25)} metalness={0.5} roughness={0.4} />
      </mesh>
      {!failed && <Flow curve={curve} state={flow} />}
      {!failed && hot && <Sparks x={mid.x} y={mid.y} z={mid.z} />}
      {failed && <Fire x={mid.x} y={mid.y} z={mid.z} />}
    </group>
  )
})

// Modelos por tipo de zona (caminhos relativos a /models) e tamanho-alvo.
// Casas: kit Kenney (casas-buldings). Prédio/hospital: pack anterior.
const ZONE_MODELS: Partial<Record<ZoneType, string[]>> = {
  // casas do pack anterior (casa3 é alta demais; fica de fora)
  casa: ['casa', 'casa2', 'casa4', 'casa5'],
  predio: ['predio', 'predio2'], // predio3 = Bank (templo clássico) — fora da cidade moderna
  hospital: ['hospital'],
}
const ZONE_FIT: Partial<Record<ZoneType, number>> = { casa: 10, predio: 11, hospital: 12 }
const modelNames = (n: GNode): string | string[] => {
  if (n.kind !== 'zone') return n.kind
  const zt = n.zoneType ?? 'predio'
  const list = ZONE_MODELS[zt] ?? [zt]
  const pick = list[n.id % list.length]
  return pick === list[0] && list.length === 1 ? [list[0]] : [pick, list[0]]
}
const modelFit = (n: GNode): number => n.kind === 'zone' ? (ZONE_FIT[n.zoneType ?? 'predio'] ?? 9) : n.kind === 'gen' ? 10 : n.kind === 'sub' ? 10 : 6

const MemoEnvironment = memo(Environment)
const MemoPlayer = memo(Player)

interface Preview { length: number; R: number; cost: number; I: number; loss: number; eqT: number; risk: 'ok' | 'warn' | 'bad' }
const RISK_COLOR = { ok: HEALTH.ok, warn: HEALTH.warn, bad: HEALTH.bad }

function CablePreview({ pendingId, x, z }: { pendingId: number; x: number; z: number }) {
  const material = useGame(s => s.material), area = useGame(s => s.area)
  const nodes = useGame.getState().nodes
  const a = nodes.find(n => n.id === pendingId)
  const p: Preview | null = useMemo(() => {
    if (!a) return null
    const length = Math.hypot(a.x - x, a.z - z) || 0.1
    const R = resistance(material, length, area)
    const cost = length * PRICE[material] * (area / 35)
    const dest = nodes.find(n => n.x === x && n.z === z)
    const load = dest?.kind === 'zone' ? dest.kW : 0
    const I = (load * 1000) / Math.max(a.volt || 220, 1)
    const loss = jouleLoss(R, I)
    const eqT = T_AMB + (loss * HEAT) / COOL
    const risk: Preview['risk'] = eqT >= T_MAX ? 'bad' : eqT >= 75 ? 'warn' : 'ok'
    return { length, R, cost, I, loss, eqT, risk }
  }, [a, x, z, material, area, nodes])
  if (!a || !p) return null
  const c = RISK_COLOR[p.risk]
  return (
    <Html position={[(a.x + x) / 2, 10, (a.z + z) / 2]} center distanceFactor={90}>
      <div style={{ background: '#000d', border: `2px solid ${c}`, borderRadius: 4, padding: '3px 6px', fontSize: 11, color: '#fff', whiteSpace: 'nowrap' }}>
        {p.length.toFixed(0)} m · R={p.R.toFixed(3)} Ω · I≈{p.I.toFixed(0)} A · perda≈{(p.loss / 1000).toFixed(2)} kW · R$ {p.cost.toFixed(0)}
        {p.risk !== 'ok' && <b style={{ color: c }}> · {p.risk === 'bad' ? '⚠ superaquece!' : '⚠ esquenta'}</b>}
      </div>
    </Html>
  )
}

// Piso + fantasma + prévia do cabo. Fica separado para que o movimento do mouse
// NÃO re-renderize a lista de nós/cabos do Scene.
function GroundLayer() {
  const view = useGame(s => s.view)
  const tool = useGame(s => s.tool)
  const genType = useGame(s => s.genType)
  const pending = useGame(s => s.pending)
  const photo = useGame(s => s.photo)
  const place = useGame(s => s.place)
  const budget = useGame(s => s.budget)
  useGame(s => s.nodes.map(n => `${n.id}:${n.x}:${n.z}`).join('|')) // reassina em mudança estrutural
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null)
  const nodes = useGame.getState().nodes
  const canBuild = view === 'orbit' && !photo
  const buildKind = tool === 'gen' || tool === 'sub' || tool === 'trafo' || tool === 'zone'
  const cost = tool === 'gen' ? GENS[genType].cost : 0
  const blocked = hover ? nodes.some(n => Math.hypot(n.x - hover.x, n.z - hover.z) < MIN_DIST) : false
  const ghostOk = !blocked && (tool !== 'gen' || cost <= budget)
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow
        onPointerMove={e => { if (canBuild) setHover({ x: snap(e.point.x), z: snap(e.point.z) }) }}
        onPointerOut={() => setHover(null)}
        onClick={e => { if (canBuild) place(snap(e.point.x), snap(e.point.z)) }}>
        <planeGeometry args={[400, 400]} /><meshStandardMaterial color={PALETTE.ground} roughness={0.95} />
      </mesh>
      <gridHelper args={[400, 40, '#3b4d3b', '#2f402f']} position={[0, 0.06, 0]} />
      {hover && buildKind && canBuild && (
        <group position={[hover.x, 0, hover.z]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[8, 1, 8]} /><meshBasicMaterial color={ghostOk ? HEALTH.ok : HEALTH.bad} transparent opacity={0.35} /></mesh>
          <mesh position={[0, 4 + (tool === 'gen' || tool === 'zone' ? 3 : 0), 0]}><boxGeometry args={[7, 6, 7]} /><meshBasicMaterial color={ghostOk ? HEALTH.ok : HEALTH.bad} transparent opacity={0.18} wireframe /></mesh>
        </group>
      )}
      {tool === 'cabo' && pending !== null && hover && <CablePreview pendingId={pending} x={hover.x} z={hover.z} />}
    </>
  )
}

export default function Scene() {
  const view = useGame(s => s.view)
  const pending = useGame(s => s.pending)
  const moving = useGame(s => s.moving)
  const photo = useGame(s => s.photo)
  const clickNode = useGame(s => s.clickNode)
  useGame(s => s.nodes.map(n => `${n.id}:${n.kind}:${n.x}:${n.z}:${n.volt}`).join('|'))
  useGame(s => s.cables.map(c => `${c.id}:${c.a}:${c.b}`).join('|'))
  const nodes = useGame.getState().nodes
  const cables = useGame.getState().cables
  const pos = (id: number) => nodes.find(n => n.id === id)
  const canBuild = view === 'orbit' && !photo

  return (
    <>
      <MemoEnvironment />
      <GroundLayer />
      {nodes.map(n => (
        <group key={n.id} position={[n.x, 0, n.z]} onClick={e => { e.stopPropagation(); if (canBuild) clickNode(n.id) }}>
          <GltfOr name={modelNames(n)} fit={modelFit(n)} lit={n.kind === 'zone'}><NodeModel id={n.id} kind={n.kind} volt={n.volt} zoneType={n.zoneType} /></GltfOr>
          {pending === n.id && <mesh position={[0, 20, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[2, 4]} /><meshBasicMaterial color="#38bdf8" /></mesh>}
          {moving === n.id && <mesh position={[0, 20, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[2, 4]} /><meshBasicMaterial color="#f472b6" /></mesh>}
        </group>
      ))}
      {cables.map(c => { const a = pos(c.a), b = pos(c.b); return a && b ? <CableView key={c.id} id={c.id} ax={a.x} az={a.z} bx={b.x} bz={b.z} /> : null })}
      <MemoPlayer />
    </>
  )
}
