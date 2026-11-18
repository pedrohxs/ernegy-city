import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { GNode } from '../electrical/engine'
import { DISTRICT_MODEL_SCALE, PALETTE } from './art'

const boxGeometry = new THREE.BoxGeometry()
const tubeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
const gableProfile = new THREE.Shape()
gableProfile.moveTo(-0.5, -0.5)
gableProfile.lineTo(0.5, -0.5)
gableProfile.lineTo(0, 0.5)
gableProfile.closePath()
const gableGeometry = new THREE.ExtrudeGeometry(gableProfile, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5)

const finishes = {
  foundation: '#b2aa92', ivory: '#e0d5bc', stucco: '#ccad85', orange: '#bc6850', slate: '#48616c',
  wood: '#966f52', trim: '#e8e3d6', dark: '#384957', steel: '#728789', metal: '#9eb0aa',
  teal: '#3d766f', porcelain: '#d2cbaf', water: '#529dab', solar: '#334f69', hospital: '#a44b42',
  glass: '#52737a', window: '#273941',
} as const
type Finish = keyof typeof finishes
const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.81 })
const unlitWindow = new THREE.MeshStandardMaterial({ color: finishes.window, roughness: 0.55 })
const litWindow = new THREE.MeshStandardMaterial({ color: '#ffe3ae', emissive: '#ffbe6b', emissiveIntensity: 0.4, roughness: 0.55 })
const violetWindow = new THREE.MeshStandardMaterial({ color: PALETTE.mismatch, emissive: PALETTE.mismatch, emissiveIntensity: 0.31 })
const darkWindow = new THREE.MeshStandardMaterial({ color: '#302638' })

export function lightWindows(day: number) {
  litWindow.emissiveIntensity = 0.28 + (1 - day) * 1.05
}

type Part = { shape: THREE.BufferGeometry; finish: Finish; position: [number, number, number]; size: [number, number, number]; tilt: number }
const box = (finish: Finish, x: number, y: number, z: number, w: number, h: number, d: number, tilt = 0): Part =>
  ({ shape: boxGeometry, finish, position: [x, y, z], size: [w, h, d], tilt })
const cylinder = (finish: Finish, x: number, y: number, z: number, diameter: number, height: number, tilt = 0): Part =>
  ({ ...box(finish, x, y, z, diameter, height, diameter, tilt), shape: tubeGeometry })
const gable = (finish: Finish, y: number, w: number, h: number, d: number): Part =>
  ({ ...box(finish, 0, y, 0, w, h, d), shape: gableGeometry })
const base = () => box('foundation', 0, 0.12, 0, 8.6, 0.24, 8.4)

function house(wall: Finish, roof: Finish, mirrored: boolean): Part[] {
  const door = mirrored ? -1.4 : 1.4, window = -door
  return [
    base(), box(wall, 0, 1.74, 0, 6.7, 3.05, 5.8),
    gable(wall, 4.19, 6.7, 1.96, 5.8), gable(roof, 4.44, 7.6, 2.25, 6.7),
    box('trim', 0, 3.35, 0, 7.25, 0.18, 6.28),
    box('wood', door, 1.17, 2.96, 1.05, 1.92, 0.16),
    box('foundation', door, 0.26, 3.29, 2.2, 0.28, 1.35),
    box(roof, door, 2.58, 3.54, 2.4, 0.16, 1.34),
    box('trim', window, 1.94, 2.94, 1.95, 1.34, 0.19),
    box('window', window, 1.94, 3.06, 1.57, 1.02, 0.08),
    box('window', window, 1.93, -2.95, 1.54, 1.05, 0.12),
    box('window', 3.37, 1.85, 0, 0.13, 1.06, 1.6),
    box('window', -3.37, 1.85, 0, 0.13, 1.06, 1.6),
    box('ivory', 2.1, 4.46, -0.94, 0.72, 2.08, 0.7),
    box('slate', 2.1, 5.51, -0.94, 0.86, 0.2, 0.83),
  ]
}

