import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

type Variant = 'ink' | 'cobalt' | 'paper' | 'peach' | 'ghost'

type Props = {
  /** Omit on a Panel: the button then picks `paper` on cobalt and `peach` on ink by itself. */
  variant?: Variant
  size?: 'md' | 'sm'
  arrow?: boolean
  full?: boolean
  className?: string
  children: React.ReactNode
} & ({ href: string; type?: never; disabled?: never } | ({ href?: undefined } & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'onClick' | 'form'>))

// Every button and button-like link. One primary (cobalt or ink) per block; the second one is `ghost`.
export function Button({ variant, size = 'md', arrow, full, className, children, ...rest }: Props) {
  const common = {
    className: cx('ui-btn', className),
    'data-variant': variant ?? 'ink',
    'data-auto': variant ? undefined : '',
    'data-size': size === 'sm' ? 'sm' : undefined,
    'data-full': full ? '' : undefined,
  }
  const body = (
    <>
      {children}
      {arrow && <span className="ui-arrow" aria-hidden>→</span>}
    </>
  )
  if ('href' in rest && rest.href) {
    const href = rest.href
    return href.startsWith('http') ? (
      <a href={href} {...common}>{body}</a>
    ) : (
      <Link href={href} {...common}>{body}</Link>
    )
  }
  const { type = 'button', disabled, onClick, form } = rest as Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'onClick' | 'form'>
  return <button type={type} disabled={disabled} onClick={onClick} form={form} {...common}>{body}</button>
}
