import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { ShopItemCard } from '@/shop/types'

import { cx } from './layout'
import { PriceLine } from './PriceLine'

// The shop's grid (DESIGN.md §2 ItemGrid): hairline-ruled cells, a 4:5 photo on paper-2, the name, the price line and the
// maker line. The second photo cross-fades in on hover (mouse only) and a mono «N фото» label says there are more.
export function ItemGrid({ items, variant = 'grid', showStudio = true, className }: { items: ShopItemCard[]; variant?: 'grid' | 'compact'; showStudio?: boolean; className?: string }) {
  return (
    <ul className={cx('ui-items', className)} data-variant={variant}>
      {items.map((i, n) => (
        <ItemCell key={i.id} item={i} showStudio={showStudio} priority={variant === 'grid' && n < 4} />
      ))}
    </ul>
  )
}

const sizes = (variant: 'grid' | 'compact') => (variant === 'compact' ? '(min-width:50rem) 25vw, 50vw' : '(min-width:60rem) 25vw, (min-width:50rem) 33vw, 50vw')

export function ItemCell({ item: i, showStudio = true, priority }: { item: ShopItemCard; showStudio?: boolean; priority?: boolean }) {
  const [first, second] = i.photos
  const sold = i.state === 'sold'
  const alt = first?.alt || i.title
  return (
    <li data-sold={sold ? '' : undefined}>
      <Link href={i.path}>
        <span className="ui-item-ph" aria-hidden={!first || undefined}>
          {first && (
            <Image src={first.small} alt={alt} fill sizes={sizes('grid')} priority={priority} loading={priority ? undefined : 'lazy'} style={first.focalY == null ? undefined : { objectPosition: `50% ${first.focalY}%` }} />
          )}
          {second && <Image src={second.small} alt="" fill sizes={sizes('grid')} loading="lazy" data-second="" style={second.focalY == null ? undefined : { objectPosition: `50% ${second.focalY}%` }} />}
          {i.photos.length > 1 && (
            <span className="ui-item-n">{i.photos.length} фото</span>
          )}
        </span>
        <span className="ui-name font-display text-[15.5px] leading-[1.2] font-semibold">{i.title}</span>
        <PriceLine priceKop={i.priceKop} state={i.state} lead={i.lead} size="sm" />
        {showStudio && (
          <span className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
            {i.studio.name}
            {i.studio.city ? ` · ${i.studio.city}` : ''}
          </span>
        )}
      </Link>
    </li>
  )
}
