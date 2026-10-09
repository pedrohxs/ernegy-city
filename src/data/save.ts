// Persistência versionada (localStorage): valida, migra e rejeita saves corrompidos
// sem quebrar o jogo. Suporta múltiplos slots e migração do formato antigo (v1).
import type { Cable, GNode, Kind, Material } from '../electrical/engine'
import type { GenType, ZoneType } from './balance'
import { T_AMB } from './balance'

const GEN_TYPES: GenType[] = ['gas', 'hidro', 'solar']
const ZONE_TYPES: ZoneType[] = ['casa', 'predio', 'hospital']

export const SAVE_VERSION = 2
export const SLOT_COUNT = 3
export const LEGACY_KEY = 'energy-city-save'
export const slotKey = (slot: number) => `energy-city-save:slot:${slot}`

export type SaveMode = 'campanha' | 'sandbox' | 'desafio'
export type SaveView = 'orbit' | 'terceira' | 'primeira'

export interface SaveData {
  version: number
  savedAt: number
  nodes: GNode[]
  cables: Cable[]
  budget: number
  nextId: number
  score: number
  level: number
  time: number
  mode: SaveMode
  done: string[]
  view?: SaveView
  serviceT: number
  outageT: number
  criticalT: number
}

/** Campos exportáveis do estado do jogo (subset aceito pelo save). */
export interface SaveSource {
  nodes: GNode[]
  cables: Cable[]
  budget: number
  nextId: number
  score: number
  level: number
  time: number
  mode: SaveMode
  done: string[]
  view?: SaveView
  serviceT?: number
  outageT?: number
  criticalT?: number
}

const KINDS: Kind[] = ['gen', 'sub', 'trafo', 'zone']
const MATERIALS: Material[] = ['cobre', 'aluminio']
const MODES: SaveMode[] = ['campanha', 'sandbox', 'desafio']
const VIEWS: SaveView[] = ['orbit', 'terceira', 'primeira']

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (isNum(v) ? v : fallback)
const bool = (v: unknown) => v === true

export function sanitizeNode(raw: unknown): GNode | null {
  if (!isObj(raw)) return null
  const kind = raw.kind
  if (!KINDS.includes(kind as Kind)) return null
  if (!isNum(raw.id) || !isNum(raw.x) || !isNum(raw.z)) return null
  return {
    id: raw.id,
    kind: kind as Kind,
    x: raw.x,
    z: raw.z,
    kW: num(raw.kW, 0),
    volt: num(raw.volt, 220),
    cap: num(raw.cap, 0),
    temp: num(raw.temp, T_AMB),
    load: num(raw.load, 0),
    failed: bool(raw.failed),
    online: raw.online !== false,
    startLeft: num(raw.startLeft, 0),
    maintained: bool(raw.maintained),
    genType: GEN_TYPES.includes(raw.genType as GenType) ? (raw.genType as GenType) : undefined,
    zoneType: ZONE_TYPES.includes(raw.zoneType as ZoneType) ? (raw.zoneType as ZoneType) : undefined,
  }
}

export function sanitizeCable(raw: unknown): Cable | null {
  if (!isObj(raw)) return null
  if (!isNum(raw.id) || !isNum(raw.a) || !isNum(raw.b) || !isNum(raw.R)) return null
  const material = MATERIALS.includes(raw.material as Material) ? (raw.material as Material) : 'cobre'
  return {
    id: raw.id,
    a: raw.a,
    b: raw.b,
    material,
    area: num(raw.area, 35),
    length: num(raw.length, 0),
    R: raw.R,
    cost: num(raw.cost, 0),
    current: num(raw.current, 0),
    volt: num(raw.volt, 220),
    drop: num(raw.drop, 0),
    loss: num(raw.loss, 0),
    temp: num(raw.temp, T_AMB),
    failed: bool(raw.failed),
  }
}

/** Valida e migra um objeto desconhecido para o formato atual. Retorna null se inválido. */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw)) return null
  const version = isNum(raw.version) ? raw.version : 1
  if (version > SAVE_VERSION) return null // save de versão futura: não arriscar
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.cables)) return null

  const nodes = raw.nodes.map(sanitizeNode).filter((n): n is GNode => n !== null)
  if (nodes.length !== raw.nodes.length) return null // estrutura corrompida

  const ids = new Set(nodes.map(n => n.id))
  const cables = raw.cables
    .map(sanitizeCable)
    .filter((c): c is Cable => c !== null)
    .filter(c => ids.has(c.a) && ids.has(c.b)) // descarta cabos órfãos
  if (cables.length !== raw.cables.length) return null

  const mode = MODES.includes(raw.mode as SaveMode) ? (raw.mode as SaveMode) : 'campanha'
  const view = VIEWS.includes(raw.view as SaveView) ? (raw.view as SaveView) : undefined
  const done = Array.isArray(raw.done) ? raw.done.filter((d): d is string => typeof d === 'string') : []
  const minNext = Math.max(1, ...nodes.map(n => n.id + 1), ...cables.map(c => c.id + 1))

  return {
    version: SAVE_VERSION,
    savedAt: num(raw.savedAt, 0),
    nodes,
    cables,
    budget: Math.max(0, num(raw.budget, 0)),
    nextId: Math.max(num(raw.nextId, 1), minNext),
    score: num(raw.score, 0),
    level: Math.max(1, Math.floor(num(raw.level, 1))),
    time: Math.max(0, num(raw.time, 0)),
    mode,
    done,
    view,
    serviceT: Math.max(0, num(raw.serviceT, 0)),
    outageT: Math.max(0, num(raw.outageT, 0)),
    criticalT: Math.max(0, num(raw.criticalT, 0)),
  }
}

export function parseSave(text: string | null): SaveData | null {
  if (!text) return null
  try {
    return migrate(JSON.parse(text))
  } catch {
    return null
  }
}

export function serialize(s: SaveSource): string {
  const data: SaveData = {
    ...s,
    version: SAVE_VERSION,
    savedAt: Date.now(),
    serviceT: s.serviceT ?? 0,
    outageT: s.outageT ?? 0,
    criticalT: s.criticalT ?? 0,
  }
  return JSON.stringify(data)
}

export function loadSlot(slot: number): SaveData | null {
  return parseSave(localStorage.getItem(slotKey(slot)))
}

export function saveSlot(slot: number, s: SaveSource): boolean {
  try {
    localStorage.setItem(slotKey(slot), serialize(s))
    return true
  } catch {
    return false
  }
}

export function clearSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot))
}

/** Move o save antigo (chave única, sem versão) para o slot 0, se ainda não houver. */
export function migrateLegacy(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return
    if (!localStorage.getItem(slotKey(0))) localStorage.setItem(slotKey(0), legacy)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

export function slotSummary(slot: number): { empty: boolean; savedAt: number; level: number; nodes: number } {
  const d = loadSlot(slot)
  if (!d) return { empty: true, savedAt: 0, level: 0, nodes: 0 }
  return { empty: false, savedAt: d.savedAt, level: d.level, nodes: d.nodes.length }
}
