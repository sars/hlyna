import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

// inline-flex, not inline-block: an inline-block link as a grid or flex item got a track narrower than its nowrap text.
const cls = 'inline-flex cursor-pointer items-center gap-1.5 font-display text-[12.5px] leading-none font-semibold tracking-[.04em] uppercase whitespace-nowrap no-underline [&::-webkit-details-marker]:hidden'

// «Показати ще N →», «Усі міста →». `as="summary"` is the toggle of a native `details` («Показати ще / Згорнути»);
// `as="button"` opens something on the page («Усі фото (12) →» of `StudioGallery`).
export function MoreLink({ href, as = 'a', arrow, pad = true, className, onClick, label, children }: { href?: string; as?: 'a' | 'summary' | 'button'; arrow?: boolean; pad?: boolean; className?: string; onClick?: () => void; label?: string; children: React.ReactNode }) {
  const showArrow = arrow ?? as !== 'summary'
  const body = (
    <>
      {children}
      {showArrow && <span className="ui-arrow" aria-hidden>→</span>}
    </>
  )
  if (as === 'button')
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cx(cls, 'border-0 bg-transparent px-0', pad && 'py-3', className?.includes('text-') ? '' : 'text-ink hover:text-cobalt', className)}>
        {body}
      </button>
    )
  if (as === 'summary') return <summary className={cx(cls, pad && 'py-3', className?.includes('text-') ? '' : 'text-ink hover:text-cobalt', className)}>{body}</summary>
  return (
    <Link href={href ?? '#'} className={cx(cls, pad && 'py-3', className?.includes('text-') ? '' : 'text-ink hover:text-cobalt', className)}>
      {body}
    </Link>
  )
}
