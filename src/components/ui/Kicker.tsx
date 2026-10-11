import React from 'react'

import { cx } from './layout'

// The small mono line above a heading. On cobalt and ink panels it switches to the panel's secondary colour.
export function Kicker({ children, as: Tag = 'span', tone = 'default', className }: { children: React.ReactNode; as?: 'span' | 'p' | 'div'; tone?: 'default' | 'terracotta'; className?: string }) {
  return (
    <Tag
      className={cx(
        'font-mono text-kicker leading-[1.4] font-normal uppercase',
        tone === 'terracotta' ? 'text-terracotta-text' : 'text-ink-2 group-data-[tone=cobalt]/tone:text-on-cobalt-2 group-data-[tone=ink]/tone:text-on-ink-2',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
