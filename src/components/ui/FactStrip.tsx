import React from 'react'

// The page's numbers under the lead (3–5 items). Values come from the live catalogue and price index, never typed in.
export function FactStrip({ items, label = 'Цифри сторінки' }: { items: { value: string; label: string }[]; label?: string }) {
  return (
    <ul className="ui-facts" aria-label={label} style={{ '--n': items.length } as React.CSSProperties}>
      {items.map((it) => (
        <li key={it.label}>
          <b className="font-display text-[clamp(20px,2.2vw,28px)] leading-none font-extrabold text-cobalt tabular-nums md:whitespace-nowrap">{it.value}</b>
          <span className="text-[13px] leading-[1.35] text-ink-2">{it.label}</span>
        </li>
      ))}
    </ul>
  )
}