function apartment(): Part[] {
  const parts = [
    base(), box('ivory', 0, 1.83, 0, 7.9, 3.2, 7.45), box('stucco', 0, 6.07, -0.3, 6.65, 5.6, 6.3),
    box('ivory', -0.75, 9.9, -0.92, 4.84, 2.15, 5.0), box('slate', -0.75, 11.1, -0.92, 5.1, 0.28, 5.3),
    box('glass', 0, 1.29, 3.77, 2.4, 2.0, 0.12), box('teal', 0, 2.55, 3.85, 3.3, 0.21, 0.8),
  ]
  for (const y of [4.34, 6.28, 8.2]) {
    parts.push(box('trim', 0, y - 0.76, -0.3, 6.88, 0.2, 6.6))
    for (const x of [-2.14, 0, 2.14]) {
      parts.push(box('window', x, y, 2.92, 1.48, 1.1, 0.12), box('window', x, y, -3.51, 1.48, 1.1, 0.12))
    }
    parts.push(box('window', 3.36, y, -0.35, 0.1, 1.1, 2.7), box('window', -3.36, y, -0.35, 0.1, 1.1, 2.7))
  }
  return parts
}

function hospital(): Part[] {
  return [
    base(), box('ivory', 0, 2.45, -0.4, 8.1, 4.4, 6.45),
    box('trim', 0, 5.57, -0.63, 7.55, 1.9, 5.85), box('slate', 0, 6.55, -0.63, 7.92, 0.28, 6.2),
    box('glass', 0, 1.28, 2.88, 3, 2.04, 0.2), box('hospital', 0, 2.45, 3.18, 4.25, 0.23, 1.49),
    box('trim', 0, 5.08, 2.4, 2.05, 2.04, 0.22),
    box('hospital', 0, 5.08, 2.55, 1.43, 0.42, 0.14), box('hospital', 0, 5.08, 2.55, 0.42, 1.43, 0.14),
    ...[-2.68, 2.68].map(x => box('window', x, 3.69, 2.88, 1.69, 1.0, 0.17)),
    ...[-4.08, 4.08].map(x => box('window', x, 3.5, -0.25, 0.17, 1.1, 3.9)),
    box('window', 0, 3.73, -3.69, 5.3, 1.04, 0.18),
  ]
}

const bushing = (x: number, y: number, z: number) => [
  cylinder('steel', x, y - 0.42, z, 0.38, 1.1),
  ...[-0.69, -0.46, -0.23].map(dy => cylinder('porcelain', x, y + dy, z, 0.74, 0.12)),
  cylinder('dark', x, y, z, 0.31, 0.2),
]
const endpoint = (y: number) => [
  box('dark', 0, y - 0.23, 0, 0.52, 0.38, 0.51),
  cylinder('porcelain', 0, y - 0.08, 0, 0.7, 0.17),
]
const powerModels: Record<'gen-gas' | 'gen-hidro' | 'gen-solar' | 'trafo' | 'sub', Part[]> = {
  'gen-gas': [
    base(), box('teal', 0, 1.9, 0, 6.7, 3.35, 5.96), box('steel', 0, 3.62, 0, 7.15, 0.28, 6.35),
    box('slate', 0, 1.6, 3.03, 4.7, 1.82, 0.16), box('metal', 0, 0.55, 3.06, 5.8, 0.26, 0.18),
    ...[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map(x => box('metal', x, 1.62, 3.15, 0.19, 1.4, 0.13)),
    ...[-2, 2].flatMap(x => [cylinder('slate', x, 4.98, -1.41, 1.12, 2.45), cylinder('orange', x, 6.2, -1.41, 1.25, 0.34)]), ...endpoint(4.65),
  ],
  'gen-hidro': [
    base(), box('water', 0, 0.38, 0, 7.1, 0.34, 7.2), box('teal', 0, 1.8, -1.1, 5.5, 2.9, 4.8),
    box('steel', 0, 3.3, -1.1, 5.8, 0.3, 5.0), box('metal', 0, 1.68, 1.32, 4.02, 2.15, 0.15),
    ...[-2.18, 0, 2.18].map(x => cylinder('slate', x, 1.2, 2.20, 1.24, 2.04, Math.PI / 2)),
    ...endpoint(3.55),
  ],
  'gen-solar': [
    base(), box('steel', 0, 0.6, 0, 5.2, 0.62, 5.5),
    ...[-2.1, 2.1].flatMap(x => [
      cylinder('steel', x, 1.42, 0, 0.55, 2.15),
      box('dark', x, 2.7, 0, 3.47, 0.24, 5.86, -0.31),
      box('solar', x, 2.86, -0.045, 3.22, 0.11, 5.6, -0.31),
      ...[-0.99, 0, 0.99].map(dx => box('metal', x + dx, 2.95, -0.07, 0.045, 0.05, 5.52, -0.31)),
    ]), ...endpoint(2.2),
  ],
  trafo: [
    base(), box('teal', 0, 1.45, 0, 4.9, 2.45, 4.4), box('metal', 0, 2.75, 0, 5.22, 0.28, 4.72),
    ...[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].flatMap(x => [-2.35, 2.35].map(z => box('steel', x, 1.55, z, 0.23, 1.98, 0.53))),
    ...[-1.46, 0, 1.46].flatMap(x => bushing(x, 4, 0)), box('orange', 0, 2.62, 2.36, 2.36, 0.29, 0.15),
  ],
  sub: [
    base(), box('slate', 0, 0.76, 0, 6.95, 1.07, 6.65), box('metal', 0, 1.37, 0, 7.05, 0.24, 6.78),
    ...[-2.24, 0, 2.24].flatMap(x => [
      box('teal', x, 2.45, -1.35, 1.34, 2.1, 1.7),
      ...bushing(x, 4.55, -1.35), ...bushing(x, 3.24, 1.45),
    ]), box('dark', 0, 4.49, -1.34, 5.3, 0.1, 0.23), ...endpoint(4.55),
  ],
}

type Batch = 'foundation' | 'fixture' | 'window'

function batches(parts: Part[]) {
  // Cores por vértice mantêm o acabamento de cada peça com uma única chamada para a estrutura.
  const groups = new Map<Batch, THREE.BufferGeometry[]>()
  for (const part of parts) {
    const base = part.shape.index ? part.shape.toNonIndexed() : part.shape.clone()
    base.scale(...part.size).rotateX(part.tilt).translate(...part.position)
    const color = new THREE.Color(finishes[part.finish])
    const colors = new Float32Array(base.attributes.position.count * 3)
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i)
    base.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const finish = part.finish === 'foundation' || part.finish === 'window' ? part.finish : 'fixture'
    const group = groups.get(finish) ?? []
    group.push(base)
    groups.set(finish, group)
  }
  return Array.from(groups, ([finish, geometries]) => {
    const geometry = mergeGeometries(geometries)
    geometries.forEach(g => g.dispose())
    return { finish, geometry }
  })
}

