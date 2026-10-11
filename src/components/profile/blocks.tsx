// Small presentational blocks of the studio profile page.
import React from 'react'

import type { PriceLine } from '@/lib/present'

export const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener nofollow" className="break-all">
    {label}
  </a>
)

const SHOW = 12

export function ListBlock({ title, items }: { title: string; items: string[] }) {
  const head = items.slice(0, SHOW)
  const rest = items.slice(SHOW)
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="kicker mb-2">{title}</p>
      <ul className="m-0 grid grid-cols-1 gap-1 pl-5">
        {head.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-bold text-cobalt">
            <span className="group-open:hidden">Ще {rest.length}</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </summary>
          <ul className="m-0 mt-1 grid grid-cols-1 gap-1 pl-5">
            {rest.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </details>
      )}
    </div>
  )
}

export function PriceItem({ p }: { p: PriceLine }) {
  return (
    <li className="rounded-xl bg-card px-4 py-3 [font-variant-numeric:lining-nums]">
      {p.text}
      {p.source && <span className="text-[12.5px] text-umber"> · {p.source}</span>}
    </li>
  )
}
