// Áudio procedural com mixer: master + música + efeitos (sfx) + ambiente.
// Sons 100% sintetizados (fallback garantido). Autoplay respeitado (inicia no 1º gesto).
export interface Mix { master: number; music: number; sfx: number; ambient: number }
const mix: Mix = { master: 0.8, music: 0.5, sfx: 0.8, ambient: 0.6 }
let muted = false

let ctx: AudioContext | null = null
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, ambBus: GainNode
let humG: GainNode, sirO: OscillatorNode, sirG: GainNode, crkG: GainNode, musicG: GainNode

function gainBus(g: GainNode, v: number) { g.gain.value = muted ? 0 : v }

export function startAudio(): void {
  if (ctx) { void ctx.resume?.(); return }
  try {
    ctx = new AudioContext()
    master = ctx.createGain(); master.connect(ctx.destination); gainBus(master, mix.master)
    musicBus = ctx.createGain(); musicBus.connect(master); gainBus(musicBus, mix.music)
    sfxBus = ctx.createGain(); sfxBus.connect(master); gainBus(sfxBus, mix.sfx)
    ambBus = ctx.createGain(); ambBus.connect(master); gainBus(ambBus, mix.ambient)
    // zumbido de trafo
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 100
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300
    humG = ctx.createGain(); humG.gain.value = 0; hum.connect(lp); lp.connect(humG); humG.connect(ambBus); hum.start()
    // sirene de apagão
    sirO = ctx.createOscillator(); sirO.type = 'sine'; sirG = ctx.createGain(); sirG.gain.value = 0
    sirO.connect(sirG); sirG.connect(ambBus); sirO.start()
    // estalos (ruído)
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000
    crkG = ctx.createGain(); crkG.gain.value = 0; noise.connect(hp); hp.connect(crkG); crkG.connect(sfxBus); noise.start()
    // trilha em loop: pad de 3 osciladores com LFO
    musicG = ctx.createGain(); musicG.gain.value = 0.12; musicG.connect(musicBus)
    const mf = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 1200; mf.connect(musicG)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.06; lfo.connect(lfoG); lfoG.connect(musicG.gain); lfo.start()
    for (const f of [110, 164.81, 220]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(mf); o.start() }
  } catch { ctx = null }
}
export function setMuted(m: boolean): void {
  muted = m
  if (!ctx) return
  gainBus(master, mix.master); gainBus(musicBus, mix.music); gainBus(sfxBus, mix.sfx); gainBus(ambBus, mix.ambient)
}
export function setVolumes(v: Partial<Mix>): void {
  Object.assign(mix, v)
  if (!ctx) return
  gainBus(master, mix.master); gainBus(musicBus, mix.music); gainBus(sfxBus, mix.sfx); gainBus(ambBus, mix.ambient)
}
export function updateAudio(a: { hum: number; siren: boolean; hot: boolean }): void {
  if (!ctx) return
  const t = ctx.currentTime
  humG.gain.setTargetAtTime(muted || a.hum <= 0 ? 0 : Math.min(0.06, 0.01 + a.hum * 0.0002), t, 0.2)
  sirG.gain.setTargetAtTime(muted || !a.siren ? 0 : 0.04, t, 0.1)
  sirO.frequency.setTargetAtTime(700 + 300 * Math.sin(t * 4), t, 0.05)
  crkG.gain.setTargetAtTime(muted || !a.hot ? 0 : 0.03 * Math.random(), t, 0.02)
}
/** Som curto de interface (clique). */
export function playClick(): void {
  startAudio(); if (!ctx || muted) return
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.03
  o.connect(g); g.connect(sfxBus); o.start(); o.stop(ctx.currentTime + 0.05)
}
/** Som de construção/colocação. */
export function playPlace(): void {
  startAudio(); if (!ctx || muted) return
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(330, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12); g.gain.value = 0.06
  o.connect(g); g.connect(sfxBus); o.start(); o.stop(ctx.currentTime + 0.15)
}
export function beep(): void {
  try {
    startAudio(); if (!ctx || muted) return
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 180; g.gain.value = 0.1
    o.connect(g); g.connect(sfxBus); o.start(); o.stop(ctx.currentTime + 0.4)
  } catch { /* sem áudio */ }
}
