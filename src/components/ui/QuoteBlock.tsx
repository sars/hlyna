import React from 'react'

import { cx } from './layout'

// An answer or an owner's quote on a white slab with a 6px cobalt bar. `source` is the line under it.
export function QuoteBlock({ children, source, className }: { children: React.ReactNode; source?: React.ReactNode; className?: string }) {
  return (
    <blockquote className={cx('m-0 grid gap-2 border-l-[6px] border-cobalt bg-paper-white px-5 py-4 text-body', className)}>
      <div>{children}</div>
      {source && <footer className="font-mono text-[11.5px] tracking-[.05em] text-ink-2 uppercase">{source}</footer>}
    </blockquote>
  )
}
