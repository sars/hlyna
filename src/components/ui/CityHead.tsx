import React from 'react'

// H3 of a city above a studio list, with the studio count in small terracotta text.
export function CityHead({ name, count, id, level = 3 }: { name: string; count?: number; id: string; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <H id={id} className="m-0 mt-[26px] flex items-baseline gap-2.5 border-b-2 border-ink pb-2 font-display text-[17px] leading-[1.15] font-semibold">
      {name}
      {count != null && <span className="text-sm text-terracotta-text">{count}</span>}
    </H>
  )
}
