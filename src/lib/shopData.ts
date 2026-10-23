import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { loadShopItems, type ShopItem, type ShopStudio } from '@/server/publicShop'
import { ITEM_CATEGORIES, type ItemCategory } from '@/shared/options'
import type { ShopItemCard } from '@/shop/types'

import { MIN_LIST } from './catalog'
import { leadText, SHOP_RESERVED } from './shop'

// The shop's reads for pages: one cached load of every partner item (tag `items`, refreshed by writes through
// src/server/revalidate.ts and by the daily read-shops.ts run), then plain filters. Scripts bypass the cache.
const cachedItems = unstable_cache(() => loadShopItems(true), ['shop-items-v1'], { revalidate: false, tags: ['items'] })

/** Every partner item, listed or not (sold / stale / gone pages stay up). */
export const getShopItemsAll = cache((): Promise<ShopItem[]> => (process.env.HLYNA_SCRIPT === '1' ? loadShopItems(true) : cachedItems()))

/** The items the shop lists: public ones, in stock or orderable first, then the rest. */
export const getShopItems = cache(async (): Promise<ShopItem[]> => {
  const all = (await getShopItemsAll()).filter((i) => i.visibility === 'public')
  const rank = (i: ShopItem) => (i.orderable ? 0 : i.state === 'sold' ? 2 : 1)
  return all.sort((a, b) => rank(a) - rank(b) || (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? '') || a.id - b.id)
})

export const getShopItem = cache(async (studioSlug: string, itemSlug: string): Promise<ShopItem | null> => (await getShopItemsAll()).find((i) => i.studio.slug === studioSlug && i.slug === itemSlug) ?? null)

/** Partner studios with at least one listed item. */
export const getShopStudios = cache(async (): Promise<(ShopStudio & { items: ShopItem[] })[]> => {
  const by = new Map<number, ShopStudio & { items: ShopItem[] }>()
  for (const i of await getShopItems()) {
    const s = by.get(i.studio.id) ?? { ...i.studio, items: [] }
    s.items.push(i)
    by.set(i.studio.id, s)
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
})

export type ShopCategory = { slug: ItemCategory; items: ShopItem[] }
/** Categories with enough listed items for a page of their own (the site's «no thin pages» rule). */
export const getShopCategories = cache(async (): Promise<ShopCategory[]> => {
  const all = await getShopItems()
  return ITEM_CATEGORIES.map((slug) => ({ slug, items: all.filter((i) => i.category === slug) })).filter((c) => c.items.length >= MIN_LIST)
})

export const isShopCategory = (s: string): s is ItemCategory => (ITEM_CATEGORIES as readonly string[]).includes(s)
export const isShopReserved = (s: string) => SHOP_RESERVED.has(s)

/** The small view a card, the cart and the buy box use (serialisable for client components). */
export const cardOf = (i: ShopItem): ShopItemCard => ({
  id: i.id,
  slug: i.slug,
  path: i.path,
  title: i.title,
  category: i.category,
  priceKop: (i.priceMin ?? 0) * 100,
  state: i.state,
  lead: leadText(i.leadDaysMin, i.leadDaysMax),
  fulfillment: i.fulfillment,
  orderable: i.orderable,
  stock: i.stock,
  studio: { slug: i.studio.slug, name: i.studio.name, city: i.studio.city },
  photos: i.photos.map((p) => ({ small: p.small, url: p.url, alt: p.alt, width: p.width, height: p.height, focalY: p.focalY })),
})

/** Up to `n` other listed items: the same category first, then the same studio, never the item itself. */
export function similarItems(all: ShopItem[], i: ShopItem, n = 6): ShopItem[] {
  const listed = all.filter((x) => x.id !== i.id && x.visibility === 'public' && x.state !== 'sold')
  const same = listed.filter((x) => x.category === i.category)
  const studio = listed.filter((x) => x.studio.id === i.studio.id && !same.includes(x))
  return [...same, ...studio, ...listed.filter((x) => !same.includes(x) && !studio.includes(x))].slice(0, n)
}

/** The price span of listed items, in whole hryvnias; null when nothing has a price. */
export function priceSpan(items: ShopItem[]): { min: number; max: number } | null {
  const xs = items.map((i) => i.priceMin).filter((p): p is number => p != null && p > 0)
  return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null
}

/** «24 жовтня 2026» from an ISO date, Kyiv time. */
export const shopDate = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).format(new Date(iso)).replace(/\s*р\.$/, '') : '')

/** The newest change among items and their studios: `lastmod` and «Оновлено». */
export const latestItemUpdate = (items: ShopItem[]) => items.reduce<string | null>((m, i) => (i.updatedAt > (m ?? '') ? i.updatedAt : m), null)
