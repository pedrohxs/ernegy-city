import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { AREAS, GEN_ORDER, GENS, LEVELS, ZONE_ORDER, ZONES, levelAt } from '../data/balance'
import { MISSIONS, ACHIEVEMENTS } from '../game/missions'
import { cableQuote, constructionCost } from '../game/construction'
import { expansionStep, firstLight } from '../game/firstLight'
import { campaignComplete, objective, secondsToHeat } from '../game/objectives'
import { nextAction } from '../game/diagnose'
import { formatClock, hourOf } from '../game/clock'
import { strings } from '../i18n/pt-BR'
import { useGame, type Speed, type Tool, type View } from '../store/gameStore'
import { Button, Select } from './components'
import { goalText, reais } from './format'
import { NetworkPanel } from './NetworkPanel'
import css from './ui.module.css'

const t = strings.controls
const goals = strings.objective
const hints = strings.guide
const views: View[] = ['orbit', 'terceira', 'primeira']
const symbols: Record<Tool, string> = { gen: 'ϟ', trafo: '▤', cabo: '⌁', sub: '▦', zone: '⌂', move: '↔', del: '×', sel: '◎' }
const selectTool = (tool: Tool) => useGame.getState().set({ tool, pending: null, moving: null, hoverNode: null })
const primaryTools: Tool[] = ['gen', 'trafo', 'cabo']
const moreTools: Tool[] = ['zone', 'sub']
const editTools: Tool[] = ['sel', 'move', 'del']

function Header({ onShortcuts }: { onShortcuts: () => void }) {
  const { budget, demand, supplied, mode, speed, view, time } = useGame(useShallow(s => ({
    budget: Math.floor(s.budget), demand: Math.round(s.demand), supplied: Math.round(s.supplied),
    mode: s.mode, speed: s.speed, view: s.view, time: Math.floor(s.time),
  })))
  return <header className={css.hudHeader}>
    <div className={css.brand}><span aria-hidden="true">ϟ</span><b>{strings.appTitle}</b></div>
    <div className={css.headerStats}>
      <div><small>{goals.supplied}</small><strong>{supplied}<span> / {demand} kW</span></strong></div>
      <div><small>{strings.hud.budget}</small><strong>{mode === 'sandbox' ? '∞' : reais(budget)}</strong></div>
    </div>
    <div className={css.headerControls}>
      <span className={css.clock} aria-label={t.clock}>{formatClock(hourOf(time))}</span>
      <Select label={t.speed} compact value={speed} onChange={v => useGame.getState().setSpeed(v)} options={([1, 2, 4] as Speed[]).map(value => ({ value, label: `${value}×` }))} />
      <details className={css.cameraMenu}>
        <summary>{t.camera}</summary>
        <div className={css.controlMenu}>
          {views.map(value => <Button key={value} active={view === value} onClick={e => {
            useGame.getState().set({ view: value, pending: null, moving: null, hoverNode: null })
            e.currentTarget.closest('details')?.removeAttribute('open')
          }}>{t.views[value]}</Button>)}
          <Button onClick={e => {
            const s = useGame.getState()
            s.set({ view: 'orbit', cameraReset: s.cameraReset + 1 })
            e.currentTarget.closest('details')?.removeAttribute('open')
          }}>{t.center}</Button>
          <Button onClick={() => useGame.getState().togglePhoto()}>{t.photo}</Button>
          <Button onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); onShortcuts() }}>{t.shortcuts}</Button>
        </div>
      </details>
      <Button className={css.pauseButton} variant="ghost" onClick={() => useGame.getState().setPaused(true)} aria-label={t.pause} title={t.pause}>Ⅱ</Button>
    </div>
  </header>
}

