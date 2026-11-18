import { useState } from 'react'
import { useGame, type Mode } from '../store/gameStore'
import { levelAt, LEVELS, REFUND, REPAIR_FRACTION } from '../data/balance'
import { SLOT_COUNT, slotSummary } from '../data/save'
import { clearLogs, getLogs, logCount } from '../data/telemetry'
import { strings } from '../i18n/pt-BR'
import { goalText } from './format'
import { Button, Modal, Range, Select, Stars } from './components'
import css from './ui.module.css'

export function MainMenu() {
  const newGame = useGame(s => s.newGame), continueGame = useGame(s => s.continueGame), openOverlay = useGame(s => s.openOverlay)
  const slot = useGame(s => s.slot), set = useGame(s => s.set), save = useGame(s => s.save)
  const [confirm, setConfirm] = useState<Mode | null>(null)
  const summaries = Array.from({ length: SLOT_COUNT }, (_, i) => slotSummary(i))
  const t = strings.menu
  const hasSave = !summaries[slot].empty

  const start = (m: Mode) => {
    if (!summaries[slot].empty) return setConfirm(m)
    newGame(m)
    save()
  }

  return (
    <>
      <div className={css.menu}>
        <div className={css.menuCard}>
          <div className={css.menuMark} aria-hidden="true">ϟ</div>
          <h1 className={css.logo}>{strings.appTitle}</h1>
          <p className={css.logoSub}>{t.pitch}</p>
          <div className={css.menuMain}>
            {hasSave && <Button variant="primary" size="lg" onClick={continueGame}>{t.resume}<span aria-hidden="true">→</span></Button>}
            <Button variant={hasSave ? undefined : 'primary'} size="lg" onClick={() => start('campanha')}>{t.newCampaign}<span aria-hidden="true">→</span></Button>
            <div className={css.menuModes}>
              <Button onClick={() => start('sandbox')}>{t.sandbox}</Button>
              <Button onClick={() => start('desafio')}>{t.challenge}</Button>
            </div>
          </div>
          <div className={css.menuSlots} aria-label={t.slots}>
            <small>{t.slots}</small>
            <div className={css.row}>
              {summaries.map((s, i) => (
                <Button key={i} active={slot === i} aria-pressed={slot === i} onClick={() => set({ slot: i })}
                  title={s.empty ? t.empty : t.saved(s.level, s.nodes)}>{t.slot(i + 1)}</Button>
              ))}
            </div>
            <small>{hasSave ? (summaries[slot].level > LEVELS.length ? strings.result.final : t.saved(summaries[slot].level, summaries[slot].nodes)) : t.empty}</small>
          </div>
          <div className={css.menuLinks}>
            <Button variant="ghost" onClick={() => openOverlay('options')}>{t.options}</Button>
            <Button variant="ghost" onClick={() => openOverlay('codex')}>{t.codex}</Button>
            <Button variant="ghost" onClick={() => openOverlay('credits')}>{t.credits}</Button>
          </div>
        </div>
      </div>
      {confirm && <Modal title={t.replaceTitle} onClose={() => setConfirm(null)}>
        <p>{t.replaceBody(slot + 1)}</p>
        <div className={css.row}>
          <Button onClick={() => setConfirm(null)}>{t.cancel}</Button>
          <Button variant="primary" onClick={() => { const m = confirm; setConfirm(null); newGame(m); save() }}>{t.replace}</Button>
        </div>
      </Modal>}
    </>
  )
}

export function OptionsPanel() {
  const close = useGame(s => s.closeOverlay)
  const quality = useGame(s => s.quality), setQuality = useGame(s => s.setQuality)
  const muted = useGame(s => s.muted), set = useGame(s => s.set)
  const volumes = useGame(s => s.volumes), setVolume = useGame(s => s.setVolume)
  const sensitivity = useGame(s => s.sensitivity), setSensitivity = useGame(s => s.setSensitivity)
  return (
    <Modal title="⚙ Opções" onClose={close}>
      <div className={css.col}>
        <Select label="Qualidade gráfica" value={quality} onChange={setQuality}
          options={[{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }]} />
        <div className={css.divider} />
        <label className={css.field}><input type="checkbox" checked={muted} onChange={e => set({ muted: e.currentTarget.checked })} />{strings.controls.mute}</label>
        <Range label="Volume master" value={volumes.master} onChange={v => setVolume('master', v)} display={v => `${Math.round(v * 100)}%`} />
        <Range label="Música" value={volumes.music} onChange={v => setVolume('music', v)} display={v => `${Math.round(v * 100)}%`} />
        <Range label="Efeitos" value={volumes.sfx} onChange={v => setVolume('sfx', v)} display={v => `${Math.round(v * 100)}%`} />
        <Range label="Ambiente" value={volumes.ambient} onChange={v => setVolume('ambient', v)} display={v => `${Math.round(v * 100)}%`} />
        <div className={css.divider} />
        <Range label="Sensibilidade" value={sensitivity} onChange={setSensitivity} min={0.2} max={3} step={0.1} display={v => `${v.toFixed(1)}×`} />
        <div className={css.divider} />
        <LocalLogs />
        <div className={css.row}><Button variant="primary" onClick={close}>Fechar</Button></div>
      </div>
    </Modal>
  )
}

