import Link from 'next/link'
import React from 'react'

import { TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { groupMoney } from '@/lib/money'
import { cleanName, staleNote, stripPersonal } from '@/lib/present'

// The grid that holds StudioCell / IndexCell items: a 2px rule on top, two columns from sm.
export function StudioCells({ children }: { children: React.ReactNode }) {
  return <ul className="ui-cells">{children}</ul>
}

// A studio in a grid (profile «Інші студії», lists): text first, no photo until the studio consents.
export function StudioCell({ s, showCity = true, line }: { s: StudioCard; showCity?: boolean; line?: string }) {
  const stale = staleNote(s)
  const text = groupMoney(stripPersonal(line ?? s.summary ?? (s.publicDescription ?? s.description ?? '').split(/(?<=[.!?])\s/)[0] ?? ''))
  const type = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  return (
    <li>
      <Link href={`/vyrobnyky/${s.slug}`}>
        <span className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
          {type}
          {showCity && s.cityDoc ? ` · ${s.cityDoc.name}` : ''}
        </span>
        <span className="ui-name font-display text-base leading-[1.2] font-semibold">{cleanName(s.name)}</span>
        {text && <span className="line-clamp-3 text-sm leading-normal text-ink-2 [overflow-wrap:anywhere]">{text}</span>}
        {stale && <span className="font-mono text-[11.5px] text-terracotta-text">{stale}</span>}
        <span className="pt-1 font-mono text-xs tracking-[.06em] text-cobalt uppercase">Профіль →</span>
      </Link>
    </li>
  )
}

// An editorial cell (selections, cases, formats): same ruled grid, a bigger title and a call to action.
export function IndexCell({ href, kicker, title, text, cta = 'Дивитись' }: { href: string; kicker?: string; title: string; text?: React.ReactNode; cta?: string }) {
  return (
    <li>
      <Link href={href}>
        {kicker && <span className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">{kicker}</span>}
        <span className="ui-name font-display text-[17px] leading-[1.2] font-semibold">{title}</span>
        {text && <span className="text-[15px] leading-normal text-ink-2">{text}</span>}
        {cta && <span className="pt-1 font-mono text-xs tracking-[.06em] text-cobalt uppercase">{cta} →</span>}
      </Link>
    </li>
  )
}
