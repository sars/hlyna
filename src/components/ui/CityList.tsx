import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

// Cities with studio counts: ruled cells, count in small terracotta text. 2 columns on phones, 4 from md (or 2 in a side column).
export function CityList({ items, columns = 4, label }: { items: { name: string; href: string; count: number }[]; columns?: 2 | 4; label?: string }) {
  return (
    <ul aria-label={label} className={cx('m-0 grid list-none grid-cols-2 gap-x-6 border-t-2 border-ink p-0', columns === 4 && 'md:grid-cols-4')}>
      {items.map((c) => (
        <li key={c.href}>
          <Link href={c.href} className="flex items-baseline justify-between gap-2.5 border-b border-rule py-3 text-[17px] leading-[1.3] font-semibold text-ink no-underline hover:text-cobalt">
            {c.name}
            <span className="font-display text-sm font-semibold text-terracotta-text">{c.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// «Ще міста і села»: places with fewer than three studios, each with its studios as plain links.
export function SmallCities({ groups }: { groups: { name: string; studios: { name: string; href: string }[] }[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 pt-3 text-[15px] leading-[1.45] sm:grid-cols-2">
      {groups.map((g) => (
        <li key={g.name}>
          <b className="font-semibold">{g.name}:</b>{' '}
          {g.studios.map((s, j) => (
            <React.Fragment key={s.href}>
              {j > 0 && ', '}
              <Link href={s.href} className="text-ink underline underline-offset-[3px] hover:text-cobalt">
                {s.name}
              </Link>
            </React.Fragment>
          ))}
        </li>
      ))}
    </ul>
  )
}
