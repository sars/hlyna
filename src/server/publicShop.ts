import 'server-only'

import { and, asc, eq, inArray, or } from 'drizzle-orm'

import { db } from './db'
import { cities, media, studios } from './db/schema/catalog'
import { itemPhotos, items, type ItemSpec } from './db/schema/items'
import { canOrder, effectiveTerms, itemState, type EffectiveTerms, type ItemState } from '../lib/shop'
import { shopName } from '../lib/present'
import type { ItemCategory } from '../shared/options'

// What the shop pages read (docs/shop/PLAN.md): the items of partner studios (consent_requests) with their photos and
// the studio's shop terms, shaped once here and cached in src/lib/shopData.ts under the `items` tag.

export type ShopPhoto = { url: string; small: string; full: string; alt: string; width: number; height: number; focalY: number | null }

export type ShopStudio = {
  id: number
  slug: string
  name: string
  city: string | null
  citySlug: string | null
  address: string | null
  instagram: string | null
  website: string | null
  phone: string | null
  email: string | null
  type: string | null
  terms: EffectiveTerms
  updatedAt: string
}

export type ShopItem = {
  id: number
  slug: string
  path: string
  studio: ShopStudio
  title: string
  category: ItemCategory
  kind: 'piece' | 'series' | 'to_order'
  availability: 'in_stock' | 'to_order' | 'unknown' | 'sold'
  visibility: 'public' | 'hidden'
  fulfillment: 'ship' | 'digital'
  state: ItemState
  orderable: boolean
  priceMin: number | null
  priceMax: number | null
  priceText: string | null
  description: string | null
  photoFact: string | null
  terms: string | null
  specs: ItemSpec[]
  leadDaysMin: number | null
  leadDaysMax: number | null
  stock: number | null
  confirmedAt: string | null
  postedAt: string | null
  updatedAt: string
  sourceUrl: string
  photos: ShopPhoto[]
}

const toPhoto = (m: typeof media.$inferSelect): ShopPhoto => {
  const med = m.variants?.medium
  const small = m.variants?.small ?? m.variants?.thumbnail
  return {
    url: `/media/${med?.file ?? m.fileName}`,
    small: `/media/${small?.file ?? med?.file ?? m.fileName}`,
    full: `/media/${m.fileName}`,
    alt: m.alt ?? '',
    width: med?.width ?? m.width ?? 900,
    height: med?.height ?? m.height ?? 1200,
    focalY: m.focalY,
  }
}

/**
 * Every item of every partner studio that is public (listed), plus — when `withHidden` — the ones hidden as sold, stale
 * or gone (their pages stay up with the state said plainly; research/seo-llm.md §5). Hidden studios never appear.
 */
export async function loadShopItems(withHidden = false): Promise<ShopItem[]> {
  const rows = await db
    .select({ item: items, studio: studios, cityName: cities.name, citySlug: cities.slug })
    .from(items)
    .innerJoin(studios, eq(studios.id, items.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(
      and(
        eq(studios.consentRequests, true),
        eq(studios.visibility, 'public'),
        withHidden ? or(eq(items.visibility, 'public'), inArray(items.hiddenReason, ['sold', 'stale', 'gone'])) : eq(items.visibility, 'public'),
      ),
    )
    .orderBy(asc(items.studioId), asc(items.id))
  if (!rows.length) return []
  const photoRows = await db
    .select({ itemId: itemPhotos.itemId, position: itemPhotos.position, m: media })
    .from(itemPhotos)
    .innerJoin(media, eq(media.id, itemPhotos.mediaId))
    .where(and(inArray(itemPhotos.itemId, rows.map((r) => r.item.id)), eq(media.status, 'active')))
    .orderBy(asc(itemPhotos.itemId), asc(itemPhotos.position))
  const photos = new Map<number, ShopPhoto[]>()
  for (const p of photoRows) photos.set(p.itemId, [...(photos.get(p.itemId) ?? []), toPhoto(p.m)])
  const studioOf = new Map<number, ShopStudio>()
  return rows.map(({ item: i, studio: s, cityName, citySlug }) => {
    let st = studioOf.get(s.id)
    if (!st) {
      st = {
        id: s.id,
        slug: s.slug,
        name: shopName(s),
        city: cityName,
        citySlug,
        address: s.address,
        instagram: s.instagram,
        website: s.website,
        phone: s.phone,
        email: s.email,
        type: s.type,
        terms: effectiveTerms(s.shopTerms, s.address),
        updatedAt: s.updatedAt,
      }
      studioOf.set(s.id, st)
    }
    return {
      id: i.id,
      slug: i.slug,
      path: `/kramnytsia/${s.slug}/${i.slug}`,
      studio: st,
      title: i.title,
      category: i.category,
      kind: i.kind,
      availability: i.availability,
      visibility: i.visibility,
      fulfillment: i.fulfillment,
      state: itemState(i),
      orderable: canOrder(i, s),
      priceMin: i.priceMin,
      priceMax: i.priceMax,
      priceText: i.priceText,
      description: i.description,
      photoFact: i.photoFact,
      terms: i.terms,
      specs: i.specs ?? [],
      leadDaysMin: i.leadDaysMin,
      leadDaysMax: i.leadDaysMax,
      stock: i.stock,
      confirmedAt: i.confirmedAt,
      postedAt: i.postedAt,
      updatedAt: i.updatedAt,
      sourceUrl: i.sourceUrl,
      photos: photos.get(i.id) ?? [],
    }
  })
}