const homes = [batches(house('ivory', 'orange', false)), batches(house('ivory', 'slate', true)), batches(house('stucco', 'teal', false))]
const tall = batches(apartment())
const clinic = batches(hospital())
const equipment = Object.fromEntries(Object.entries(powerModels).map(([name, parts]) => [name, batches(parts)])) as Record<keyof typeof powerModels, ReturnType<typeof batches>>
const heights = { 'gen-gas': 4.65, 'gen-hidro': 3.55, 'gen-solar': 2.2, trafo: 4, sub: 4.55, casa: 3.45, predio: 7.3, hospital: 5.8 }
const modelKey = (node: GNode) => node.kind === 'zone' ? node.zoneType ?? (node.volt === 110 ? 'casa' : 'predio') : node.kind === 'gen' ? `gen-${node.genType ?? 'gas'}` as const : node.kind

export const connectionHeight = (node: GNode) => heights[modelKey(node)] * DISTRICT_MODEL_SCALE[1]

export function districtParts(node: GNode) {
  const key = modelKey(node)
  if (key === 'casa') return homes[(node.id - 1 + homes.length) % homes.length] ?? homes[0]
  return key === 'predio' ? tall : key === 'hospital' ? clinic : equipment[key]
}

const modelBounds = new WeakMap<ReturnType<typeof batches>, THREE.Box3>()

export function districtBounds(node: GNode): THREE.Box3 {
  const parts = districtParts(node)
  const cached = modelBounds.get(parts)
  if (cached) return cached
  const bounds = new THREE.Box3()
  for (const { geometry } of parts) {
    if (!geometry) continue
    geometry.computeBoundingBox()
    if (geometry.boundingBox) bounds.union(geometry.boundingBox)
  }
  const scale = new THREE.Vector3(...DISTRICT_MODEL_SCALE)
  bounds.min.multiply(scale)
  bounds.max.multiply(scale)
  modelBounds.set(parts, bounds)
  return bounds
}

export function districtMaterial(finish: Batch, powered: boolean, mismatch: boolean, failed: boolean) {
  if (finish !== 'window') return painted
  return failed ? darkWindow : mismatch ? violetWindow : powered ? litWindow : unlitWindow
}
