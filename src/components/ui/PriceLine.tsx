import React from 'react'

import { stateText } from '@/content/shop'
import { uah, type ItemState } from '@/lib/shop'

import { cx } from './layout'

// Price and state in one line (DESIGN.md §2 PriceLine): the price in cobalt Unbounded, the state a mono note after it.
// In a grid an in-stock series says nothing; «Продано» is terracotta text, the price then goes ink-2.
export function PriceLine({ priceKop, state, lead, size = 'sm', className }: { priceKop: number; state: ItemState; lead?: string | null; size?: 'sm' | 'lg'; className?: string }) {
  const sold = state === 'sold'
  const text = stateText(state, size === 'lg' ? 'buy' : 'grid', lead)
  return (
    <p className={cx('m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1', className)}>
      <span className={cx('font-display font-semibold whitespace-nowrap tabular-nums', size === 'lg' ? 'text-[clamp(24px,2.4vw,30px)] leading-none' : 'text-base leading-none', sold ? 'text-ink-2' : 'text-cobalt')}>
        {uah(priceKop)}
      </span>
      {text && (
        <small className={cx('font-mono tracking-[.04em] uppercase', size === 'lg' ? 'text-xs' : 'text-[11.5px]', sold ? 'font-medium text-terracotta-text' : 'text-ink-2')}>
          {text}
        </small>
      )}
    </p>
  )
}
