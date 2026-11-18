// Todas as constantes de balanceamento num só lugar (ajuste aqui após simulação).
// Física didática: R = ρ·L/A, I = P/U, P = R·I². Tempo em segundos; dinheiro em R$.

// ---- Térmico ----
export const T_AMB = 25
export const T_MAX = 95
export const HEAT = 0.005 // aquecimento do cabo por W dissipado
export const COOL = 0.1 // taxa de resfriamento
export const NODE_HEAT = 70 // elevação máxima acima de T_AMB com (carga/capacidade)² = 1

// ---- Tensão e condutores ----
export const HV = 13800
export const RHO: Record<string, number> = { cobre: 0.017, aluminio: 0.028 } // Ω·mm²/m
export const PRICE: Record<string, number> = { cobre: 92, aluminio: 48 } // R$/m a 35 mm²
export const AREAS = [16, 25, 35, 50, 70, 95]
// Ampacidade do cobre (A), referência B1/PVC 70 °C da NBR 5410.
export const AMPACITY_COPPER: readonly [number, number][] = [[16, 76], [25, 101], [35, 125], [50, 151], [70, 192], [95, 232]]
export const AMPACITY_FACTOR: Record<string, number> = { cobre: 1, aluminio: 0.78 }
export const RUPTURE_FACTOR = 3 // I > 3·I_z: rompimento instantâneo (curto) antes de dar tempo de aquecer

// ---- Integridade / desgaste (0–100%) ----
export const HEALTH_MAX = 100
export const WEAR_BASE = 0.01 // %/s perdidos só por estar em serviço (~2,8 h até zerar)
export const WEAR_OVERLOAD_AT = 0.85 // acima de 85% da capacidade o desgaste acelera
export const WEAR_OVERLOAD = 0.5 // %/s extras por cada 15 p.p. acima de 85% (100% de carga → +0,5 %/s)

// ---- Nós ----
export const CAP: Record<string, number> = { gen: 0, sub: 300, trafo: 150, zone: 0 } // kW (gerador vem do tipo)
export const ZONE_KW: Record<number, number> = { 110: 20, 220: 40 }
export const SUB_LOSS = 0.01 // perdas próprias da subestação (1% do throughput)

// ---- Tipos de zona (a "cidade" que precisa de energia) ----
export type ZoneType = 'casa' | 'predio' | 'hospital'
export interface ZoneSpec { label: string; volt: 110 | 220; kW: number; critical: boolean }
export const ZONES: Record<ZoneType, ZoneSpec> = {
  casa: { label: 'Casa', volt: 110, kW: 20, critical: false },
  predio: { label: 'Prédio', volt: 220, kW: 40, critical: false },
  hospital: { label: 'Hospital', volt: 220, kW: 60, critical: true },
}
export const ZONE_ORDER: ZoneType[] = ['casa', 'predio', 'hospital']

// ---- Geradores ----
export type GenType = 'gas' | 'hidro' | 'solar'
export interface GenSpec { label: string; cap: number; cost: number; startup: number; fuel: number; night: boolean }
// cap em kW; cost em R$; startup em s; fuel em R$/kW·s; night = só opera de dia
export const GENS: Record<GenType, GenSpec> = {
  gas: { label: 'Gás', cap: 500, cost: 60000, startup: 2, fuel: 0.04, night: false },
  hidro: { label: 'Hídrica', cap: 900, cost: 120000, startup: 8, fuel: 0.02, night: false },
  solar: { label: 'Solar', cap: 200, cost: 45000, startup: 0, fuel: 0, night: true },
}
export const GEN_ORDER: GenType[] = ['gas', 'hidro', 'solar']

// ---- Custos de construção ----
export const COST: Record<string, number> = { gen: 60000, sub: 30000, trafo: 12000, zone: 0 } // R$ (gen usa GENS)
export const REFUND = 0.5 // fração devolvida ao demolir

// ---- Economia (R$; tempo em s) ----
export const ENERGY_PRICE = 0.5 // R$ por kW·s fornecido
export const LOSS_COST = 0.3 // R$ por kW·s perdido
export const BLACKOUT_PENALTY = 0.4 // R$ por kW·s de déficit durante apagão
export const BLACKOUT_AT = 0.5 // fração da demanda abaixo da qual há apagão
export const CRITICAL_PENALTY = 1.5 // penalidade extra para hospital sem energia