function LocalLogs() {
  const [count, setCount] = useState(() => logCount())
  const [open, setOpen] = useState(false)
  const logs = open ? getLogs() : []
  return (
    <div>
      <span className={css.sectionTitle}>Logs locais (nada é enviado a servidores)</span>
      <div className={css.row}>
        <span className={css.muted}>{count} falha(s) registrada(s)</span>
        <Button size="sm" onClick={() => setOpen(o => !o)} disabled={count === 0}>{open ? 'Ocultar' : 'Ver'}</Button>
        <Button size="sm" variant="danger" onClick={() => { clearLogs(); setCount(0); setOpen(false) }} disabled={count === 0}>Limpar</Button>
      </div>
      {open && <pre style={{ maxHeight: 140, overflow: 'auto', fontSize: 11, background: 'rgba(2,6,23,.6)', padding: 8, borderRadius: 5 }}>{logs.map(l => `${new Date(l.t).toLocaleTimeString()} [${l.scope}] ${l.msg}`).join('\n')}</pre>}
    </div>
  )
}

export function CreditsPanel() {
  const close = useGame(s => s.closeOverlay)
  return (
    <Modal title="ℹ Créditos" onClose={close}>
      <div className={css.col}>
        <div><b>Energy City 3D</b> — simulador didático de rede elétrica.</div>
        <div className={css.muted}>Motor elétrico, progressão, arte procedural e áudio sintetizado.</div>
        <div>Feito com React, TypeScript, three.js / React Three Fiber e zustand.</div>
        <div className={css.row}><Button variant="primary" onClick={close}>Fechar</Button></div>
      </div>
    </Modal>
  )
}

function SlotManager() {
  const slot = useGame(s => s.slot)
  const scenario = useGame(s => s.isScenario)
  const save = useGame(s => s.save), load = useGame(s => s.load)
  const setPaused = useGame(s => s.setPaused), setScreen = useGame(s => s.setScreen)
  const [note, setNote] = useState('')
  const summaries = Array.from({ length: SLOT_COUNT }, (_, i) => slotSummary(i))

  const doSave = (i: number) => {
    const ok = save(i)
    setNote(ok ? `Slot ${i + 1} salvo.` : strings.build.saveFailed)
  }

  return (
    <div className={css.col}>
      <div className={css.divider} />
      <span className={css.sectionTitle}>Salvar / carregar</span>
      {summaries.map((s, i) => (
        <div className={css.row} key={i}>
          <b style={{ width: 54 }} className={slot === i ? css.primary : undefined}>Slot {i + 1}</b>
          <span className={css.muted} style={{ flex: 1 }}>
            {s.empty ? 'vazio' : `nível ${s.level} · ${s.nodes} componentes${s.stars ? ` · ${'★'.repeat(s.stars)}` : ''}`}
          </span>
          <Button size="sm" onClick={() => doSave(i)}>Salvar</Button>
          <Button size="sm" disabled={s.empty} onClick={() => load(i)}>Carregar</Button>
        </div>
      ))}
      <Button onClick={() => { if (scenario || save()) { setPaused(false); setScreen('menu') } else setNote(strings.build.saveFailed) }}>{scenario ? strings.controls.leaveScenario : 'Salvar e sair'}</Button>
      {note && <span className={css.muted}>{note}</span>}
    </div>
  )
}

export function PauseOverlay() {
  const setPaused = useGame(s => s.setPaused), openOverlay = useGame(s => s.openOverlay), reset = useGame(s => s.reset)
  return (
    <Modal title="⏸ Pausa" wide>
      <div className={css.col}>
        <Button variant="primary" size="lg" onClick={() => setPaused(false)}>▶ Retomar</Button>
        <SlotManager />
        <Button onClick={() => openOverlay('options')}>⚙ Opções</Button>
        <Button onClick={() => openOverlay('codex')}>📐 Codex</Button>
        <Button onClick={reset}>{strings.controls.restart}</Button>
      </div>
    </Modal>
  )
}

