// Ajustes manuais por modelo (sem precisar mexer no Blender).
// Chave = nome do arquivo sem .glb (ex.: 'casa', 'gen', 'player').
// O jogo já auto-ajusta escala base (fit) e origem (base no chão); use isto só se precisar.
export interface ModelOverride {
  scale?: number // multiplicador extra
  rotY?: number // rotação em Y (radianos), ex.: Math.PI/2
  y?: number // deslocamento vertical em unidades
}

export const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // O personagem do Blender exporta virado (+Z); gira 180° para olhar para a frente.
  player: { rotY: Math.PI },
}
