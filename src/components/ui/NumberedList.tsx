import React from 'react'

import { cx } from './layout'

// Numbered points of a section, as ruled rows (no cards). `columns={2}` splits into two columns from md.
export function NumberedList({ items, columns = 1, start = 1 }: { items: { title: React.ReactNode; text?: React.ReactNode }[]; columns?: 1 | 2; start?: number }) {
  return (
    <ol start={start} className={cx('m-0 grid list-none grid-cols-1 border-t border-rule p-0', columns === 2 && 'md:grid-cols-2 md:gap-x-8')}>
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2.5 gap-y-1 border-b border-rule py-3.5">
          <span aria-hidden className="row-span-2 font-display text-2xl leading-none font-extrabold text-terracotta">
            {start + i}
          </span>
          <b className="font-display text-[15.5px] leading-[1.2] font-semibold">{it.title}</b>
          {it.text && <span className="text-[15px] leading-normal text-ink-2">{it.text}</span>}
        </li>
      ))}
    </ol>
  )
}
