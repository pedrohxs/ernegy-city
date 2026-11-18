import { describe, expect, it } from 'vitest'
import { parsePrefs } from './prefs'

describe('preferências da interface', () => {
  it('lê preferências completas', () => {
    const p = parsePrefs(JSON.stringify({ quality: 'alta', volumes: { master: 0.2, music: 0.3, sfx: 0.4, ambient: 0.5 }, sensitivity: 2, muted: true }))
    expect(p).not.toBeNull()
    expect(p!.quality).toBe('alta')
    expect(p!.volumes).toEqual({ master: 0.2, music: 0.3, sfx: 0.4, ambient: 0.5 })
    expect(p!.sensitivity).toBe(2)
    expect(p!.muted).toBe(true)
  })

  it('usa padrões seguros e limita valores fora da faixa', () => {
    const p = parsePrefs(JSON.stringify({ quality: 'media', volumes: { master: 4 }, sensitivity: 99 }))
    expect(p!.volumes.master).toBe(1)
    expect(p!.volumes.music).toBe(0.2)
    expect(p!.sensitivity).toBe(3)
  })

  it('rejeita qualidade inválida e JSON quebrado', () => {
    expect(parsePrefs('{ não é json')).toBeNull()
    expect(parsePrefs(JSON.stringify({ quality: 'ultra' }))).toBeNull()
    expect(parsePrefs(null)).toBeNull()
  })
})
