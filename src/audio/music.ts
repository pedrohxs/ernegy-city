const BEAT = 60 / 70
const BAR = 4 * BEAT
const SAMPLE_RATE = 24000

// Frases curtas em dó maior, com espaço entre as notas para os sons da cidade.
const SCORE = [
  { chord: [60, 64, 67], melody: [[0.65, 72], [2, 76], [3.15, 79]] },
  { chord: [55, 59, 62], melody: [[0.75, 74], [2.4, 71]] },
  { chord: [57, 60, 64], melody: [[0.55, 72], [1.95, 76], [3.15, 74]] },
  { chord: [53, 57, 60], melody: [[0.75, 69], [2.25, 72]] },
  { chord: [60, 64, 67], melody: [[0.65, 76], [2.15, 79]] },
  { chord: [55, 59, 62], melody: [[0.8, 74], [2.5, 67]] },
  { chord: [53, 57, 60], melody: [[0.55, 69], [2.1, 72], [3.15, 76]] },
  { chord: [60, 64, 67], melody: [[0.9, 72]] },
]

function note(
  context: OfflineAudioContext, output: AudioNode, pitch: number, start: number,
  duration: number, peak: number, type: 'sine' | 'triangle',
) {
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12)
  const envelope = context.createGain()
  envelope.gain.setValueAtTime(0, start)
  envelope.gain.linearRampToValueAtTime(peak, start + 0.07)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration - 0.04)
  envelope.gain.linearRampToValueAtTime(0, start + duration)
  oscillator.connect(envelope)
  envelope.connect(output)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

export async function playMusic(context: AudioContext, output: AudioNode): Promise<void> {
  // Renderiza a faixa uma vez para que a reprodução siga o relógio de áudio.
  const score = new OfflineAudioContext(1, Math.ceil(SCORE.length * BAR * SAMPLE_RATE), SAMPLE_RATE)
  const softening = score.createBiquadFilter()
  softening.type = 'lowpass'
  softening.frequency.value = 1350
  softening.connect(score.destination)

  for (const [bar, phrase] of SCORE.entries()) {
    const start = bar * BAR
    phrase.chord.forEach((pitch, i) => note(score, softening, pitch, start + (0.22 + i * 0.28) * BEAT, 1.35, 0.021 - i * 0.003, 'sine'))
    phrase.melody.forEach(([beat, pitch], i) => note(score, softening, pitch, start + beat * BEAT, 0.92, i === 0 ? 0.053 : 0.043, 'triangle'))
  }

  const buffer = await score.startRendering()
  if (context.state === 'closed') return
  const track = context.createBufferSource()
  track.buffer = buffer
  track.loop = true
  track.connect(output)
  track.start()
}
