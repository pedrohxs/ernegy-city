import { create } from 'zustand'
import { CHALLENGE_BUDGET, COST, GENS, GenType, levelAt, MAINTENANCE_COST, PRICE, REFUND, REPAIR_FRACTION, SANDBOX_BUDGET, T_AMB, ZONES, ZoneType } from '../data/balance'
import { Cable, GNode, Kind, Material, makeNode, resistance } from '../electrical/engine'
import { solveAsync } from '../electrical/solveService'
import { Res, advance } from '../game/advance'
import { SCENARIOS } from '../game/scenarios'
import { buildSeedCity } from '../game/city'
import { SaveSource, loadSlot, migrateLegacy, saveSlot } from '../data/save'
import { logError } from '../data/telemetry'
import { strings } from '../i18n/pt-BR'
import type { Quality } from '../render/art'

export interface Volumes { master: number; music: number; sfx: number; ambient: number }
export type VolumeBus = keyof Volumes

export type BuildTool = Kind
export type Tool = BuildTool | 'cabo' | 'del' | 'sel' | 'move'
export type View = 'orbit' | 'terceira' | 'primeira'
export type Mode = 'campanha' | 'sandbox' | 'desafio'
export type Speed = 1 | 2 | 4
export type Screen = 'menu' | 'game'
export type Overlay = 'options' | 'credits' | 'codex'
export interface LevelResult { level: number; stars: number; supply: number; spend: number }
export interface Report { title: string; lines: string[]; fixes: string[]; target?: { type: 'node' | 'cable'; id: number } }
export interface Sel { type: 'node' | 'cable'; id: number }
export interface Snapshot { nodes: GNode[]; cables: Cable[]; budget: number; nextId: number }

export interface S {
  nodes: GNode[]; cables: Cable[]; powered: number[]; mismatch: number[]; nodeV: Record<number, number>
  view: View; night: boolean; muted: boolean
  tool: Tool; genType: GenType; zoneType: ZoneType; material: Material; area: number; tv: number; pending: number | null; moving: number | null; sel: Sel | null
  budget: number; msg: string; nextId: number; report: Report | null; codex: boolean
  score: number; level: number; stars: number; totalStars: number; combo: number; calm: number; goalT: number; time: number; mult: number; rmult: number
  demand: number; supplied: number; losses: number; event: string
  spikeT: number; stormT: number; eventT: number; eventIdx: number; maintenanceOn: boolean
  mode: Mode; done: string[]; challengeDone: boolean; everPowered: boolean
  serviceT: number; outageT: number; criticalT: number
  paused: boolean; speed: Speed; slot: number; lastSave: number; simError: string
  quality: Quality; photo: boolean; volumes: Volumes
  screen: Screen; overlay: Overlay | null; sensitivity: number; levelResult: LevelResult | null
  past: Snapshot[]; future: Snapshot[]
  set: (p: Partial<S>) => void
  setQuality: (q: Quality) => void
  setVolume: (bus: VolumeBus, v: number) => void
  togglePhoto: () => void
  newGame: (m: Mode) => void
  continueGame: () => void
  setScreen: (s: Screen) => void
  openOverlay: (o: Overlay) => void
  closeOverlay: () => void
  setSensitivity: (v: number) => void
  clearLevelResult: () => void
  loadScenario: (id: string) => void
  setMode: (m: Mode) => void
  setPaused: (p: boolean) => void; setSpeed: (s: Speed) => void; togglePause: () => void
  place: (x: number, z: number) => void
  clickNode: (id: number) => void
  undo: () => void; redo: () => void
  repair: (id: number) => void; repairCable: (id: number) => boolean; removeCable: (id: number) => boolean
  setMaintenance: (on: boolean) => void
  stepSim: (dt: number) => Promise<void>
  save: (slot?: number) => boolean; load: (slot?: number) => void; reset: () => void
}

const AUTOSAVE_EVERY = 5
const DEFAULT_SLOT = 0
const MIN_DIST = 9 // bloqueio de sobreposição entre construções (modelos ocupam ~8-11 u)
const HISTORY_LIMIT = 50

