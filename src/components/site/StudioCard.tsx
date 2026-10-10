import Link from 'next/link'
import React from 'react'

import { TYPE_LABEL, type StudioCard as Card } from '@/lib/catalog'

// Text-first card: no photo until the studio gives consent (AGENTS.md → photos).
export function StudioCard({ s, showCity = true }: { s: Card; showCity?: boolean }) {
  const first = s.summary || (s.publicDescription ?? s.description ?? '').split(/(?<=[.!?])\s/)[0]
  return (
    <Link href={`/vyrobnyky/${s.slug}`} className="grid grid-cols-1 content-start gap-2 rounded-[20px] border border-transparent bg-card p-4 text-ink no-underline hover:border-line hover:text-ink">
      <span className="flex flex-wrap gap-1.5 text-[11.5px] font-bold">
        <span className="rounded-full bg-sand px-2 py-0.5 text-umber">{TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'}</span>
        {showCity && s.cityDoc && <span className="rounded-full bg-sand px-2 py-0.5 text-umber">{s.cityDoc.name}</span>}
        {!!s.prices?.length && <span className="rounded-full bg-[#e7ecf7] px-2 py-0.5 text-cobalt">є ціни</span>}
      </span>
      <span className="text-[17px] leading-snug font-semibold">{s.name}</span>
      {first && <span className="line-clamp-3 text-sm text-umber">{first}</span>}
      <span className="text-sm font-bold text-cobalt">Профіль →</span>
    </Link>
  )
}
