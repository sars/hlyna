import React from 'react'

// A studio's prices as ruled rows: the line from its price list and, on the right, where it was published.
export function PriceList({ items }: { items: { text: string; source?: string }[] }) {
  return (
    <ul className="m-0 list-none p-0 [font-variant-numeric:lining-nums]">
      {items.map((p, i) => (
        <li key={i} className="grid grid-cols-1 gap-x-3 border-b border-rule py-[9px] text-[15px] leading-normal first:border-t sm:grid-cols-[minmax(0,1fr)_auto]">
          <span>{p.text}</span>
          {/* Hidden brackets keep the copied or crawled text readable («1 700 грн (сайт, 2026)», not «1 700 грнсайт, 2026»). */}
          {p.source && (
            <span className="font-mono text-[11.5px] text-ink-2 sm:whitespace-nowrap">
              <span className="sr-only"> (</span>
              {p.source}
              <span className="sr-only">)</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
