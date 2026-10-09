// Laço de simulação com passo fixo (10 Hz), desacoplado da taxa de quadros.
// O acumulador converte tempo real × escala em passos fixos; a renderização
// acontece a cada quadro via onFrame. Sem setInterval.
export const FIXED_STEP = 0.1 // s — 10 Hz
export const MAX_STEPS_PER_FRAME = 5
export const MAX_ACC = FIXED_STEP * MAX_STEPS_PER_FRAME
const MAX_REAL_DT = 0.25 // evita "espiral da morte" após aba em segundo plano

export interface LoopOptions {
  step: (dt: number) => Promise<void> | void
  getScale: () => number
  onFrame?: (realDt: number, scale: number) => void
  onError?: (e: unknown) => void
  now?: () => number
  schedule?: (cb: (t: number) => void) => number
  cancel?: (h: number) => void
}

export class SimulationLoop {
  private acc = 0
  private last = 0
  private handle: number | null = null
  private stepping = false
  private running = false

  constructor(private readonly o: LoopOptions) {}

  private now(): number {
    return this.o.now ? this.o.now() : performance.now()
  }

  private schedule(cb: (t: number) => void): number {
    return this.o.schedule ? this.o.schedule(cb) : requestAnimationFrame(cb)
  }

  private cancel(handle: number): void {
    if (this.o.cancel) this.o.cancel(handle)
    else cancelAnimationFrame(handle)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.last = this.now()
    this.handle = this.schedule(this.frame)
  }

  stop(): void {
    this.running = false
    if (this.handle !== null) this.cancel(this.handle)
    this.handle = null
  }

  private frame = (t: number): void => {
    if (!this.running) return
    const realDt = Math.min(MAX_REAL_DT, Math.max(0, (t - this.last) / 1000))
    this.last = t
    const scale = Math.max(0, this.o.getScale())
    if (scale > 0) this.acc = Math.min(MAX_ACC, this.acc + realDt * scale)
    this.o.onFrame?.(realDt, scale)
    void this.pump()
    this.handle = this.schedule(this.frame)
  }

  private async pump(): Promise<void> {
    if (this.stepping) return
    this.stepping = true
    try {
      let n = 0
      while (this.acc >= FIXED_STEP && n < MAX_STEPS_PER_FRAME) {
        this.acc -= FIXED_STEP
        try {
          await this.o.step(FIXED_STEP)
        } catch (e) {
          this.o.onError?.(e)
        }
        n++
      }
    } finally {
      this.stepping = false
    }
  }
}
