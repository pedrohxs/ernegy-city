// Cliente do solver: roda em Web Worker quando disponível, com fallback síncrono.
// Mantém no máximo uma requisição em voo (o laço de simulação aguarda cada passo).
import { Cable, GNode, solve } from './engine'
import type { Res } from '../game/advance'
import { logError } from '../data/telemetry'

let worker: Worker | null = null
let pendingResolve: ((r: Res) => void) | null = null
let pendingReject: ((e: Error) => void) | null = null

function ensureWorker(): Worker | null {
  if (worker) return worker
  try {
    worker = new Worker(new URL('./solve.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<Res>) => {
      const cb = pendingResolve
      pendingResolve = pendingReject = null
      cb?.(e.data)
    }
    worker.onerror = (ev: ErrorEvent) => {
      const cb = pendingReject
      pendingResolve = pendingReject = null
      logError('worker', new Error(ev.message || 'Falha no worker de simulação'))
      cb?.(new Error(ev.message || 'Falha no worker de simulação'))
    }
  } catch {
    worker = null
  }
  return worker
}

const toRes = (r: ReturnType<typeof solve>): Res => ({ ...r, powered: [...r.powered], mismatch: [...r.mismatch] })

export function solveAsync(nodes: GNode[], cables: Cable[], mult: number, rmult = 1): Promise<Res> {
  const w = ensureWorker()
  if (!w) return Promise.resolve(toRes(solve(nodes, cables, mult, rmult)))
  return new Promise<Res>((resolve, reject) => {
    pendingResolve = resolve
    pendingReject = reject
    w.postMessage({ nodes, cables, mult, rmult })
  })
}