// ---- Orçamentos ----
export const START_BUDGET = 150000
export const SANDBOX_BUDGET = 1e9
export const CHALLENGE_BUDGET = 200000

// ---- Reparo e manutenção ----
export const REPAIR_FRACTION = 0.25 // custo do reparo = fração do valor do componente
export const MAINTENANCE_COST = 0.5 // R$ por nó por s em manutenção
export const MAINT_WEAR = 0.4 // multiplicador do aquecimento sob manutenção (menor desgaste)

// ---- Eventos ----
export const GROWTH_EVERY = 40 // s: nova zona
export const EVENT_EVERY = 45 // s: intervalo entre eventos aleatórios determinísticos
export const HEAT_WAVE_AFTER = 60 // s: primeira onda de calor

// ---- Tempo / ciclo dia-noite ----
export const DAY_SECONDS = 600 // 10 min reais = 24 h de jogo (em 4× ≈ 2,5 min)
export const START_HOUR = 8 // o jogo começa às 08:00
export const SUNRISE = 6 // nascer do sol
export const SUNSET = 18 // pôr do sol
export const WAVE_MULT = 1.2, WAVE_TIME = 20 // onda de calor
export const WAVE_PERIOD = 90
export const SPIKE_MULT = 1.5, SPIKE_TIME = 12 // pico de consumo
export const STORM_MULT = 1.3, STORM_TIME = 18 // tempestade (aumenta R)
export const TRIP_TIME = 12 // queda de gerador (s fora)

// ---- Progressão ----
export const GOAL_SECONDS = 20
export const LEVEL_BONUS = 50000
export const CHALLENGE_KW = 150
export const MAX_ZONES = 60 // limite de construções para não estourar solver/render
export const BUILD_SPACING = 9
export const PLAYER_WALK_SPEED = 3.6
export const PLAYER_RUN_SPEED = 6.6
export const STARTER_NETWORK = {
  generator: { x: 20, z: 10 },
  transformer: { x: 30, z: 10 },
  feederArea: 35,
  branchArea: 95,
} as const

export type GoalKind = 'supply' | 'losses' | 'heatwave'
export interface Level {
  n: number
  title: string
  goal: GoalKind
  target: number // kW que precisa ser fornecido
  hold: number // s mantendo o objetivo
  budget: number // orçamento inicial do nível
  minLoss?: number // for 'losses': fornecimento mínimo
  maxLossPct?: number // for 'losses': perdas máximas (%)
  stars: [number, number] // orçamento restante mínimo para 2 e 3 estrelas
}

// Níveis 1-10 (validados por scripts/balance-sim). Orçamento cresce; metas ficam mais duras.
export const LEVELS: Level[] = [
  { n: 1, title: 'Primeira luz', goal: 'supply', target: 60, hold: 20, budget: 150000, stars: [40000, 70000] },
  { n: 2, title: 'Bairro novo', goal: 'supply', target: 80, hold: 20, budget: 160000, stars: [50000, 80000] },
  { n: 3, title: 'Eficiência', goal: 'losses', target: 60, minLoss: 60, maxLossPct: 10, hold: 20, budget: 170000, stars: [50000, 90000] },
  { n: 4, title: 'Distrito industrial', goal: 'supply', target: 160, hold: 20, budget: 185000, stars: [60000, 100000] },
  { n: 5, title: 'Onda de calor', goal: 'heatwave', target: 120, hold: 15, budget: 200000, stars: [60000, 110000] },
  { n: 6, title: 'Metrópole', goal: 'supply', target: 240, hold: 25, budget: 310000, stars: [70000, 120000] },
  { n: 7, title: 'Rede enxuta', goal: 'losses', target: 220, minLoss: 220, maxLossPct: 8, hold: 25, budget: 320000, stars: [80000, 130000] },
  { n: 8, title: 'Alta demanda', goal: 'supply', target: 320, hold: 25, budget: 330000, stars: [90000, 140000] },
  { n: 9, title: 'Tudo ao mesmo tempo', goal: 'heatwave', target: 300, hold: 15, budget: 350000, stars: [100000, 160000] },
  { n: 10, title: 'Energia para todos', goal: 'supply', target: 400, hold: 30, budget: 390000, stars: [110000, 180000] },
]

/** Nível atual (1-based) a partir do nível salvo. */
export const levelAt = (level: number): Level => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, level - 1))]
