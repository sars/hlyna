import Link from 'next/link'
import React from 'react'

import { hasFormat, igHandle, offersMasterClasses, worksWithVenues, type StudioCard } from '@/lib/catalog'
import { cleanName, firstAddress, isExhibitingOnly, staleNote, stripPersonal } from '@/lib/present'
import { productChips } from '@/lib/products'

import { Chip } from './Chip'

export function MakerRows({ children }: { children: React.ReactNode }) {
  return <ul className="ui-makers">{children}</ul>
}

// A studio in a city's master-class list: name, address and Instagram, one line, what it offers, and the price of a single
// group class (from its price list) on the right. Without a price there is no price column.
export function MakerRow({ s, price, chips: chipsProp, typeLabel, showAbout = true }: { s: StudioCard; price?: { value: string; unit?: string }; chips?: { label: string; tone?: 'ink' | 'cobalt' }[]; typeLabel?: string; showAbout?: boolean }) {
  const addr = firstAddress(s.address)
  const stale = staleNote(s)
  const about = showAbout ? stripPersonal(s.summary ?? '') : ''
  const chips = chipsProp ?? [
    
    ...(isExhibitingOnly(s) ? ['виставки'] : []),
    ...productChips(s),
    ...(offersMasterClasses(s) ? ['майстер-класи'] : []),
    ...(worksWithVenues(s) ? ['для закладів'] : []),
    ...(hasFormat(s, 'corporate-gifts') || hasFormat(s, 'logo') ? ['для компаній'] : []),
  ].map((label) => ({ label, tone: label === 'майстер-класи' ? ('cobalt' as const) : ('ink' as const) }))
  return (
    <li>
      <Link href={`/vyrobnyky/${s.slug}`} className="font-display text-base leading-[1.2] font-semibold text-ink no-underline hover:text-cobalt">
        {cleanName(s.name)}
      </Link>
      {(typeLabel || addr || s.instagram) && (
        <span className="font-mono text-xs leading-[1.5] text-ink-2 [overflow-wrap:anywhere]">
          {[typeLabel, addr].filter(Boolean).join(' · ')}
          {(typeLabel || addr) && s.instagram ? ' · ' : ''}
          {s.instagram && (
            <a href={s.instagram} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">
              @{igHandle(s.instagram)}
            </a>
          )}
        </span>
      )}
      {about && <span className="line-clamp-2 text-sm leading-normal text-ink-2 [overflow-wrap:anywhere]">{about}</span>}
      {stale && <span className="font-mono text-[11.5px] text-terracotta-text">{stale}</span>}
      {chips.length > 0 && (
        <span className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((c) => (
            <Chip key={c.label} size="sm" tone={c.tone ?? 'ink'}>
              {c.label}
            </Chip>
          ))}
        </span>
      )}
      {price && (
        <span className="ui-price font-display text-[17px] leading-[1.2] font-semibold text-cobalt tabular-nums">
          {price.value}
          {price.unit && <small className="block font-mono text-[10.5px] font-normal tracking-[.06em] text-ink-2 uppercase">{price.unit}</small>}
        </span>
      )}
    </li>
  )
}
