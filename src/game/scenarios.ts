// Cenários mínimos do Codex ("tentar no jogo"). Independem do estado do jogador.
import { Cable, GNode, makeCable, makeNode } from '../electrical/engine'

const cab = (id: number, a: number, b: number, R: number, area = 35, length = 10): Cable => makeCable(id, a, b, 'cobre', area, length, R)

export interface Scenario { id: string; title: string; concept: string; build: () => { nodes: GNode[]; cables: Cable[] } }

export const SCENARIOS: Record<string, Scenario> = {
  ohm: {
    id: 'ohm', title: 'Queda de tensão (ΔV = R·I)',
    concept: 'Cabo de 35 mm² e 100 m: R = 0,017·100/35 ≈ 0,049 Ω. A zona de 40 kW puxa ≈ 182 A → ΔV ≈ 9 V.',
    build: () => ({
      nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'trafo', 0, 40, 220), makeNode(3, 'zone', 0, 80, 220)],
      cables: [cab(10, 1, 2, 0.01), cab(11, 2, 3, (0.017 * 100) / 35, 35, 100)],
    }),
  },
  parallel: {
    id: 'parallel', title: 'Cabos em paralelo (malha)',
    concept: 'Dois cabos de 0,15 Ω em paralelo → R_eq = 0,075 Ω: a corrente se divide e a queda cai à metade.',
    build: () => ({
      nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'trafo', 0, 40, 220), makeNode(3, 'zone', 0, 80, 220)],
      cables: [cab(10, 1, 2, 0.01), cab(11, 2, 3, 0.15, 35, 100), cab(12, 2, 3, 0.15, 35, 100)],
    }),
  },
  loss: {
    id: 'loss', title: 'Perda por efeito Joule (P = R·I²)',
    concept: 'Cabo longo e fino esquenta (perto do vermelho). Veja R, I e P na inspeção e a temperatura subir.',
    build: () => ({
      nodes: [makeNode(1, 'gen', 0, 0, 0), makeNode(2, 'trafo', 0, 40, 220), makeNode(3, 'zone', 0, 80, 220)],
      cables: [cab(10, 1, 2, 0.01), cab(11, 2, 3, (0.017 * 300) / 16, 16, 300)],
    }),
  },
}
