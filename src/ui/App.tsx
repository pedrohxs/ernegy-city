import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from '../render/Scene'
import PostFX from '../render/PostFX'
import { QUALITY } from '../render/art'
import { type View, useGame } from '../store/gameStore'
import { strings } from '../i18n/pt-BR'
import { usePreferences } from './usePreferences'
import { useSimulation } from './useSimulation'
import { Button, Modal } from './components'
import { Hud } from './Hud'
import { CodexPanel, CreditsPanel, LevelComplete, MainMenu, OptionsPanel, PauseOverlay, PostMortem } from './screens'
import css from './ui.module.css'

const VIEWS: View[] = ['orbit', 'terceira', 'primeira']
const camera = { fov: 42, near: 0.5, far: 800 }
const t = strings.controls

export default function App() {
  useSimulation()
  usePreferences()
  const screen = useGame(s => s.screen)
  const overlay = useGame(s => s.overlay)
  const photo = useGame(s => s.photo)
  const quality = useGame(s => s.quality)
  const paused = useGame(s => s.paused)
  const report = useGame(s => s.report)
  const levelResult = useGame(s => s.levelResult)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const preset = QUALITY[quality]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      if (e.defaultPrevented) return
      if (e.code === 'Escape') {
        if (showShortcuts) setShowShortcuts(false)
        else if (s.overlay) s.closeOverlay()
        else if (s.report) s.set({ report: null })
        else if (s.levelResult) s.clearLevelResult()
        else if (s.screen === 'game') {
          if (s.photo) s.togglePhoto()
          else if (s.pending !== null || s.moving !== null || (!s.paused && s.tool !== 'sel')) s.set({ tool: 'sel', pending: null, moving: null, hoverNode: null })
          else s.togglePause()
        }
        return
      }
      if (s.screen !== 'game' || s.overlay || s.report || s.levelResult || showShortcuts) return
      const el = e.target
      if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (s.photo) { if (e.code === 'KeyP') s.togglePhoto(); return }
      if (e.code === 'Space' && !(el instanceof HTMLElement && el.closest('button, summary'))) { e.preventDefault(); s.togglePause() }
      if (s.paused) return
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); s.redo(); return }
      if (e.code === 'Digit1') s.setSpeed(1)
      else if (e.code === 'Digit2') s.setSpeed(2)
      else if (e.code === 'Digit3') s.setSpeed(4)
      else if (e.code === 'KeyV') s.set({ view: VIEWS[(VIEWS.indexOf(s.view) + 1) % VIEWS.length], pending: null, moving: null, hoverNode: null })
      else if (e.code === 'KeyP') s.togglePhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showShortcuts])

  useEffect(() => {
    const flush = () => {
      const s = useGame.getState()
      if (s.screen !== 'game') return
      s.setPaused(true)
      if (!s.isScenario) s.save()
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return <main className={css.game}>
    <Canvas shadows={preset.shadows} dpr={[1, preset.pixelRatio]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: 'high-performance' }}
      camera={camera}
    >
      <Scene />
      <PostFX />
    </Canvas>
    {screen === 'menu' && <MainMenu />}
    {screen === 'game' && (!photo ? <Hud onShortcuts={() => setShowShortcuts(true)} /> :
      <div className={css.photoPanel}><Button onClick={() => useGame.getState().togglePhoto()}>{t.exitPhoto}</Button></div>
    )}
    {overlay === 'options' && <OptionsPanel />}
    {overlay === 'credits' && <CreditsPanel />}
    {overlay === 'codex' && <CodexPanel />}
    {levelResult && !report && !overlay && <LevelComplete />}
    {paused && !overlay && !levelResult && !report && screen === 'game' && <PauseOverlay />}
    {report && !overlay && <PostMortem />}
    {showShortcuts && <Modal title={t.shortcuts} onClose={() => setShowShortcuts(false)}>
      {t.shortcutList.map(([key, detail]) => <div className={css.step} key={key}><kbd className={css.stepKey}>{key}</kbd><span>{detail}</span></div>)}
      <Button onClick={() => setShowShortcuts(false)}>{t.close}</Button>
    </Modal>}
  </main>
}
