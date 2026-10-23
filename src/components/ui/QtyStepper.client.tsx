'use client'

import React from 'react'

import { cx } from './layout'

// Quantity as two buttons and a number (DESIGN.md §2 QtyStepper): never a text field.
export function QtyStepper({ value, min = 1, max = 10, onChange, size = 'md', label = 'Кількість', className }: { value: number; min?: number; max?: number; onChange: (v: number) => void; size?: 'md' | 'sm'; label?: string; className?: string }) {
  return (
    <span className={cx('ui-qty', className)} data-size={size} role="group" aria-label={label}>
      <button type="button" aria-label="Менше" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span aria-live="polite">
        <span className="sr-only">{label}: </span>
        {value}
      </span>
      <button type="button" aria-label="Більше" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </span>
  )
}
