import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

type Props = {
  href?: string
  count?: number | string
  size?: 'md' | 'sm'
  active?: boolean
  tone?: 'ink' | 'cobalt'
  as?: 'a' | 'span' | 'button'
  className?: string
  children: React.ReactNode
}

// A tag, counter or filter: mono caps in a 1.5px frame, no fill (fill only when `active` or on hover).
export function Chip({ href, count, size = 'md', active, tone = 'ink', as, className, children }: Props) {
  const Tag = as ?? (href ? 'a' : 'span')
  const interactive = Tag !== 'span' && size === 'md'
  const cobalt = tone === 'cobalt'
  const cls = cx(
    'group/chip inline-flex items-center rounded-btn font-mono uppercase no-underline',
    size === 'md' ? 'px-[11px] py-[7px] text-[11.5px] leading-none tracking-[.04em]' : 'px-[7px] py-1 text-[10.5px] leading-none tracking-[.04em]',
    size === 'sm' && !cobalt && 'text-ink-2 shadow-[inset_0_0_0_1px_var(--color-rule)]',
    size === 'sm' && cobalt && 'text-cobalt shadow-[inset_0_0_0_1.5px_var(--color-cobalt)]',
    size === 'md' && !cobalt && 'shadow-[inset_0_0_0_1.5px_var(--color-ink)]',
    size === 'md' && cobalt && 'shadow-[inset_0_0_0_1.5px_var(--color-cobalt)]',
    size === 'md' && (active ? 'bg-ink text-paper' : cobalt ? 'text-cobalt' : 'text-ink'),
    interactive && !active && (cobalt ? 'cursor-pointer transition-colors hover:bg-cobalt hover:text-paper' : 'cursor-pointer transition-colors hover:bg-ink hover:text-paper'),
    className,
  )
  const body = (
    <>
      {children}
      {count != null && <b className={cx('ml-[5px] font-medium', active ? 'text-peach' : 'text-terracotta-text group-hover/chip:text-peach')}>{count}</b>}
    </>
  )
  if (Tag === 'a') return <Link href={href ?? '#'} className={cls} aria-current={active ? 'true' : undefined}>{body}</Link>
  if (Tag === 'button') return <button type="button" className={cls} aria-pressed={active}>{body}</button>
  return <span className={cls}>{body}</span>
}
