import { Cable, GNode, solve } from './engine'
// Cálculo elétrico fora da thread principal (Etapa 7).
self.onmessage = (e: MessageEvent<{ nodes: GNode[]; cables: Cable[]; mult: number; rmult: number }>) => {
  const r = solve(e.data.nodes, e.data.cables, e.data.mult, e.data.rmult)
  ;(self as unknown as Worker).postMessage({ ...r, powered: [...r.powered], mismatch: [...r.mismatch] })
}