export function LevelComplete() {
  const r = useGame(s => s.levelResult), clear = useGame(s => s.clearLevelResult)
  if (!r) return null
  const t = strings.result
  const next = r.kind === 'level' ? levelAt(r.level + 1) : null
  const title = r.kind === 'challenge' ? t.challenge : r.kind === 'final' ? t.final : t.level(r.level)
  return (
    <Modal title={title} wide>
      {r.kind !== 'challenge' && <Stars n={r.stars} />}
      <div className={css.col}>
        <div className={css.step}><span className={css.stepKey}>{t.supplied}</span><span className={css.mono}>{r.supply.toFixed(0)} kW</span></div>
        {r.kind === 'challenge' && <div className={css.step}><span className={css.stepKey}>{t.spend}</span><span className={css.mono}>R$ {r.spend.toFixed(0)}</span></div>}
        {r.kind === 'level' && <div className={css.step}><span className={css.stepKey}>{t.grant}</span><span className={css.mono}>R$ {Math.round(r.grant).toLocaleString('pt-BR')}</span></div>}
        {next ? <div className={css.step}><span className={css.stepKey}>{t.next}</span><span><b>{t.nextLevel(next)}</b><br />{goalText(next)}</span></div> : <p>{t.finished}</p>}
        <div className={css.row}><Button variant="primary" size="lg" onClick={clear}>{t.continue}</Button></div>
      </div>
    </Modal>
  )
}

export function PostMortem() {
  const report = useGame(s => s.report), set = useGame(s => s.set)
  const cables = useGame(s => s.cables), budget = useGame(s => s.budget)
  const repairCable = useGame(s => s.repairCable), removeCable = useGame(s => s.removeCable)
  if (!report) return null
  const target = report.target
  const cable = target?.type === 'cable' ? cables.find(c => c.id === target.id) ?? null : null
  const repairCost = cable ? Math.round(cable.cost * REPAIR_FRACTION) : 0
  const refund = cable ? Math.round(cable.cost * REFUND) : 0
  return (
    <Modal title={report.title} wide onClose={() => set({ report: null })}>
      <div className={css.muted}>O que aconteceu, passo a passo:</div>
      {report.lines.map((l, i) => (
        <div className={css.step} key={i}><span className={css.stepKey}>Passo {i + 1}</span><span className={css.mono}>{l}</span></div>
      ))}
      <div className={css.sectionTitle}>Como resolver</div>
      {report.fixes.map(f => <div key={f}>✓ {f}</div>)}
      {cable && (
        <div className={css.row} style={{ marginTop: 12 }}>
          {cable.failed && (
            <Button variant="primary" size="sm" disabled={budget < repairCost} title={budget < repairCost ? 'Orçamento insuficiente' : undefined} onClick={() => repairCable(cable.id)}>
              🛠 {strings.buttons2.repairCable} (R$ {repairCost.toLocaleString('pt-BR')})
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => removeCable(cable.id)}>
            🗑 {strings.buttons2.removeCable} (+R$ {refund.toLocaleString('pt-BR')})
          </Button>
        </div>
      )}
      <div className={css.row} style={{ marginTop: 12 }}><Button variant="primary" onClick={() => set({ report: null })}>Fechar</Button></div>
    </Modal>
  )
}

interface Formula { title: string; formula: string; example: string; scenario?: string }
const FORMULAS: Formula[] = [
  { title: 'Lei de Ohm', formula: 'ΔV = R · I', example: 'Cabo de 0,1 Ω com 200 A cai 20 V.', scenario: 'ohm' },
  { title: 'Resistência do condutor', formula: 'R = ρ · L / A', example: 'Cobre (ρ=0,017), 100 m, 16 mm² → 0,106 Ω.', scenario: 'ohm' },
  { title: 'Potência', formula: 'P = U · I  →  I = P / U', example: 'Zona de 20 kW em 220 V puxa ≈ 91 A.', scenario: 'ohm' },
  { title: 'Perda por efeito Joule', formula: 'P = R · I²', example: '0,1 Ω com 200 A dissipa 4 kW (vira calor).', scenario: 'loss' },
  { title: 'Cabos em paralelo', formula: '1/R_eq = Σ 1/Rₙ', example: 'Dois cabos de 0,2 Ω → 0,1 Ω e menos queda.', scenario: 'parallel' },
]

export function CodexPanel() {
  const close = useGame(s => s.closeOverlay), loadScenario = useGame(s => s.loadScenario)
  return (
    <Modal title="Codex do Engenheiro" onClose={close} wide>
        <div className={css.muted}>Fórmulas, exemplos e um cenário para experimentar. 13.800 V → trafo → 110/220 V.</div>
        {FORMULAS.map(f => (
          <div key={f.title} style={{ marginTop: 10 }}>
            <b>{f.title}</b>
            <div className={css.formula}>{f.formula}</div>
            <div className={css.example}>{f.example}</div>
            {f.scenario && <Button size="sm" variant="ghost" onClick={() => loadScenario(f.scenario!)}>▶ Tentar no jogo</Button>}
          </div>
        ))}
        <Button onClick={close}>{strings.controls.close}</Button>
    </Modal>
  )
}
