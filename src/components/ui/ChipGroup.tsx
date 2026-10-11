import React from 'react'

import { Kicker } from './Kicker'

// A labelled set of chips («У містах:», «Дивіться також»). As `nav` it is a landmark with `aria-label`.
export function ChipGroup({ label, 'aria-label': ariaLabel, as: Tag = 'div', children }: { label?: string; 'aria-label'?: string; as?: 'nav' | 'div'; children: React.ReactNode }) {
  return (
    <Tag aria-label={ariaLabel ?? label} className="flex flex-wrap items-center gap-2">
      {label && <Kicker className="mr-1">{label}</Kicker>}
      {children}
    </Tag>
  )
}
