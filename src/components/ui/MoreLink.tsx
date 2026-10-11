import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

// inline-flex, not inline-block: an inline-block link as a grid or flex item got a track narrower than its nowrap text.
const cls = 'inline-flex cursor-pointer items-center gap-1.5 font-display text-[12.5px] leading-none font-semibold tracking-[.04em] uppercase whitespace-nowrap no-underline [&::-webkit-details-marker]:hidden'

// «Показати ще N →», «Усі міста →». `as="summary"` is the toggle of a native `details` («Показати ще / Згорнути»).
export function MoreLink({ href, as = 'a', arrow, pad = true, className, children }: { href?: string; as?: 'a' | 'summary'; arrow?: boolean; pad?: boolean; className?: string; children: React.ReactNode }) {
  const showArrow = arrow ?? as === 'a'
  const body = (
    <>
      {children}
      {showArrow && <span className="ui-arrow" aria-hidden>→</span>}
    </>
  )
  if (as === 'summary') return <summary className={cx(cls, pad && 'py-3', className?.includes('text-') ? '' : 'text-ink hover:text-cobalt', className)}>{body}</summary>
  return (
    <Link href={href ?? '#'} className={cx(cls, pad && 'py-3', className?.includes('text-') ? '' : 'text-ink hover:text-cobalt', className)}>
      {body}
    </Link>
  )
}
