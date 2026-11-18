import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { ACHIEVEMENTS, MISSIONS } from '../game/missions'
import { REFUND, REPAIR_FRACTION, T_MAX, ZONES } from '../data/balance'
import { diagnoseCable, diagnoseNode, diagnoseZone, type Diagnosis } from '../game/diagnose'
import { useGame } from '../store/gameStore'
import { strings } from '../i18n/pt-BR'
import { Button } from './components'
import { reais } from './format'
import css from './ui.module.css'

const T = strings
const LABEL = strings.controls.equipment
const text = strings.controls

function DiagnosisBlock({ d }: { d: Diagnosis }) {
  const tone = d.tone === 'bad' ? css.bad : d.tone === 'warn' ? css.warn : d.tone === 'ok' ? css.ok : css.muted
  return (
    <div className={tone} style={{ marginTop: 6 }}>
      <b>{d.title}</b>
      <div>{d.detail}</div>
      {d.fix && <div>→ {d.fix}</div>}
    </div>
  )
}

function Inspector() {
  const sel = useGame(s => s.sel), nodes = useGame(s => s.nodes), cables = useGame(s => s.cables)
  const nodeV = useGame(s => s.nodeV), mismatch = useGame(s => s.mismatch), powered = useGame(s => s.powered)
  const resistanceMultiplier = useGame(s => s.sampleRmult)
  const repair = useGame(s => s.repair), repairCable = useGame(s => s.repairCable), removeCable = useGame(s => s.removeCable)
  const budget = useGame(s => s.budget)
  const selN = sel?.type === 'node' ? nodes.find(n => n.id === sel.id) : null
  const selC = sel?.type === 'cable' ? cables.find(c => c.id === sel.id) : null
  const cableRepairCost = selC ? Math.round(selC.cost * REPAIR_FRACTION) : 0
  const cableRefund = selC ? Math.round(selC.cost * REFUND) : 0
  const diagN = selN
    ? selN.kind === 'zone'
      ? diagnoseZone(selN, nodeV[selN.id], powered.includes(selN.id), mismatch.includes(selN.id))
      : diagnoseNode(selN, nodeV[selN.id])
    : null
  const diagC = selC ? diagnoseCable(selC) : null
  if (!selN && !selC) return null
  return (
    <div className={css.col}>
      {selN && <>
        <b>{selN.zoneType ? ZONES[selN.zoneType].label : LABEL[selN.kind]} #{selN.id}{selN.genType ? ` (${T.gens[selN.genType]})` : ''}{selN.zoneType && ZONES[selN.zoneType].critical ? ' ⚕ crítico' : ''}</b>
        <div>Tensão: {(nodeV[selN.id] ?? 0).toFixed(1)} V {selN.kind === 'zone' && `(exige ${selN.volt} V)`}</div>
        {selN.cap > 0 && <div>Carga {selN.load.toFixed(0)} / {selN.cap} kW</div>}
        {selN.kind === 'gen' && <div>{selN.online ? '✅ Online' : `⏳ Partindo (${selN.startLeft.toFixed(0)}s)`}</div>}
        <div>{selN.temp.toFixed(0)} °C · Integridade {Math.round(selN.health)}%</div>
        {diagN && <DiagnosisBlock d={diagN} />}
        {selN.failed && <Button size="sm" variant="primary" onClick={() => repair(selN.id)} disabled={budget < 1}>🛠 Reparar</Button>}
      </>}
      {selC && <>
        <b>Cabo C-{selC.id}</b>
        <div>{selC.material}, {selC.area} mm², {selC.length.toFixed(0)} m</div>
        <div className={css.mono}>R = {(selC.R * resistanceMultiplier).toFixed(4)} Ω {resistanceMultiplier !== 1 && '· Tempestade'}</div>
        <div>Tensão {selC.volt} V, I = {selC.current.toFixed(0)} A</div>
        <div className={css.mono}>ΔV = R·I = {selC.drop.toFixed(1)} V</div>
        <div className={css.mono}>Perda = R·I² = {(selC.loss / 1000).toFixed(2)} kW</div>
        <div>{selC.temp.toFixed(0)} / {T_MAX} °C · Integridade {Math.round(selC.health)}%</div>
        {diagC && <DiagnosisBlock d={diagC} />}
        <div className={css.row} style={{ marginTop: 6 }}>
          {selC.failed && (
            <Button size="sm" variant="primary" disabled={budget < cableRepairCost} title={budget < cableRepairCost ? 'Orçamento insuficiente' : undefined} onClick={() => repairCable(selC.id)}>
              🛠 {T.buttons2.repairCable} (R$ {cableRepairCost.toLocaleString('pt-BR')})
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => removeCable(selC.id)}>
            🗑 {T.buttons2.removeCable} (+R$ {cableRefund.toLocaleString('pt-BR')})
          </Button>
        </div>
      </>}
    </div>
  )
}

type Tab = 'inspection' | 'cables' | 'missions'

export function NetworkPanel() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('inspection')
  const selection = useGame(s => s.sel)
  const session = useGame(s => s.session)
  useEffect(() => { setOpen(false); setTab('inspection') }, [session])
  useEffect(() => { if (selection) { setOpen(true); setTab('inspection') } }, [selection])
  return <aside className={css.network}>
    <Button className={css.networkToggle} variant="ghost" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="network-panel">{open ? '×' : '◎'} {text.network}</Button>
    {open && <section id="network-panel" className={css.networkPanel}>
      <div className={css.networkTabs}>
        <Button active={tab === 'inspection'} onClick={() => setTab('inspection')}>{text.inspection}</Button>
        <Button active={tab === 'cables'} onClick={() => setTab('cables')}>{text.cables}</Button>
        <Button active={tab === 'missions'} onClick={() => setTab('missions')}>{T.labels.missions}</Button>
      </div>
      {tab === 'inspection' ? (selection ? <Inspector /> : <p className={css.muted}>{text.noSelection}</p>) : tab === 'cables' ? <CableDirectory /> : <MissionDirectory />}
      <NetworkStats />
    </section>}
  </aside>
}