function Briefing() {
  const { mode, level, block, target, hold, goalT, event, blackout, time, guideVisible, challengeDone } = useGame(useShallow(s => {
    const spec = objective({ ...s, time: s.sampleTime })
    return {
      mode: s.mode, level: s.level, block: spec?.block, target: spec?.target, hold: spec?.hold, challengeDone: s.challengeDone,
      goalT: Math.floor(s.goalT + 1e-8), event: s.event, time: Math.floor(s.time), guideVisible: s.guideVisible,
      blackout: s.everPowered && s.demand > 0 && s.supplied < s.demand * 0.5,
    }
  }))
  const levelSpec = levelAt(level)
  const finished = mode === 'campanha' ? campaignComplete(level) : mode === 'desafio' && challengeDone
  const label = mode === 'campanha' ? goals.campaign(Math.min(level, LEVELS.length), LEVELS.length) : mode === 'sandbox' ? strings.menu.sandbox : strings.menu.challenge
  const headline = finished ? (mode === 'campanha' ? strings.result.final : strings.result.challenge) : mode === 'campanha' ? levelSpec.title : label
  const detail = finished ? goals.completed : mode === 'sandbox' ? goals.sandbox : mode === 'desafio' && target && hold ? goals.challenge(target, hold) : goalText(levelSpec)
  const blockHint = block === 'heat' ? goals.heat(Math.ceil(secondsToHeat(time))) : block === 'supply' ? goals.unmet : block ? goals[block] : goals.stable
  return <section className={css.briefing} aria-labelledby="briefing-title">
    <div className={css.briefingHead}>
      {mode === 'campanha' && <span className={css.kicker}>{label}</span>}
      <h1 id="briefing-title">{headline}</h1>
      <p>{detail}</p>
    </div>
    {hold && <div className={css.objectiveProgress}>
      <progress aria-label={goals.hold(goalT, hold)} value={goalT} max={hold} />
      <b>{goals.hold(goalT, hold)}</b>
      <span>{blockHint}</span>
    </div>}
    {guideVisible ? <Guidance /> : <Button className={css.showGuide} variant="ghost" size="sm" onClick={() => useGame.getState().set({ guideVisible: true })}>{hints.show}</Button>}
    {(blackout || event) && <div className={css.event} role="status">{blackout ? strings.hud.blackout : event}</div>}
  </section>
}

function Guidance() {
  const state = useGame(useShallow(s => ({
    nodes: s.nodes, cables: s.cables, powered: s.powered, mismatch: s.mismatch, nodeV: s.nodeV,
    demand: s.demand, supplied: s.supplied, mode: s.mode, level: s.level, tool: s.tool,
    pending: s.pending, area: s.area, material: s.material, tv: s.tv, genType: s.genType,
    view: s.view, challengeDone: s.challengeDone, losses: s.losses, time: s.sampleTime,
  })))
  let step = firstLight(state) ?? expansionStep(state)
  const issue = nextAction({ ...state, powered: new Set(state.powered), mismatch: new Set(state.mismatch) })
  if (step?.kind === 'hold' && issue.tone !== 'ok') step = null
  const goal = objective(state)
  const needExpansion = !!goal && state.demand < goal.target && issue.tone === 'ok'
  if (!step && !needExpansion && issue.tone === 'ok' && state.mode !== 'campanha') return null
  let title: string, detail: string, actionLabel: string | undefined, action: (() => void) | undefined
  if (step && 'from' in step) {
    const copy = hints[step.kind]
    title = copy.title
    detail = 'voltage' in step ? hints[step.kind].detail(step.voltage) : step.kind === 'branch' ? hints.branch.detail(step.connected, step.total) : hints.feeder.detail
    if (state.tool !== 'cabo' || state.pending !== step.from || state.area !== step.area || state.material !== 'cobre' || state.view !== 'orbit') {
      const { from, area } = step
      actionLabel = copy.action
      action = () => useGame.getState().set({ view: 'orbit', tool: 'cabo', pending: from, moving: null, area, material: 'cobre', hoverNode: null })
    }
  } else if (step?.kind === 'expandTrafo') {
    const { voltage } = step
    title = hints.expandTrafo.title(voltage)
    detail = hints.expandTrafo.detail
    if (state.tool !== 'trafo' || state.tv !== voltage || state.view !== 'orbit') {
      actionLabel = hints.expandTrafo.action(voltage)
      action = () => { selectTool('trafo'); useGame.getState().set({ view: 'orbit', tv: voltage }) }
    }
  } else if (step) {
    const copy = hints[step.kind]
    title = copy.title
    detail = copy.detail
    if (step.kind === 'gen' && (state.tool !== 'gen' || state.genType !== 'gas' || state.view !== 'orbit')) {
      actionLabel = hints.gen.action
      action = () => { selectTool('gen'); useGame.getState().set({ view: 'orbit', genType: 'gas' }) }
    }
    if (step.kind === 'trafo' && (state.tool !== 'trafo' || state.tv !== 110 || state.view !== 'orbit')) {
      actionLabel = hints.trafo.action
      action = () => { selectTool('trafo'); useGame.getState().set({ view: 'orbit', tv: 110 }) }
    }
  } else if (needExpansion) {
    title = hints.expand.title
    detail = hints.expand.detail
    actionLabel = hints.expand.action
    action = () => { selectTool('zone'); useGame.getState().set({ view: 'orbit' }) }
  } else {
    if (issue.tone === 'ok') return null
    title = issue.title
    detail = issue.fix ?? issue.detail
    const faultyCable = state.cables.find(c => c.failed)
    const fault = state.nodes.find(n => n.failed)
    const zone = state.nodes.find(n => n.kind === 'zone' && !state.powered.includes(n.id))
    if (faultyCable || fault || zone) {
      const selection = faultyCable ? { type: 'cable' as const, id: faultyCable.id } : { type: 'node' as const, id: (fault ?? zone)!.id }
      actionLabel = t.inspection
      action = () => useGame.getState().set({ sel: selection })
    }
  }
  return <div className={css.guidance}>
    <div className={css.guideCaption}><span>{hints.title}</span><button type="button" title={hints.hide} aria-label={hints.hide} onClick={() => useGame.getState().set({ guideVisible: false })}>×</button></div>
    <b>{title}</b>
    <p>{detail}</p>
    {action && <Button size="sm" variant="primary" onClick={action}>{actionLabel}</Button>}
  </div>
}

