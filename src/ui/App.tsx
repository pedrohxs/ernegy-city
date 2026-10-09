import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Scene from '../render/Scene'
import PostFX from '../render/PostFX'
import { QUALITY } from '../render/art'
import { Speed, Tool, View, useGame } from '../store/gameStore'
import { CHALLENGE_KW, GENS, GEN_ORDER, GenType, T_MAX, ZONES, ZONE_ORDER, ZoneType, levelAt } from '../data/balance'
import { ACHIEVEMENTS, MISSIONS } from '../game/missions'
import { setMuted } from '../audio/audio'
import { strings } from '../i18n/pt-BR'
import { formatClock, hourOf } from '../game/clock'
import { useSimulation } from './useSimulation'
import { Button, Panel, Select, Tooltip } from './components'
import { CodexPanel, CreditsPanel, LevelComplete, MainMenu, OptionsPanel, PauseOverlay, PostMortem } from './screens'
import { goalText } from './format'
import css from './ui.module.css'

const VIEWS: View[] = ['orbit', 'terceira', 'primeira']
const LABEL = strings.tools
const T = strings

const CATEGORIES: { name: string; tools: Tool[] }[] = [
  { name: 'Geração', tools: ['gen'] },
  { name: 'Transmissão', tools: ['sub', 'trafo'] },
  { name: 'Consumo', tools: ['zone'] },
  { name: 'Conexão', tools: ['cabo'] },
  { name: 'Edição', tools: ['move', 'del', 'sel'] },
]

function tooltipFor(t: Tool, tv: number, genType: GenType, zoneType: ZoneType): string {
  const g = GENS[genType]
  if (t === 'gen') return `${g.label}: ${g.cap} kW · R$ ${g.cost.toLocaleString('pt-BR')} · partida ${g.startup}s`
  if (t === 'sub') return 'Subestação: 300 kW · R$ 30.000 · perdas 1%'
  if (t === 'trafo') return 'Transformador: 150 kW · R$ 12.000 · 13,8 kV → 110/220 V'
  if (t === 'zone') { const z = ZONES[zoneType]; return `${z.label}: ${z.kW} kW a ${z.volt} V${z.critical ? ' · crítico!' : ''} · grátis` }
  if (t === 'cabo') return 'Cabo aéreo · R = ρL/A · cobre/alumínio'
  if (t === 'move') return 'Mover componente (sem custo)'
  if (t === 'del') return 'Demolir com reembolso de 50%'
  return 'Inspecionar componente'
}

const SHORTCUTS: [string, string][] = [
  ['Espaço', 'Pausar / retomar'], ['1 / 2 / 3', 'Velocidade 1× / 2× / 4×'], ['V', 'Trocar câmera'],
  ['P', 'Modo fotografia'], ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'], ['WASD + Shift', 'Mover / correr'],
  ['Q / E', 'Girar câmera'], ['Esc', 'Pausa'],
]

function TopBar() {
  const demand = useGame(s => s.demand), supplied = useGame(s => s.supplied), losses = useGame(s => s.losses)
  const budget = useGame(s => s.budget), mode = useGame(s => s.mode), score = useGame(s => s.score)
  const combo = useGame(s => s.combo), goalT = useGame(s => s.goalT), level = useGame(s => s.level), stars = useGame(s => s.stars)
  const challengeDone = useGame(s => s.challengeDone), event = useGame(s => s.event), msg = useGame(s => s.msg), view = useGame(s => s.view)
  const time = useGame(s => s.time), night = useGame(s => s.night)
  const serviceT = useGame(s => s.serviceT), outageT = useGame(s => s.outageT)
  const uptime = serviceT + outageT > 0 ? Math.round((100 * serviceT) / (serviceT + outageT)) : 100
  const lvl = levelAt(level)
  const target = mode === 'desafio' ? CHALLENGE_KW : lvl.target
  const hold = mode === 'desafio' ? 20 : lvl.hold
  return (
    <Panel className={css.topbar}>
      <div className={css.row}>
        <b>{T.appTitle}</b>
        <span className={css.stat}>{demand.toFixed(0)} kW demanda</span>
        <span className={css.stat} style={{ color: 'var(--color-ok)' }}>{supplied.toFixed(0)} kW atendida</span>
        <span className={css.stat} style={{ color: 'var(--color-warn)' }}>{losses.toFixed(2)} kW perdas</span>
        <span className={css.stat}>💰 {mode === 'sandbox' ? '∞' : `R$ ${budget.toFixed(0)}`}</span>
        <span className={css.stat}>⭐ {score.toFixed(0)}</span>
        <span className={css.muted}>×{combo}</span>
        <span title="Continuidade da cidade (tempo atendido)">📶 {uptime}%</span>
        <span className={css.spacer} />
        {mode === 'campanha' && <span className={css.primary}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>}
      </div>
      <div>
        <b title="Hora do jogo">{night ? '🌙' : '☀'} {formatClock(hourOf(time))}</b> · {mode === 'desafio' ? `${T.labels.challenge}: atenda ${target} kW` : `${T.labels.level} ${level} — ${lvl.title}: ${goalText(lvl)}`} ({goalT.toFixed(0)}/{hold}) {challengeDone && '🏆'} {event && <b style={{ color: 'var(--color-warn)' }}> | {event}</b>}
      </div>
      <div className={css.hint}>{view === 'orbit' ? msg : T.hints.walk}</div>
    </Panel>
  )
}

