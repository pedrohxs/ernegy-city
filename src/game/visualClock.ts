// Relógio visual contínuo: avança a cada quadro por realDt × escala.
// Dá interpolação suave entre os passos fixos de simulação (10 Hz) e congela ao pausar.
let visualTime = 0

export const getVisualTime = (): number => visualTime
export const advanceVisualTime = (dt: number): void => { visualTime += dt }
export const resetVisualTime = (): void => { visualTime = 0 }
