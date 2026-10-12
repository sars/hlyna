import Link from 'next/link'
import React from 'react'

import { cx } from './layout'

// Cities with studio counts: ruled cells, count in small terracotta text. 2 columns on phones, 4 from 700px (the home page's adaptive rules).
// `variant="side"` is for side columns (inside a SideBox, which already has the 2px rule): no top rule, tighter rows.
export function CityList({ items, columns = 4, variant = 'rule', label }: { items: { name: string; href: string; count: number | string; note?: string }[]; columns?: 2 | 4; variant?: 'rule' | 'side'; label?: string }) {
  const side = variant === 'side'
  return (
    <ul aria-label={label} className={cx('m-0 grid list-none grid-cols-2 p-0', side ? 'gap-x-4 gap-y-1' : 'ui-toprule gap-x-6 border-t-2 border-ink', !side && columns === 4 && 'min-[43.75rem]:grid-cols-4')}>
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
    <ul className="m-0 list-none columns-1 gap-6 p-0 pt-3 text-[15px] leading-[1.45] md:columns-2">
      {groups.map((g) => (
        <li key={g.name} className="mb-1 break-inside-avoid">
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

// Studio names of one city as plain ruled links: the first `limit`, the rest behind «Показати ще N».
export function CityStudioLinks({ studios, limit = 12, note }: { studios: { id: string | number; name: string; href: string; note?: string }[]; limit?: number; note?: boolean }) {
  const row = (s: (typeof studios)[number]) => (
    <li key={s.id} className="border-b border-rule">
      <Link href={s.href} className="block py-[11px] text-[15px] leading-[1.35] text-ink no-underline hover:text-cobalt">
        {s.name}
        {note && s.note && <span className="ml-2 font-mono text-[11px] tracking-[.04em] text-ink-2 uppercase">{s.note}</span>}
      </Link>
    </li>
  )
  const list = 'm-0 grid list-none grid-cols-1 gap-x-6 p-0 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <>
      <ul className={cx(list, 'mt-1')}>{studios.slice(0, limit).map(row)}</ul>
      {studios.length > limit && (
        <details className="ui-fold">
          <summary className="font-mono text-xs tracking-[.06em] text-cobalt uppercase">
            Показати ще {studios.length - limit}
            <span className="ui-faq-pm" aria-hidden />
          </summary>
          <ul className={list}>{studios.slice(limit).map(row)}</ul>
        </details>
      )}
    </>
  )
}

// A city of the map list: a folding head like CityHead (name, count, +/–) over its studios.
export function CityFold({ id, name, count, open, children }: { id: string; name: string; count: number; open?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} open={open} className="ui-fold border-b border-rule">
      <summary className="font-display text-[17px] leading-[1.15] font-semibold">
        {name}
        <span className="text-sm text-terracotta-text">{count}</span>
        <span className="ui-faq-pm ml-auto" aria-hidden />
      </summary>
      {children}
    </details>
  )
}
