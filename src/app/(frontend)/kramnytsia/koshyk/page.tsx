import type { Metadata } from 'next'
import React from 'react'

import { CartPage } from '@/components/shop/CartPage.client'
import { ShopToastHost } from '@/components/shop/ShopToast.client'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { cx, wrap } from '@/components/ui/layout'
import { cartCopy, shop } from '@/content/shop'
import { getShopCategories } from '@/lib/shopData'
import { ITEM_CATEGORY_LABEL } from '@/shared/options'

export const metadata: Metadata = { title: cartCopy.h1, robots: { index: false, follow: true } }

// The cart (docs/shop/DESIGN.md §1 Кошик): the skeleton is ours, the lines are the browser's.
export default async function CartRoute() {
  const categories = (await getShopCategories()).map((c) => ({ label: ITEM_CATEGORY_LABEL[c.slug], href: `/kramnytsia/${c.slug}` }))
  return (
    <main className={cx(wrap, 'grid w-full content-start gap-4 pt-hero pb-section')}>
      <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: shop.name, href: '/kramnytsia' }, { label: cartCopy.h1 }]} />
      <CartPage categories={categories} />
      <ShopToastHost />
    </main>
  )
}