function BuildDock() {
  const { tool, view, pending, moving, genType, zoneType, area, material, tv, canUndo, canRedo, maintenanceOn } = useGame(useShallow(s => ({
    tool: s.tool, view: s.view, pending: s.pending, moving: s.moving, genType: s.genType, zoneType: s.zoneType,
    area: s.area, material: s.material, tv: s.tv, canUndo: s.past.length > 0, canRedo: s.future.length > 0, maintenanceOn: s.maintenanceOn,
  })))
  const set = useGame(s => s.set)
  if (view !== 'orbit') return <div className={css.viewHint}>{t.walkHint}</div>
  const options = tool === 'gen' ? <Select value={genType} label={t.generator} onChange={value => set({ genType: value })} options={GEN_ORDER.map(value => ({ value, label: `${GENS[value].label} · ${GENS[value].cap} kW` }))} />
    : tool === 'trafo' ? <Select value={tv} label={t.output} onChange={value => set({ tv: value })} options={[110, 220].map(value => ({ value, label: `${value} V` }))} />
      : tool === 'zone' ? <Select value={zoneType} label={t.property} onChange={value => set({ zoneType: value })} options={ZONE_ORDER.map(value => ({ value, label: `${ZONES[value].label} · ${ZONES[value].kW} kW · ${ZONES[value].volt} V` }))} />
        : tool === 'cabo' ? <>
          <Select value={material} label={t.material} onChange={value => set({ material: value })} options={[{ value: 'cobre', label: t.materials.cobre }, { value: 'aluminio', label: t.materials.aluminio }]} />
          <Select value={area} label={t.section} onChange={value => set({ area: value })} options={AREAS.map(value => ({ value, label: `${value} mm²` }))} />
        </> : null
  const isBuilding = tool === 'gen' || tool === 'trafo' || tool === 'sub' || tool === 'zone'
  const detail = isBuilding ? t.place : tool === 'cabo' ? (pending === null ? t.origin : t.destination) : tool === 'move' ? (moving === null ? t.move : t.moveTarget) : tool === 'del' ? t.remove : t.select
  const toolButton = (value: Tool) => <Button key={value} className={css.toolButton} active={tool === value} aria-pressed={tool === value} onClick={e => {
    selectTool(value)
    e.currentTarget.closest('details')?.removeAttribute('open')
  }}><span aria-hidden="true">{symbols[value]}</span>{t.equipment[value]}</Button>
  return <section className={css.dock} aria-label={t.construction}>
    {tool !== 'sel' && <div className={css.dockSetup}>
      {options}
      {isBuilding && <b>{reais(constructionCost(tool, genType))}</b>}
      <span>{detail}</span>
    </div>}
    <div className={css.dockTools}>
      {primaryTools.map(toolButton)}
      <details>
        <summary className={moreTools.includes(tool) ? css.summaryActive : undefined}>{moreTools.includes(tool) ? t.equipment[tool] : t.advanced}</summary>
        <div className={css.controlMenu}>{moreTools.map(toolButton)}</div>
      </details>
      <details>
        <summary className={tool === 'move' || tool === 'del' ? css.summaryActive : undefined}>{tool === 'move' || tool === 'del' ? t.equipment[tool] : t.editing}</summary>
        <div className={css.controlMenu}>
          {editTools.map(toolButton)}
          <Button disabled={!canUndo} onClick={() => useGame.getState().undo()}>{t.undo}</Button>
          <Button disabled={!canRedo} onClick={() => useGame.getState().redo()}>{t.redo}</Button>
          <Button active={maintenanceOn} onClick={() => useGame.getState().setMaintenance(!maintenanceOn)}>{t.maintenance}</Button>
        </div>
      </details>
    </div>
  </section>
}

