import React from 'react'

import { cx } from './layout'

// Form fields: an underline, no box (on a Panel and in the request form), or `variant="box"`: the cabinet's white box (SYSTEM.md §4.4).
type Invalid = { invalid?: boolean }

type FieldProps = {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  /** «необов’язково» after the label (box variant). */
  optional?: boolean
  /** A live counter under the control, e.g. «0 / 600» (box variant). */
  counter?: string
  /** `box`: the cabinet's white box with a sentence-case label; the hint sits above the control (SYSTEM.md §4.4). */
  variant?: 'line' | 'box'
  children: React.ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, optional, counter, variant = 'line', children, className }: FieldProps) {
  if (variant === 'box') {
    const hintId = hint ? `${htmlFor}-hint` : undefined
    const errId = error ? `${htmlFor}-err` : undefined
    const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
    const control = React.isValidElement<Record<string, unknown>>(children)
      ? React.cloneElement(children, { ...(describedBy && { 'aria-describedby': describedBy }), ...(error && { 'aria-invalid': true }) })
      : children
    return (
      <div className={cx('ui-field', className)} data-variant="box">
        <label htmlFor={htmlFor}>
          {label}
          {optional && <small className="ui-opt">необов’язково</small>}
        </label>
        {hint && <span className="ui-hint" id={hintId}>{hint}</span>}
        {control}
        {(error || counter) && (
          <div className="ui-foot">
            {error && <span className="ui-error" id={errId} role="alert">{error}</span>}
            {counter && <span className="ui-count">{counter}</span>}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className={cx('ui-field', className)}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="ui-hint">{hint}</span>}
      {error && <span className="ui-error" role="alert">{error}</span>}
    </div>
  )
}

// Two fields side by side (quantity and date, phone and email).
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">{children}</div>
}

export function Input({ invalid, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return <input aria-invalid={invalid || undefined} {...rest} className={cx('ui-control', className)} />
}

export function Textarea({ invalid, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea aria-invalid={invalid || undefined} {...rest} className={cx('ui-control', className)} />
}

export function Select({ invalid, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select aria-invalid={invalid || undefined} {...rest} className={cx('ui-control', className)}>
      {children}
    </select>
  )
}

export function Checkbox({ label, hint, className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string }) {
  return (
    <label className={cx('ui-check', className)}>
      <input {...rest} type="checkbox" />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  )
}
