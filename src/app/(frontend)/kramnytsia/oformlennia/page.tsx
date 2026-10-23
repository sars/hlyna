import type { Metadata } from 'next'
import React from 'react'

import { CheckoutForm } from '@/components/shop/CheckoutForm.client'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { cartCopy, checkoutCopy, shop } from '@/content/shop'
import { getShopStudios } from '@/lib/shopData'

export const metadata: Metadata = { title: checkoutCopy.h1, robots: { index: false, follow: true } }

// Checkout (docs/shop/DESIGN.md §1 Оформлення): one page, guest only. The studios' terms travel to the form so the
// delivery and payment rows match the cart's studios; an empty cart sends the visitor back to the cart.
export default async function CheckoutRoute() {
  const studios = Object.fromEntries((await getShopStudios()).map((s) => [s.slug, { name: s.name, terms: s.terms }]))
  return (
    <main className={cx(wrap, 'grid w-full content-start gap-4 pt-hero pb-section')}>
      <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: shop.name, href: '/kramnytsia' }, { label: cartCopy.h1, href: '/kramnytsia/koshyk' }, { label: checkoutCopy.h1 }]} />
      <div className="grid gap-4">
        <Kicker>{shop.name}</Kicker>
        <h1 className="m-0 font-display text-h1">{checkoutCopy.h1}</h1>
        <p className="m-0 text-[15.5px] text-ink-2">{checkoutCopy.lead}</p>
      </div>
      <CheckoutForm studios={studios} />
    </main>
  )
}
