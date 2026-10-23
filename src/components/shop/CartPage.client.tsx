'use client'

import Link from 'next/link'
import React, { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Kicker } from '@/components/ui/Kicker'
import { buttons, cartCopy } from '@/content/shop'
import { track } from '@/lib/track'
import { cart, cartTotal, gaItems, groupCart, useCart } from '@/shop/cart'

import { CartLine } from './CartLine.client'
import { OrderSummary } from './OrderSummary'
import { ShopBuyBar } from './ShopBuyBar.client'
import { showToast } from './ShopToast.client'

const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false)

// The cart page's body (DESIGN.md §1 Кошик): groups by studio, the summary aside, the phone bar. The page skeleton
// around it is server-rendered; this part knows the browser's cart.
export function CartPage({ categories }: { categories: { label: string; href: string }[] }) {
  const lines = useCart()
  const hydrated = useHydrated()
  if (!hydrated) return <div className="min-h-[40vh]" aria-busy="true" />
  if (!lines.length)
    return (
      <div className="grid max-w-narrow gap-4">
        <Kicker>Крамниця</Kicker>
        <h1 className="m-0 font-display text-h1">{cartCopy.emptyH1}</h1>
        <p className="m-0 text-lead text-ink-2">{cartCopy.emptyText}</p>
        <div>
          <Button href="/kramnytsia" variant="ink" arrow>
            {buttons.toShop}
          </Button>
        </div>
        {categories.length > 0 && (
          <ChipGroup as="nav" label="Категорії:" aria-label="Категорії">
            {categories.map((c) => (
              <Chip key={c.href} href={c.href}>
                {c.label}
              </Chip>
            ))}
          </ChipGroup>
        )}
      </div>
    )
  const groups = groupCart(lines)
  const remove = (itemId: number) => {
    const gone = cart.remove(itemId)
    if (!gone) return
    track('remove_from_cart', { currency: 'UAH', value: (gone.priceKop * gone.qty) / 100, items: JSON.stringify(gaItems([gone])) })
    showToast({ kind: 'removed', line: gone, count: 0 })
  }
  const cta = (
    <Button href="/kramnytsia/oformlennia" variant="cobalt" full arrow>
      {buttons.toCheckout}
    </Button>
  )
  return (
    <>
      <div className="grid gap-4">
        <Kicker>Крамниця</Kicker>
        <h1 className="m-0 font-display text-h1">{cartCopy.h1}</h1>
        <p className="m-0 text-[15.5px] text-ink-2">{cartCopy.lead}</p>
      </div>
      <div className="grid items-start gap-[clamp(28px,4vw,56px)] pt-[clamp(24px,3vw,40px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid min-w-0 gap-7">
          {groups.map((g) => (
            <section key={g.studio.slug} aria-label={g.studio.name}>
              <Kicker as="p" className="m-0 border-b border-rule pb-2">
                <Link href={`/kramnytsia/${g.studio.slug}`} className="text-ink-2 no-underline hover:text-cobalt">
                  {g.studio.name}
                </Link>
                {g.studio.city ? ` · ${g.studio.city}` : ''} · {cartCopy.ships}
              </Kicker>
              <ul className="m-0 list-none p-0">
                {g.lines.map((l) => (
                  <CartLine key={l.itemId} line={l} onQty={(q) => cart.setQty(l.itemId, q)} onRemove={() => remove(l.itemId)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="lg:sticky lg:top-[84px]">
          <OrderSummary groups={groups} cta={cta} note="Доставку рахує перевізник при відправці; студія назве термін після підтвердження." />
        </div>
      </div>
      <ShopBuyBar priceKop={cartTotal(lines)} note="разом" label={buttons.checkout} watch="#order-summary" href="/kramnytsia/oformlennia" />
    </>
  )
}