const init = {
  nodes: [] as GNode[], cables: [] as Cable[], powered: [] as number[], mismatch: [] as number[], nodeV: {} as Record<number, number>,
  budget: levelAt(1).budget, nextId: 1, score: 0, level: 1, stars: 0, totalStars: 0, combo: 1, calm: 0, goalT: 0, time: 0, mult: 1, rmult: 1,
  demand: 0, supplied: 0, losses: 0, event: '', spikeT: 0, stormT: 0, eventT: 0, eventIdx: 0, maintenanceOn: false,
  report: null as Report | null, sel: null as Sel | null, pending: null as number | null, moving: null as number | null,
  msg: 'Coloque um gerador (13,8 kV).', mode: 'campanha' as Mode, done: [] as string[], challengeDone: false, everPowered: false, serviceT: 0, outageT: 0, criticalT: 0, simError: '',
  past: [] as Snapshot[], future: [] as Snapshot[],
}

const nodeCost = (n: GNode): number => (n.kind === 'gen' && n.genType ? GENS[n.genType].cost : COST[n.kind] ?? 0)
const snap = (s: S): Snapshot => ({ nodes: s.nodes, cables: s.cables, budget: s.budget, nextId: s.nextId })
const withHistory = (s: S): Pick<S, 'past' | 'future'> => ({ past: [...s.past, snap(s)].slice(-HISTORY_LIMIT), future: [] })

