import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { loadShopItems, type ShopItem, type ShopStudio } from '@/server/publicShop'
import { ITEM_CATEGORIES, type ItemCategory } from '@/shared/options'

import { MIN_LIST } from './catalog'
import { SHOP_RESERVED } from './shop'

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

/** The price span of listed items, in whole hryvnias; null when nothing has a price. */
export function priceSpan(items: ShopItem[]): { min: number; max: number } | null {
  const xs = items.map((i) => i.priceMin).filter((p): p is number => p != null && p > 0)
  return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null
}

/** The newest change among items and their studios: `lastmod` and «Оновлено». */
export const latestItemUpdate = (items: ShopItem[]) => items.reduce<string | null>((m, i) => (i.updatedAt > (m ?? '') ? i.updatedAt : m), null)
