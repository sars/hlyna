import React from 'react'

import { cx } from './layout'

// Form fields: an underline, no box. Colours follow the parent Panel (`data-tone="cobalt"`) or the paper.
type Invalid = { invalid?: boolean }

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
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
  return <input {...rest} aria-invalid={invalid || undefined} className={cx('ui-control', className)} />
}

export function Textarea({ invalid, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea {...rest} aria-invalid={invalid || undefined} className={cx('ui-control', className)} />
}

export function Select({ invalid, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select {...rest} aria-invalid={invalid || undefined} className={cx('ui-control', className)}>
      {children}
    </select>
  )
}

export function Checkbox({ label, className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return (
    <label className={cx('ui-check', className)}>
      <input {...rest} type="checkbox" />
      {label}
    </label>
  )
}