export const useGame = create<S>((set, get) => ({
  ...init, view: 'orbit', night: false, muted: false, tool: 'gen', genType: 'gas', zoneType: 'casa', material: 'cobre', area: 35, tv: 110,
  codex: false, paused: false, speed: 1, slot: DEFAULT_SLOT, lastSave: 0,
  quality: 'media', photo: false, volumes: { master: 0.8, music: 0.5, sfx: 0.8, ambient: 0.6 },
  screen: 'menu', overlay: null, sensitivity: 1, levelResult: null,
  set: p => set(p),
  setQuality: q => set({ quality: q }),
  setVolume: (bus, v) => set(s => ({ volumes: { ...s.volumes, [bus]: v } })),
  togglePhoto: () => set(s => ({ photo: !s.photo })),
  newGame: m => { get().setMode(m); set({ screen: 'game', overlay: null, levelResult: null }) },
  continueGame: () => { migrateLegacy(); const has = loadSlot(get().slot); if (has) get().load(); else get().setMode('campanha'); set({ screen: 'game', overlay: null, levelResult: null }) },
  setScreen: s => set({ screen: s }),
  openOverlay: o => set({ overlay: o }),
  closeOverlay: () => set({ overlay: null }),
  setSensitivity: v => set({ sensitivity: v }),
  clearLevelResult: () => set({ levelResult: null }),
  loadScenario: id => {
    const sc = SCENARIOS[id]
    if (!sc) return
    const { nodes, cables } = sc.build()
    const ids = [...nodes.map(n => n.id), ...cables.map(c => c.id)]
    set({ ...init, nodes, cables, nextId: Math.max(1, ...ids) + 1, budget: SANDBOX_BUDGET, mode: 'sandbox', screen: 'game', overlay: null, paused: false, lastSave: 0, levelResult: null, msg: `Cenário: ${sc.title}` })
  },
  setMode: m => {
    const seed = m === 'sandbox' ? { nodes: [], nextId: 1 } : buildSeedCity()
    set({
      ...init, paused: false, mode: m, nodes: seed.nodes, nextId: seed.nextId, lastSave: 0, levelResult: null,
      budget: m === 'sandbox' ? SANDBOX_BUDGET : m === 'desafio' ? CHALLENGE_BUDGET : levelAt(1).budget,
      msg: m === 'sandbox' ? `Modo ${m}. Coloque um gerador.` : 'Bairro sem energia: alimente as casas para começar.',
    })
  },
  setPaused: p => set({ paused: p }),
  setSpeed: s => set({ speed: s, paused: false }),
  togglePause: () => set({ paused: !get().paused }),
  place: (x, z) => {
    const s = get(), k = s.tool
    if (k === 'move') {
      if (s.moving === null) return
      if (s.nodes.some(n => n.id !== s.moving && Math.hypot(n.x - x, n.z - z) < MIN_DIST)) return set({ msg: 'Espaço ocupado: escolha outra célula.', moving: null })
      return set({ ...withHistory(s), nodes: s.nodes.map(n => (n.id === s.moving ? { ...n, x, z } : n)), moving: null, msg: 'Componente movido.' })
    }
    if (k !== 'gen' && k !== 'sub' && k !== 'trafo' && k !== 'zone') return
    if (s.nodes.some(n => Math.hypot(n.x - x, n.z - z) < MIN_DIST)) return set({ msg: 'Espaço ocupado: escolha outra célula.' })
    const cost = k === 'gen' ? GENS[s.genType].cost : COST[k]
    if (cost > s.budget) return set({ msg: 'Orçamento insuficiente.' })
    let node = makeNode(s.nextId, k, x, z, s.tv)
    if (k === 'gen') {
      const spec = GENS[s.genType]
      node = { ...node, cap: spec.cap, genType: s.genType, online: spec.startup <= 0, startLeft: spec.startup }
    } else if (k === 'zone') {
      const spec = ZONES[s.zoneType]
      node = { ...node, volt: spec.volt, kW: spec.kW, zoneType: s.zoneType }
    }
    set({ ...withHistory(s), nodes: [...s.nodes, node], budget: s.budget - cost, nextId: s.nextId + 1, msg: `${k} criado.` })
  },
  clickNode: id => {
    const s = get()
    if (s.tool === 'sel') return set({ sel: { type: 'node', id } })
    if (s.tool === 'del') {
      const n = s.nodes.find(n => n.id === id)
      if (!n) return
      const refund = Math.round(nodeCost(n) * REFUND)
      return set({ ...withHistory(s), nodes: s.nodes.filter(x => x.id !== id), cables: s.cables.filter(c => c.a !== id && c.b !== id), budget: s.budget + refund, sel: null, msg: `Demolido ${n.kind} #${n.id} (+R$ ${refund}).` })
    }
    if (s.tool === 'move') {
      if (s.moving === null) return set({ moving: id, msg: 'Clique no destino.' })
      if (s.moving === id) return set({ moving: null, msg: '' })
      return set({ moving: id, msg: 'Clique no destino.' })
    }
    if (s.tool !== 'cabo') return
    if (s.pending === null) return set({ pending: id, msg: 'Selecione o destino.' })
    if (s.pending === id || s.cables.some(c => (c.a === id && c.b === s.pending) || (c.b === id && c.a === s.pending))) return set({ pending: null })
    const a = s.nodes.find(n => n.id === s.pending), b = s.nodes.find(n => n.id === id)
    if (!a || !b) return set({ pending: null })
    const length = Math.hypot(a.x - b.x, a.z - b.z), cost = length * PRICE[s.material] * (s.area / 35)
    if (cost > s.budget) return set({ msg: `Custo R$ ${cost.toFixed(0)} > orçamento.`, pending: null })
    const R = resistance(s.material, length, s.area)
    set({ ...withHistory(s), cables: [...s.cables, { id: s.nextId, a: a.id, b: b.id, material: s.material, area: s.area, length, R, cost, current: 0, volt: 220, drop: 0, loss: 0, temp: T_AMB, failed: false }],
      budget: s.budget - cost, nextId: s.nextId + 1, pending: null, msg: `Cabo ${length.toFixed(0)} m: R = ρL/A = ${R.toFixed(3)} Ω, R$ ${cost.toFixed(0)}` })
  },
  undo: () => { const s = get(); if (!s.past.length) return; const prev = s.past[s.past.length - 1], cur = snap(s); set({ ...prev, past: s.past.slice(0, -1), future: [cur, ...s.future], sel: null, pending: null, moving: null, msg: 'Desfeito.' }) },
  redo: () => { const s = get(); if (!s.future.length) return; const [next, ...rest] = s.future; set({ ...next, past: [...s.past, snap(s)], future: rest, sel: null, pending: null, moving: null, msg: 'Refeito.' }) },
  repair: id => {
    const s = get(), n = s.nodes.find(n => n.id === id)
    if (!n || !n.failed) return
    const cost = Math.round(nodeCost(n) * REPAIR_FRACTION)
    if (cost > s.budget) return set({ msg: `Reparo custa R$ ${cost} > orçamento.` })
    const spec = n.kind === 'gen' && n.genType ? GENS[n.genType] : null
    set({ ...withHistory(s), budget: s.budget - cost, sel: null, msg: `Reparado ${n.kind} #${id} por R$ ${cost}.`, nodes: s.nodes.map(x => (x.id === id ? { ...x, failed: false, temp: T_AMB, load: 0, online: spec ? spec.startup <= 0 : true, startLeft: spec ? spec.startup : 0 } : x)) })
  },
  repairCable: id => {
    const s = get(), c = s.cables.find(c => c.id === id)
    if (!c) return false
    if (!c.failed) { set({ msg: strings.report.cableNotFailed }); return false }
    const cost = Math.round(c.cost * REPAIR_FRACTION)
    if (cost > s.budget) { set({ msg: `Reparo do cabo C-${id} custa R$ ${cost} > orçamento.` }); return false }
    set({
      ...withHistory(s), budget: s.budget - cost,
      report: s.report?.target?.type === 'cable' && s.report.target.id === id ? null : s.report,
      msg: `Cabo C-${id} reparado por R$ ${cost}. Alivie a carga para não queimar de novo.`,
      cables: s.cables.map(x => (x.id === id ? { ...x, failed: false, temp: T_AMB, current: 0, loss: 0, drop: 0 } : x)),
    })
    return true
  },
  removeCable: id => {
    const s = get(), c = s.cables.find(c => c.id === id)
    if (!c) return false
    const refund = Math.round(c.cost * REFUND)
    set({
      ...withHistory(s), budget: s.budget + refund,
      cables: s.cables.filter(x => x.id !== id),
      sel: s.sel?.type === 'cable' && s.sel.id === id ? null : s.sel,
      report: s.report?.target?.type === 'cable' && s.report.target.id === id ? null : s.report,
      msg: `Cabo C-${id} removido (+R$ ${refund}).`,
    })
    return true
  },
  setMaintenance: on => set({ maintenanceOn: on, msg: on ? `Manutenção ativa: R$ ${(MAINTENANCE_COST * 60).toFixed(0)}/min por componente.` : 'Manutenção desativada.' }),
  stepSim: async dt => {
    const s = get()
    try {
      const r = await solveAsync(s.nodes, s.cables, s.mult, s.rmult)
      set({ ...advance(get(), r as Res, dt), simError: '' })
      const after = get()
      if (after.time - after.lastSave >= AUTOSAVE_EVERY) {
        set({ lastSave: after.time })
        const slot = after.slot
        setTimeout(() => { try { saveSlot(slot, source(get())) } catch { /* ignore */ } }, 0)
      }
    } catch (e) {
      logError('stepSim', e)
      set({ simError: e instanceof Error ? e.message : 'Falha na simulação.' })
    }
  },
  save: slot => {
    const s = get(), n = slot ?? s.slot
    const ok = saveSlot(n, source(s))
    set({ slot: n, lastSave: s.time, msg: ok ? `Jogo salvo no slot ${n}.` : 'Falha ao salvar.' })
    return ok
  },
  load: slot => {
    migrateLegacy()
    const n = slot ?? get().slot
    const d = loadSlot(n)
    if (!d) return set({ msg: `Slot ${n} vazio ou corrompido.` })
    set({
      ...d, view: d.view ?? get().view, slot: n, lastSave: d.time, paused: false, simError: '',
      report: null, sel: null, pending: null, moving: null, levelResult: null, overlay: null, photo: false,
      past: [], future: [], combo: 1, calm: 0, demand: 0, supplied: 0, losses: 0,
      powered: [], mismatch: [], nodeV: {}, event: '', spikeT: 0, stormT: 0, eventT: 0, eventIdx: 0, mult: 1, rmult: 1,
      msg: `Save do slot ${n} carregado.`,
    })
  },
  reset: () => get().setMode(get().mode),
}))

const source = (s: S): SaveSource => ({
  nodes: s.nodes, cables: s.cables, budget: s.budget, nextId: s.nextId,
  score: s.score, level: s.level, time: s.time, mode: s.mode, done: s.done, view: s.view,
  serviceT: s.serviceT, outageT: s.outageT, criticalT: s.criticalT,
  stars: s.stars, totalStars: s.totalStars, challengeDone: s.challengeDone,
  everPowered: s.everPowered, maintenanceOn: s.maintenanceOn, goalT: s.goalT,
})
