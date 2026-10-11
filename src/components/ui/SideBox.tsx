import React from 'react'

import { Kicker } from './Kicker'

// A block of the side column that is not a form: a mono title over a 2px rule, then its content.
export function SideBox({ title, children, label }: { title: string; children: React.ReactNode; label?: string }) {
  return (
    <aside aria-label={label ?? title} className="grid content-start gap-2 border-t-2 border-ink pt-3 text-[15px] leading-normal">
      <Kicker>{title}</Kicker>
      {children}
    </aside>
  )
}
