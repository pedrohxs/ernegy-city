import { Component, ReactNode } from 'react'
import { strings } from '../i18n/pt-BR'
import { logError } from '../data/telemetry'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    logError('render', error)
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = strings.errorBoundary
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#0b1220', color: '#e2e8f0', fontFamily: 'sans-serif', textAlign: 'center', padding: 24 }}>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
        <p style={{ color: '#94a3b8', maxWidth: 420 }}>{t.body}</p>
        <pre style={{ color: '#f87171', fontSize: 12, maxWidth: '90vw', overflow: 'auto' }}>{this.state.error.message}</pre>
        <button style={{ padding: '8px 16px', background: '#facc15', color: '#000', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => location.reload()}>
          {t.reload}
        </button>
      </div>
    )
  }
}
