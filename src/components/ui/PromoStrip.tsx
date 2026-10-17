import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { SitePhoto } from '@/content/photos'

import { Kicker } from './Kicker'
import { cx } from './layout'

// A seasonal pointer to one page: a ruled row (1px rules, no background) with a square photo, kicker, title, one line of
// facts and the arrow cue. The whole row is one link, so one tap on a phone; the request CTA of the page stays the only
// button. `promo` and `place` land in `data-promo` / `data-promo-place`, which Analytics.tsx turns into the GA4 event
// `promo_click` (promo_id, promo_place). Campaigns and their dates live in src/content/promos.ts; components/site/SeasonPromo.tsx places them.
export function PromoStrip({ href, photo, kicker, title, text, cta, promo, place, className }: { href: string; photo: SitePhoto; kicker: string; title: string; text: string; cta: string; promo: string; place: string; className?: string }) {
  return (
    <Link
      href={href}
      data-promo={promo}
      data-promo-place={place}
      className={cx(
        'group/promo grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 border-y border-rule py-3.5 text-ink no-underline hover:text-ink sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-4',
        className,
      )}
    >
      <span className="block size-[88px] overflow-hidden sm:size-[112px] lg:size-[128px]">
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(min-width:960px) 128px, (min-width:640px) 112px, 88px" className="size-full object-cover transition-transform duration-[.6s] group-hover/promo:scale-[1.04] motion-reduce:transition-none" />
      </span>
      <span className="grid min-w-0 content-center gap-1.5">
        <Kicker>{kicker}</Kicker>
        <b className="font-display text-[17px] leading-[1.15] font-semibold group-hover/promo:text-cobalt sm:text-[19px]">{title}</b>
        <span className="max-w-[62ch] text-[15px] leading-[1.4] text-ink-2">{text}</span>
      </span>
      <span className="col-start-2 inline-flex items-center gap-1.5 font-display text-[12.5px] leading-none font-semibold tracking-[.04em] whitespace-nowrap uppercase sm:col-start-auto sm:justify-self-end">
        {cta}
        <span className="ui-arrow group-hover/promo:translate-x-1" aria-hidden>
          →
        </span>
      </span>
    </Link>
  )
}
