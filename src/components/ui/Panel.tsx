import React from 'react'

import { cx, wrap } from './layout'

// A flat coloured panel. `bleed` runs edge to edge with the content in `wrap`; without it the panel is an inset block
// (request form, promo). Children read the tone from `data-tone` (Kicker, Button, Field, rules).
export function Panel({ tone, bleed, as: Tag = 'div', className, children, ...rest }: { tone: 'cobalt' | 'ink'; bleed?: boolean; as?: 'div' | 'section' | 'aside'; className?: string; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag {...rest} data-tone={tone} className={cx('group/tone text-paper', tone === 'cobalt' ? 'bg-cobalt' : 'bg-ink', bleed ? 'py-[clamp(44px,7vw,96px)]' : 'p-[clamp(18px,2.4vw,28px)]', className)}>
      {bleed ? <div className={wrap}>{children}</div> : children}
    </Tag>
  )
}
