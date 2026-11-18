import { ButtonHTMLAttributes, ReactNode, useEffect, useId, useRef } from 'react'
import css from './ui.module.css'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { active?: boolean; variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'lg' }
export function Button({ active, variant, size, className = '', children, ...rest }: BtnProps) {
  const cls = [css.btn, active && css.active, variant === 'primary' && css.primary, variant === 'ghost' && css.ghost, variant === 'danger' && css.danger, size === 'sm' && css.sm, size === 'lg' && css.lg, className].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{children}</button>
}

export function Select<T extends string | number>({ value, onChange, options, label, compact }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string; compact?: boolean }) {
  return (
    <label className={css.field}>
      {label && !compact && <span className={css.label}>{label}</span>}
      <select aria-label={compact ? label : undefined} className={css.select} value={value} onChange={e => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}>
        {options.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function Range({ label, value, onChange, min = 0, max = 1, step = 0.05, display }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; display?: (v: number) => string }) {
  return (
    <label className={css.field}>
      <span className={css.label} style={{ width: 96 }}>{label}</span>
      <input className={css.range} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <span className={css.mono} style={{ width: 40, textAlign: 'right' }}>{display ? display(value) : value.toFixed(2)}</span>
    </label>
  )
}

export function Modal({ title, children, onClose, wide }: { title?: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return (
    <div className={css.scrim} onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} tabIndex={-1}
        className={`${css.modal} ${wide ? css.modalWide : ''}`} onClick={e => e.stopPropagation()} onKeyDown={e => {
          if (e.key === 'Escape' && onClose) { e.preventDefault(); onClose(); return }
          if (e.key !== 'Tab') return
          const focusable = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]'))
          const first = focusable[0], last = focusable[focusable.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
        }}>
        {title && <h2 className={css.modalTitle} id={id}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Stars({ n }: { n: number }) {
  return <div className={css.stars}>{'★'.repeat(n)}<span style={{ opacity: 0.3 }}>{'★'.repeat(Math.max(0, 3 - n))}</span></div>
}