function CableQuotePanel() {
  const { from, to, material, area, mult, rmult, budget, duplicate } = useGame(useShallow(s => {
    const from = s.tool === 'cabo' && s.view === 'orbit' ? s.nodes.find(n => n.id === s.pending) : undefined
    const to = from && s.hoverNode !== from.id ? s.nodes.find(n => n.id === s.hoverNode) : undefined
    return { from, to, material: s.material, area: s.area, mult: s.mult, rmult: s.rmult, budget: Math.floor(s.budget),
      duplicate: from && to && s.cables.some(c => (c.a === from.id && c.b === to.id) || (c.a === to.id && c.b === from.id)) }
  }))
  if (!from || !to) return null
  const q = cableQuote(from, to, material, area, mult, rmult)
  const text = strings.quote
  const warnings = [duplicate && strings.build.duplicate, q.cost > budget && strings.build.unaffordable, q.mismatch && text.incompatible,
    q.overheating && text.overheating, q.overcurrent && text.overcurrent(q.limit), q.voltageDrop && text.drop].filter(Boolean)
  return <aside className={css.quote}>
    <b>{text.title}</b>
    <span>{q.length.toFixed(1)} m · {reais(q.cost)} · {q.voltage.toLocaleString('pt-BR')} V · R = {q.R.toFixed(4)} Ω</span>
    {q.effectiveR !== q.R && <small>{text.estimatedR} · {q.effectiveR.toFixed(4)} Ω</small>}
    {q.current === null || q.drop === null || q.loss === null ? <small>{text.unknown}</small> : <>
      <small>{text.estimated}</small>
      <span>{q.current.toFixed(0)} A · ΔV {q.drop.toFixed(1)} V · {(q.loss / 1000).toFixed(2)} kW</span>
    </>}
    {warnings.map(warn => <small className={css.warn} key={String(warn)}>{warn}</small>)}
  </aside>
}

function Notices() {
  const [messages, setMessages] = useState<string[]>([])
  useEffect(() => useGame.subscribe((s, prev) => {
    if (s.session !== prev.session) { setMessages([]); return }
    if (s.screen !== 'game') return
    const next: string[] = []
    if (s.msg && s.msg !== prev.msg) next.push(s.msg)
    if (s.everPowered && !prev.everPowered) next.push(goals.firstLight)
    for (const mission of [...MISSIONS, ...ACHIEVEMENTS]) {
      if (mission.id === 'a1' || !s.done.includes(mission.id) || prev.done.includes(mission.id)) continue
      next.push(goals.unlocked(mission.title, mission.reward && s.mode !== 'sandbox' ? reais(mission.reward) : ''))
    }
    if (next.length) setMessages(old => [...old, ...next].slice(-3))
  }), [])
  useEffect(() => {
    if (!messages.length) return
    const timer = window.setTimeout(() => setMessages([]), 4600)
    return () => window.clearTimeout(timer)
  }, [messages])
  const simError = useGame(s => s.simError)
  return <div className={css.notices} role="status">
    {simError && <span className={css.warn}>{t.restoring}</span>}
    {messages.map((msg, i) => <span key={`${msg}-${i}`}>{msg}</span>)}
  </div>
}

export function Hud({ onShortcuts }: { onShortcuts: () => void }) {
  const session = useGame(s => s.session)
  return <div className={css.hud} key={session}>
    <Header onShortcuts={onShortcuts} />
    <Briefing />
    <NetworkPanel />
    <div className={css.bottomHud}>
      <Notices />
      <CableQuotePanel />
      <BuildDock />
    </div>
  </div>
}
