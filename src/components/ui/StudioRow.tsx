import Link from 'next/link'
import React from 'react'

import { TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { groupMoney } from '@/lib/money'
import { cleanName, staleNote, stripPersonal } from '@/lib/present'

export function StudioRows({ children }: { children: React.ReactNode }) {
  return <ul className="ui-rows">{children}</ul>
}

// A studio in a topic list: type, name, and the line of evidence for that topic (what the studio itself says).
export function StudioRow({ s, line, showCity }: { s: StudioCard; line?: string; showCity?: boolean }) {
  const stale = staleNote(s)
  const text = groupMoney(stripPersonal(line ?? ''))
  const type = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  return (
    <li>
      <Link href={`/vyrobnyky/${s.slug}`} data-wide={showCity && s.cityDoc ? '' : undefined}>
        <span className="pt-[3px] font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
          {type}
          {showCity && s.cityDoc ? ` · ${s.cityDoc.name}` : ''}
        </span>
        <span className="ui-name font-display text-[15.5px] leading-[1.2] font-semibold">{cleanName(s.name)}</span>
        {text && <span className="ui-line line-clamp-2 text-sm leading-normal text-ink-2 [overflow-wrap:anywhere]">{text}</span>}
        {stale && <span className="ui-stale font-mono text-[11.5px] text-terracotta-text">{stale}</span>}
        <span aria-hidden className="ui-go font-mono text-sm text-cobalt">→</span>
      </Link>
    </li>
  )
}