function BuildBar({ onShortcuts }: { onShortcuts: (v: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const set = useGame(s => s.set), tool = useGame(s => s.tool), genType = useGame(s => s.genType), zoneType = useGame(s => s.zoneType), tv = useGame(s => s.tv)
  const material = useGame(s => s.material), area = useGame(s => s.area), view = useGame(s => s.view), muted = useGame(s => s.muted)
  const setPaused = useGame(s => s.setPaused), speed = useGame(s => s.speed), setSpeed = useGame(s => s.setSpeed), paused = useGame(s => s.paused)
  const openOverlay = useGame(s => s.openOverlay), undo = useGame(s => s.undo), redo = useGame(s => s.redo)
  const maintenance = useGame(s => s.maintenanceOn), setMaintenance = useGame(s => s.setMaintenance)
  const quality = useGame(s => s.quality), setQuality = useGame(s => s.setQuality), togglePhoto = useGame(s => s.togglePhoto)
  return (
    <Panel style={{ top: 92, left: 0, maxWidth: 470 }}>
      <div className={css.row}>
        <Button size="sm" active={open} onClick={() => setOpen(o => !o)} title="Mostrar/ocultar construção">{open ? '▾' : '▸'} 🏗 Construir</Button>
        <Button active={paused} size="sm" onClick={() => setPaused(!paused)}>{paused ? '▶' : '⏸'}</Button>
        {([1, 2, 4] as Speed[]).map(s => <Button key={s} active={!paused && speed === s} size="sm" onClick={() => setSpeed(s)}>{s}×</Button>)}
        <Button size="sm" onClick={undo} title="Desfazer (Ctrl+Z)">↶</Button>
        <Button size="sm" onClick={redo} title="Refazer (Ctrl+Y)">↷</Button>
        <Button size="sm" active={maintenance} onClick={() => setMaintenance(!maintenance)} title="Manutenção">🛠</Button>
        <span className={css.spacer} />
        <Button size="sm" variant="ghost" onClick={() => openOverlay('options')}>⚙</Button>
        <Button size="sm" variant="ghost" onClick={() => { setMuted(!muted); set({ muted: !muted }) }}>{muted ? '🔇' : '🔊'}</Button>
        <Button size="sm" variant="ghost" onClick={() => onShortcuts(true)} title="Atalhos">⌨</Button>
      </div>
      {open && <>
        <div className={css.divider} />
        {CATEGORIES.map(cat => (
          <div className={css.row} key={cat.name} style={{ marginBottom: 4 }}>
            <span className={css.sectionTitle} style={{ width: 78, margin: 0 }}>{cat.name}</span>
            {cat.tools.map(t => (
              <Tooltip key={t} tip={tooltipFor(t, tv, genType, zoneType)}>
                <Button active={tool === t} size="sm" onClick={() => set({ tool: t, pending: null, moving: null })}>{LABEL[t]}</Button>
              </Tooltip>
            ))}
            {cat.tools.includes('gen') && <Select value={genType} onChange={v => set({ genType: v })} options={GEN_ORDER.map(g => ({ value: g, label: T.gens[g] }))} />}
            {cat.tools.includes('zone') && <Select value={zoneType} onChange={v => set({ zoneType: v })} options={ZONE_ORDER.map(z => ({ value: z, label: `${ZONES[z].label} ${ZONES[z].kW}kW` }))} />}
          </div>
        ))}
        <div className={css.divider} />
        <div className={css.row}>
          <Select value={material} onChange={v => set({ material: v })} options={[{ value: 'cobre', label: 'Cobre' }, { value: 'aluminio', label: 'Alumínio' }]} />
          <Select value={area} onChange={v => set({ area: v })} options={[16, 25, 35, 50, 70, 95].map(a => ({ value: a, label: `${a} mm²` }))} />
          {tool === 'trafo' && <Select value={tv} onChange={v => set({ tv: v })} options={[{ value: 110, label: '110 V' }, { value: 220, label: '220 V' }]} />}
          {VIEWS.map(v => <Button key={v} size="sm" active={view === v} onClick={() => set({ view: v })}>{T.views[v]}</Button>)}
          <Button size="sm" variant="ghost" onClick={togglePhoto}>📷 foto</Button>
          <Select value={quality} onChange={setQuality} options={[{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }]} />
        </div>
      </>}
    </Panel>
  )
}

function CableList() {
  const cables = useGame(s => s.cables), set = useGame(s => s.set)
  return (
    <Panel className={css.cableList}>
      <span className={css.sectionTitle}>Cabos ({cables.length})</span>
      {cables.map(c => (
        <div key={c.id} className={css.cableRow} style={{ color: c.failed ? 'var(--color-bad)' : undefined }} onClick={() => set({ sel: { type: 'cable', id: c.id } })}>
          C-{c.id} {c.material} {c.area}mm² {c.length.toFixed(0)}m {c.volt}V | I={c.current.toFixed(0)}A ΔV={c.drop.toFixed(1)}V P={(c.loss / 1000).toFixed(2)}kW T={c.temp.toFixed(0)}°C {c.failed && '— FALHA'}
        </div>
      ))}
    </Panel>
  )
}

function MissionsPanel() {
  const doneKey = useGame(s => s.done.join(','))
  const done = doneKey ? doneKey.split(',') : []
  return (
    <Panel className={css.missions}>
      <span className={css.sectionTitle}>{T.labels.missions}</span>
      {MISSIONS.map(m => <div key={m.id}>{done.includes(m.id) ? '✅' : '⬜'} {m.title}</div>)}
      <span className={css.sectionTitle}>{T.labels.achievements}</span>
      {ACHIEVEMENTS.map(a => <div key={a.id} style={{ opacity: done.includes(a.id) ? 1 : 0.4 }}>{a.title}</div>)}
    </Panel>
  )
}

function Inspector() {
  const sel = useGame(s => s.sel), nodes = useGame(s => s.nodes), cables = useGame(s => s.cables)
  const nodeV = useGame(s => s.nodeV), mismatch = useGame(s => s.mismatch)
  const repair = useGame(s => s.repair), budget = useGame(s => s.budget)
  const selN = sel?.type === 'node' ? nodes.find(n => n.id === sel.id) : null
  const selC = sel?.type === 'cable' ? cables.find(c => c.id === sel.id) : null
  if (!selN && !selC) return null
  return (
    <Panel className={css.inspector}>
      {selN && <>
        <b>{selN.zoneType ? ZONES[selN.zoneType].label : LABEL[selN.kind]} #{selN.id}{selN.genType ? ` (${T.gens[selN.genType]})` : ''}{selN.zoneType && ZONES[selN.zoneType].critical ? ' ⚕ crítico' : ''}</b>
        <div>Tensão: {(nodeV[selN.id] ?? 0).toFixed(1)} V {selN.kind === 'zone' && `(exige ${selN.volt} V)`}</div>
        {selN.cap > 0 && <div>Carga {selN.load.toFixed(0)} / {selN.cap} kW</div>}
        {selN.kind === 'gen' && <div>{selN.online ? '✅ Online' : `⏳ Partindo (${selN.startLeft.toFixed(0)}s)`}</div>}
        <div>Temp {selN.temp.toFixed(0)} °C</div>
        <div className={selN.failed ? css.bad : mismatch.includes(selN.id) ? css.warn : css.ok}>{selN.failed ? '❌ FALHA' : mismatch.includes(selN.id) ? '⚠ TENSÃO INADEQUADA' : '✓ OK'}</div>
        {selN.failed && <Button size="sm" variant="primary" onClick={() => repair(selN.id)} disabled={budget < 1}>🛠 Reparar</Button>}
      </>}
      {selC && <>
        <b>Cabo C-{selC.id}</b>
        <div>{selC.material}, {selC.area} mm², {selC.length.toFixed(0)} m</div>
        <div className={css.mono}>R = {selC.R.toFixed(3)} Ω</div>
        <div>Tensão {selC.volt} V, I = {selC.current.toFixed(0)} A</div>
        <div className={css.mono}>ΔV = R·I = {selC.drop.toFixed(1)} V</div>
        <div className={css.mono}>Perda = R·I² = {(selC.loss / 1000).toFixed(2)} kW</div>
        <div>Temp {selC.temp.toFixed(0)} / {T_MAX} °C</div>
      </>}
    </Panel>
  )
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className={css.scrim} onClick={onClose}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <h2 className={css.modalTitle}>⌨ Atalhos</h2>
        {SHORTCUTS.map(([k, d]) => <div className={css.step} key={k}><span className={css.stepKey}>{k}</span><span>{d}</span></div>)}
        <div className={css.row} style={{ marginTop: 10 }}><Button variant="primary" onClick={onClose}>Fechar</Button></div>
      </div>
    </div>
  )
}

const TUTORIAL = [T.tutorial.step1, T.tutorial.step2, T.tutorial.step3, T.tutorial.step4]

function Tutorial() {
  const hasGen = useGame(s => s.nodes.some(n => n.kind === 'gen'))
  const hasTrafo110 = useGame(s => s.nodes.some(n => n.kind === 'trafo' && n.volt === 110))
  const hasCable = useGame(s => s.cables.length >= 1)
  const allPowered = useGame(s => s.demand > 0 && s.supplied >= s.demand)
  const [step, setStep] = useState(0)
  const [hidden, setHidden] = useState(false)
  const stepDone = [hasGen, hasTrafo110, hasCable, allPowered][step]
  useEffect(() => {
    if (!stepDone || step >= TUTORIAL.length - 1) return
    const t = setTimeout(() => setStep(s => Math.min(s + 1, TUTORIAL.length - 1)), 350)
    return () => clearTimeout(t)
  }, [step, stepDone])
  if (hidden || step >= TUTORIAL.length) return null
  return (
    <>
      <div style={{ position: 'absolute', top: 92, left: -4, width: 480, height: 40, border: '2px dashed var(--color-accent)', borderRadius: 8, pointerEvents: 'none' }} />
      <Panel style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', maxWidth: 440, textAlign: 'center' }}>
        <b className={css.primary}>{T.labels2.tutorial} {step + 1}/{TUTORIAL.length}</b>
        <div style={{ margin: '4px 0' }}>{stepDone && step === TUTORIAL.length - 1 ? T.tutorial.done : TUTORIAL[step]}</div>
        <div className={css.row} style={{ justifyContent: 'center' }}>
          <Button size="sm" variant="primary" onClick={() => setStep(s => s + 1)}>{T.labels2.next}</Button>
          <Button size="sm" variant="ghost" onClick={() => setHidden(true)}>{T.labels2.skip}</Button>
        </div>
      </Panel>
    </>
  )
}

export default function App() {
  useSimulation()
  const screen = useGame(s => s.screen)
  const overlay = useGame(s => s.overlay)
  const photo = useGame(s => s.photo)
  const quality = useGame(s => s.quality)
  const paused = useGame(s => s.paused)
  const report = useGame(s => s.report)
  const levelResult = useGame(s => s.levelResult)
  const orbit = useGame(s => s.view === 'orbit')
  // Só anuncia apagão depois que a cidade já teve luz (evita "apagão" durante a construção).
  const blackout = useGame(s => s.everPowered && s.demand > 0 && s.supplied < s.demand * 0.5 && s.time > 5 && s.cables.length > 0 && s.nodes.some(n => n.kind === 'gen' && n.online))
  const [shortcuts, setShortcuts] = useState(false)
  const preset = QUALITY[quality]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target
      if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) return
      const s = useGame.getState()
      if (s.screen !== 'game') return
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); s.redo(); return }
      if (e.code === 'Escape') { if (s.overlay) s.closeOverlay(); else s.setPaused(!s.paused); return }
      if (s.overlay || s.photo) return
      if (e.code === 'Space') { e.preventDefault(); s.togglePause() }
      else if (e.code === 'Digit1') s.setSpeed(1)
      else if (e.code === 'Digit2') s.setSpeed(2)
      else if (e.code === 'Digit3') s.setSpeed(4)
      else if (e.code === 'KeyV') s.set({ view: VIEWS[(VIEWS.indexOf(s.view) + 1) % 3] })
      else if (e.code === 'KeyP') s.togglePhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ height: '100vh' }}>
      <Canvas
        shadows={preset.shadows}
        dpr={[1, preset.pixelRatio]}
        gl={{ antialias: quality === 'baixa', toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
        camera={{ position: [0, 120, 140], fov: 50 }}
      >
        <Scene />
        {(orbit || photo) && screen === 'game' && <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />}
        <PostFX />
      </Canvas>

      {screen === 'menu' && <MainMenu />}

      {screen === 'game' && !photo && (
        <>
          {blackout && <div className={css.blackout}>{T.hud.blackout}</div>}
          <TopBar />
          <BuildBar onShortcuts={setShortcuts} />
          <CableList />
          <MissionsPanel />
          <Inspector />
          <Tutorial />
        </>
      )}

      {screen === 'game' && photo && (
        <Panel style={{ top: 12, left: 12 }}>
          📷 Modo fotografia — arraste para enquadrar. <Button size="sm" variant="primary" onClick={() => useGame.getState().togglePhoto()}>Sair (P)</Button>
        </Panel>
      )}

      {overlay === 'options' && <OptionsPanel />}
      {overlay === 'credits' && <CreditsPanel />}
      {overlay === 'codex' && <CodexPanel />}
      {levelResult && <LevelComplete />}
      {paused && !overlay && !levelResult && screen === 'game' && <PauseOverlay />}
      {report && <PostMortem />}
      {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}
    </div>
  )
}
