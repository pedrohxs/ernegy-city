// Textos da interface em pt-BR, centralizados e prontos para i18n.
export const strings = {
  appTitle: '⚡ Energy City 3D',
  hud: {
    demand: 'Demanda',
    supplied: 'Atendida',
    losses: 'Perdas',
    budget: 'Orçamento',
    score: '⭐',
    combo: 'Combo',
    xp: 'XP',
    infinite: '∞',
    blackout: '🚨 APAGÃO',
  },
  tools: { gen: 'Gerador', sub: 'Subestação', trafo: 'Trafo', zone: 'Zona', cabo: 'Cabo', move: 'Mover', del: 'Remover', sel: 'Analisar' } as Record<string, string>,
  gens: { gas: 'Gás', hidro: 'Hídrica', solar: 'Solar' } as Record<string, string>,
  buttons2: { undo: '↶ Desfazer', redo: '↷ Refazer', repair: 'Reparar', repairCable: 'Reparar cabo', removeCable: 'Remover cabo', maintenance: 'Manutenção' },
  labels2: { stars: 'Estrelas', level: 'Nível', goal: 'Objetivo', tutorial: 'Tutorial', skip: 'Pular', next: 'Próximo', free: 'Livre' },
  tutorial: {
    step1: 'Escolha "Gerador" e clique no chão livre perto do bairro.',
    step2: 'Coloque um "Trafo" de 110 V ao lado das casas.',
    step3: 'Escolha "Cabo" e ligue o Gerador ao Trafo.',
    step4: 'Ligue o Trafo às três casas com cabos até todas acenderem.',
    done: 'Bairro energizado! Continue mantendo a cidade acesa.',
  },
  views: { orbit: '🎥 Orbital', terceira: '🚶 3ª pessoa', primeira: '👁 1ª pessoa' } as Record<string, string>,
  buttons: {
    codex: '📐 Codex',
    load: 'Carregar',
    save: 'Salvar',
    reset: 'Reiniciar',
    pause: '⏸ Pausar',
    play: '▶ Retomar',
  },
  labels: {
    missions: 'Missões',
    achievements: 'Conquistas',
    slot: 'Slot',
    speed: 'Velocidade',
    engineerBoard: '📐 Prancheta do Engenheiro',
    target: 'Meta',
    challenge: 'Desafio',
    level: 'Nível',
    noFail: 'sem falhas por 20 s',
  },
  hints: {
    orbit: 'Clique no chão para construir e nos componentes para conectar/inspecionar.',
    walk: 'WASD mover | Shift correr | Q/E ou arrastar o mouse: girar | V: trocar câmera (construir só no modo Orbital)',
    shortcuts: 'Espaço: pausar | 1/2/3: velocidade 1×/2×/4×',
  },
  codexLines: [
    'Ohm: U = R·I (queda ΔV = R·I)',
    'Resistência: R = ρ·L/A (cobre 0,017; alumínio 0,028)',
    'Potência: P = U·I → I = P/U',
    'Joule: P = R·I²',
    'Energia: E = P·Δt',
    'Série: Req = R1+R2+… | Paralelo: 1/Req = Σ1/Rn',
  ],
  codexFooter: 'Cabos em paralelo (malha) dividem a corrente e reduzem perdas. 13.800 V → trafo → 110/220 V.',
  report: {
    solutions: 'Soluções:',
    close: 'Fechar',
    cableNotFailed: 'Este cabo não está em falha.',
    fixes: ['Aumentar a seção do condutor', 'Usar cobre (menor resistividade)', 'Dividir a carga em mais ramais/trafos', 'Reduzir o comprimento', 'Construir nova subestação/trafo'],
  },
  errorBoundary: {
    title: 'Algo deu errado',
    body: 'O jogo encontrou um erro inesperado. Seus saves permanecem salvos no navegador.',
    reload: 'Recarregar',
  },
} as const

export type Strings = typeof strings
export default strings
