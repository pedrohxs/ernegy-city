import { ButtonHTMLAttributes, CSSProperties, ReactNode, useState } from 'react'
import css from './ui.module.css'

export function Panel({ className = '', style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return <div className={`${css.panel} ${className}`} style={style}>{children}</div>
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { active?: boolean; variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'lg' }
export function Button({ active, variant, size, className = '', children, ...rest }: BtnProps) {
  const cls = [css.btn, active && css.active, variant === 'primary' && css.primary, variant === 'ghost' && css.ghost, variant === 'danger' && css.danger, size === 'sm' && css.sm, size === 'lg' && css.lg, className].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{children}</button>
}

export function Select<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string }) {
  return (
    <label className={css.field}>
      {label && <span className={css.label}>{label}</span>}
      <select className={css.select} value={value} onChange={e => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}>
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

export function Tooltip({ tip, children }: { tip: ReactNode; children: ReactNode }) {
  const [on, setOn] = useState(false)
  return (
    <span className={css.tooltipWrap} onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}>
      {children}
      {on && <span className={css.tooltip}>{tip}</span>}
    </span>
  )
}

export function Modal({ title, children, onClose, wide }: { title?: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className={css.scrim} onClick={onClose}>
      <div className={`${css.modal} ${wide ? css.modalWide : ''}`} onClick={e => e.stopPropagation()}>
        {title && <h2 className={css.modalTitle}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Stars({ n }: { n: number }) {
  return <div className={css.stars}>{'★'.repeat(n)}<span style={{ opacity: 0.3 }}>{'★'.repeat(Math.max(0, 3 - n))}</span></div>
}
