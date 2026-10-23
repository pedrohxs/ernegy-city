// Telemetria LOCAL opcional: registra falhas no localStorage. NADA é enviado a servidores.
export interface LogEntry { t: number; scope: string; msg: string }
const KEY = 'energy-city-logs'
const LIMIT = 80

const isEntry = (v: unknown): v is LogEntry => {
  if (!v || typeof v !== 'object') return false
  const e = v as Partial<LogEntry>
  return typeof e.t === 'number' && typeof e.scope === 'string' && typeof e.msg === 'string'
}

export function getLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isEntry) : []
  } catch {
    return []
  }
}

export function logCount(): number {
  return getLogs().length
}

export function logError(scope: string, e: unknown): void {
  try {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    const logs = [...getLogs(), { t: Date.now(), scope, msg }].slice(-LIMIT)
    localStorage.setItem(KEY, JSON.stringify(logs))
  } catch {
    /* sem armazenamento — ignora */
  }
}

export function clearLogs(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignora */ }
}
