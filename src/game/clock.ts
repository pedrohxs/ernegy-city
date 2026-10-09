// Relógio do jogo: converte o tempo de simulação (s) em hora do dia e deriva
// iluminação contínua (sem "pops" binários). Ver docs/ART.md.
import { DAY_SECONDS, START_HOUR, SUNRISE, SUNSET } from '../data/balance'

/** Hora do dia (0–24) a partir do tempo de simulação. */
export const hourOf = (simTime: number): number => (START_HOUR + (simTime / DAY_SECONDS) * 24) % 24

/** Elevação do sol: -1 (meia-noite) … 0 (6h/18h) … 1 (meio-dia). */
export const sunElevation = (hour: number): number => Math.sin(((hour - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI)

/** Luz do dia contínua: 0 noite fechada, 1 dia claro. */
export const dayFactor = (hour: number): number => Math.min(1, Math.max(0, sunElevation(hour) * 1.5 + 0.5))

/** Fator de noite contínuo (1 - luz do dia). */
export const nightFactor = (hour: number): number => 1 - dayFactor(hour)

/** Hora formatada HH:MM. */
export const formatClock = (hour: number): string => {
  const h = Math.floor(((hour % 24) + 24) % 24)
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