function CableDirectory() {
  const cables = useGame(s => s.cables)
  const select = (id: number) => useGame.getState().set({ sel: { type: 'cable', id } })
  if (!cables.length) return <p className={css.muted}>{text.noCables}</p>
  return <div className={css.directory}>
    {cables.map(c => <Button key={c.id} onClick={() => select(c.id)} variant="ghost" className={c.failed ? css.bad : undefined}>
      <strong>C-{c.id}</strong><span>{c.area} mm² · {Math.round(c.temp)} °C · {Math.round(c.current)} A</span>
    </Button>)}
  </div>
}

function MissionDirectory() {
  const done = useGame(s => s.done)
  const mode = useGame(s => s.mode)
  return <div className={css.directory}>
    {MISSIONS.map(m => <div key={m.id} className={css.missionRow}><span className={done.includes(m.id) ? css.ok : css.muted}>{done.includes(m.id) ? '✓' : '○'} {m.title}</span>{mode !== 'sandbox' && <small>{reais(m.reward)}</small>}</div>)}
    <span className={css.sectionTitle}>{T.labels.achievements}</span>
    {ACHIEVEMENTS.map(a => <div key={a.id} className={done.includes(a.id) ? css.ok : css.muted}>{a.title}</div>)}
  </div>
}

function NetworkStats() {
  const { losses, continuity, stars } = useGame(useShallow(s => ({
    losses: Math.round(s.losses * 100) / 100,
    continuity: s.serviceT + s.outageT ? Math.round(100 * s.serviceT / (s.serviceT + s.outageT)) : null,
    stars: s.mode === 'campanha' ? s.totalStars : null,
  })))
  return <div className={css.networkStats}>
    <span>{T.hud.losses} <b>{losses.toFixed(2)} kW</b></span>
    <span>{T.objective.continuity} <b>{continuity === null ? '—' : continuity + '%'}</b></span>
    {stars !== null && <span>{T.objective.stars} <b>{stars}</b></span>}
  </div>
}
