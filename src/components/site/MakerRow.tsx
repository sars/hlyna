import Link from 'next/link'
import React from 'react'

import { hasFormat, igHandle, offersMasterClasses, worksWithVenues, type StudioCard } from '@/lib/catalog'
import { cleanName, firstAddress, isExhibitingOnly, staleNote, stripPersonal } from '@/lib/present'
import { productChips } from '@/lib/products'

// One studio in a city list: name, address, Instagram, what it makes and offers, one line about it.
export function MakerRow({ s }: { s: StudioCard }) {
  const addr = firstAddress(s.address)
  const stale = staleNote(s)
  const chips = [
    ...productChips(s),
    ...(offersMasterClasses(s) ? ['майстер-класи'] : []),
    ...(worksWithVenues(s) ? ['для закладів'] : []),
    ...(hasFormat(s, 'corporate-gifts') || hasFormat(s, 'logo') ? ['для компаній'] : []),
  ]
  const exhibiting = isExhibitingOnly(s)
  const about = stripPersonal(s.summary ?? '')
  return (
    <li className="grid grid-cols-1 gap-1 rounded-2xl bg-card px-4 py-3.5">
      <Link href={`/vyrobnyky/${s.slug}`} className="text-[16.5px] leading-snug font-semibold">
        {cleanName(s.name)}
      </Link>
      {(addr || s.instagram) && (
        <span className="text-[13px] break-words text-umber">
          {addr}
          {addr && s.instagram ? ' · ' : ''}
          {s.instagram ? (
            <a href={s.instagram} target="_blank" rel="noopener nofollow" className="text-umber">
              @{igHandle(s.instagram)}
            </a>
          ) : null}
        </span>
      )}
      {about && <span className="line-clamp-2 text-sm text-umber">{about}</span>}
      {stale && <span className="text-[12.5px] text-terra">{stale}</span>}
      {(chips.length > 0 || exhibiting) && (
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          {exhibiting && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-umber">виставки</span>}
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-umber">
              {c}
            </span>
          ))}
        </span>
      )}
    </li>
  )
}
