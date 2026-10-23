'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Facts } from '@/components/ui/Facts'
import { MakerLine } from '@/components/ui/MakerLine'
import { PriceLine } from '@/components/ui/PriceLine'
import { QtyStepper } from '@/components/ui/QtyStepper.client'
import { buttons, stateText } from '@/content/shop'
import { track } from '@/lib/track'
import { cart, cartCount, gaItems, MAX_QTY, useCart } from '@/shop/cart'
import type { ShopItemCard } from '@/shop/types'

import { ShopBuyBar } from './ShopBuyBar.client'
import { showToast } from './ShopToast.client'

// The buy box of an item page (DESIGN.md §2 BuyBox): price and state, one sentence, quantity + «У кошик», the facts a
// buyer wants before paying, the maker. Sold: «Замовити подібне» to the request instead.
export function BuyBox({ item, facts, studioType }: { item: ShopItemCard; facts: [string, React.ReactNode][]; studioType?: string | null }) {
  const [qty, setQty] = useState(1)
  const lines = useCart()
  const sold = item.state === 'sold' || !item.orderable
  const max = item.state === 'piece' ? 1 : Math.min(MAX_QTY, item.stock ?? MAX_QTY)
  const similar = `/zapyt?what=other&studio=${encodeURIComponent(item.studio.slug)}&item=${encodeURIComponent(item.slug)}`
  const add = () => {
    const line = cart.add(item, qty)
    track('add_to_cart', { currency: 'UAH', value: (item.priceKop / 100) * qty, items: JSON.stringify(gaItems([{ ...line, qty }])) })
    showToast({ kind: 'added', line, count: cartCount(cart.lines()) })
  }
  return (
    <>
      <section id="buy-box" aria-labelledby="buy-box-h" className="grid gap-3.5 border-t-2 border-ink pt-4">
        <h2 id="buy-box-h" className="sr-only">
          Купити
        </h2>
        <PriceLine priceKop={item.priceKop} state={item.state} lead={item.lead} size="lg" />
        <p className="m-0 text-[14.5px] leading-[1.45] text-ink-2">{stateText(item.state, 'explain', item.lead)}</p>
        {sold ? (
          <div className="flex flex-wrap gap-2.5">
            <Button href={similar} variant="ink" arrow>
              {buttons.similar}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2.5">
            {item.state !== 'piece' && max > 1 && <QtyStepper value={qty} max={max} onChange={setQty} />}
            <Button variant="cobalt" arrow className="min-w-0 flex-1" onClick={add}>
              {buttons.add}
            </Button>
          </div>
        )}
        <div className="ui-buy-facts">
          <Facts rows={facts} />
        </div>
        <MakerLine studio={{ ...item.studio, type: studioType }} />
      </section>
      <ShopBuyBar priceKop={item.priceKop} note={item.state === 'to_order' ? 'під замовлення' : lines.length ? `у кошику: ${cartCount(lines)}` : null} label={sold ? buttons.similar : buttons.add} tone={sold ? 'ink' : 'cobalt'} watch="#buy-box" {...(sold ? { href: similar } : { onClick: add })} />
    </>
  )
}
