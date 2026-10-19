import { and, eq } from 'drizzle-orm'

import { items } from '../../db/schema/items'
import type { Actor, Exec } from '../audit'
import { recordCheck, upsertItem } from '../items'
import { categoryOf } from './igItems'

// Partner shops → items. Only studios that agreed to the 10 % (consent_requests) are read; everyone else is in the
// catalogue through Instagram only (owner, 19.10.2026).

export type ShopProduct = { id: string; name: string; url: string; price: number | null; inStock: boolean }

/** Products of a Wix Stores category page: the «wix-warmup-data» JSON the page ships for its product gallery. */
export function wixProducts(html: string, origin: string): { products: ShopProduct[]; total: number | null } {
  const raw = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  if (!raw) return { products: [], total: null }
  const products: ShopProduct[] = []
  let total: number | null = null
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) return o.forEach(walk)
    if (!o || typeof o !== 'object') return
    const r = o as Record<string, unknown>
    if (typeof r.id === 'string' && typeof r.name === 'string' && typeof r.urlPart === 'string' && typeof r.isInStock === 'boolean') {
      products.push({ id: r.id, name: r.name, url: `${origin}/product-page/${encodeURIComponent(r.urlPart)}`, price: typeof r.price === 'number' ? r.price : null, inStock: r.isInStock })
      return
    }
    if (typeof r.totalCount === 'number') total = Math.max(total ?? 0, r.totalCount)
    Object.values(r).forEach(walk)
  }
  walk(JSON.parse(raw))
  return { products, total }
}

/** «Чашка "Злива" » → «Чашка «Злива»». */
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/"([^"]+)"/g, '«$1»')

/**
 * One successful read of a partner's shop: creates or updates its items, logs a check for each, and marks the products that
 * left the shop as gone. A read that found nothing, or fewer products than the shop says it has, marks nothing as gone.
 */
export async function applyShopRead(ex: Exec, studioId: number, read: { products: ShopProduct[]; total: number | null }, today: string, actor: Actor) {
  const counts = { created: 0, updated: 0, unchanged: 0, gone: 0, noCategory: 0 }
  const log: string[] = []
  const old = await ex.select().from(items).where(and(eq(items.studioId, studioId), eq(items.source, 'shop')))
  const byKey = new Map(old.map((i) => [i.sourceKey, i]))
  for (const p of read.products) {
    const title = cleanName(p.name)
    const cur = byKey.get(p.id)
    const category = cur?.category ?? categoryOf(title)
    if (!category) { counts.noCategory++; log.push(`no category: ${title}`); continue }
    const availability = p.inStock ? ('in_stock' as const) : ('sold' as const)
    const priceText = p.price != null ? `${p.price} грн` : null
    const r = await upsertItem(
      ex,
      studioId,
      {
        sourceKey: p.id,
        source: 'shop',
        sourceUrl: p.url,
        postedAt: cur?.postedAt ?? today,
        title,
        category,
        kind: cur?.kind ?? 'series',
        priceText,
        priceMin: p.price,
        priceMax: p.price,
        availability,
        availabilityText: p.inStock ? 'В наявності на сайті студії' : 'Продано на сайті студії',
        confirmedAt: p.inStock ? today : (cur?.confirmedAt ?? null),
        sourceGone: false,
      },
      actor,
    )
    counts[r.action]++
    const signal = !cur || cur.availability !== availability || cur.sourceGone ? (p.inStock ? 'available' : 'sold') : cur.priceText !== priceText ? 'price_changed' : 'none'
    await recordCheck(ex, r.id, { signal, postAlive: true, priceSeen: priceText }, actor)
    log.push(`${r.action.padEnd(9)} ${availability.padEnd(8)} ${priceText ?? '–'} · ${title}`)
  }
  const complete = read.products.length > 0 && (read.total == null || read.products.length >= read.total)
  if (!complete) log.push(`partial read (${read.products.length} of ${read.total ?? '?'}): nothing marked as gone`)
  const seen = new Set(read.products.map((p) => p.id))
  for (const i of old) {
    if (!complete || seen.has(i.sourceKey) || i.sourceGone) continue
    await upsertItem(ex, studioId, { sourceKey: i.sourceKey, source: 'shop', sourceUrl: i.sourceUrl, title: i.title, category: i.category, sourceGone: true }, actor)
    await recordCheck(ex, i.id, { signal: 'gone', postAlive: false }, actor)
    counts.gone++
    log.push(`gone      ${i.title}`)
  }
  return { counts, log }
}
