import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

// Cities with studio counts: ruled cells, count in small terracotta text. 2 columns on phones, 4 from 700px (the home page's adaptive rules).
// `variant="side"` is for side columns (inside a SideBox, which already has the 2px rule): no top rule, tighter rows.
export function CityList({ items, columns = 4, variant = 'rule', label }: { items: { name: string; href: string; count: number | string; note?: string }[]; columns?: 2 | 4; variant?: 'rule' | 'side'; label?: string }) {
  const side = variant === 'side'
  return (
    <ul aria-label={label} className={cx('m-0 grid list-none grid-cols-2 p-0', side ? 'gap-x-4 gap-y-1' : 'gap-x-6 border-t-2 border-ink', !side && columns === 4 && 'min-[43.75rem]:grid-cols-4')}>
      {items.map((c) => (
        <li key={c.href}>
          <Link href={c.href} className={cx('flex items-baseline justify-between gap-2.5 border-b border-rule font-semibold text-ink no-underline hover:text-cobalt', side ? 'py-1 text-[15px] leading-[1.35]' : 'py-3 text-[17px] leading-[1.3]')}>
            <span>
              {c.name}
              {c.note && <small className="block font-mono text-[11px] leading-[1.4] font-normal tracking-[.04em] text-ink-2 normal-case">{c.note}</small>}
            </span>
            <span className={cx('font-display font-semibold text-terracotta-text', side ? 'text-[13px]' : 'text-sm')}>{c.count}</span>
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
