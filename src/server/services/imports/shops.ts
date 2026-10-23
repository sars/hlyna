import { and, eq } from 'drizzle-orm'

import type { Db } from '../../db'
import { itemPhotos, items } from '../../db/schema/items'
import { uploadImage } from '../../media'
import type { Actor, Exec } from '../audit'
import { recordCheck, upsertItem } from '../items'
import { categoryOf } from './igItems'

// Partner shops → items. Only studios that agreed to the 10 % (consent_requests) are read; everyone else is in the
// catalogue through Instagram only (owner, 19.10.2026). A partner's product photos and its own description come along
// (PHOTOS=1 in read-shops.ts): the photos go to `media` and `item_photos` with the studio's credit, the description
// stays internal (evidence.sourceDescription) and our own text is written through scripts/app/edit-items.ts.

export type ShopMedia = { url: string; width: number | null; height: number | null }
export type ShopProduct = { id: string; name: string; url: string; price: number | null; inStock: boolean; sku: string | null; media: ShopMedia[] }
export type ShopDetails = { description: string | null; extra: { title: string; text: string }[] }

const WIX_MEDIA = 'https://static.wixstatic.com/media/'
/** «57bda3_…~mv2.png/v1/fit/w_3024,h_4032,q_90/file.png» → the original file's URL. */
const wixMediaUrl = (u: string) => (u.startsWith('http') ? u : `${WIX_MEDIA}${u.split('/v1/')[0]}`)

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
      const media = Array.isArray(r.media)
        ? (r.media as Record<string, unknown>[])
            .filter((m) => typeof m.url === 'string' && (m.mediaType == null || m.mediaType === 'PHOTO' || m.mediaType === 'image'))
            .map((m) => ({ url: wixMediaUrl(m.url as string), width: typeof m.width === 'number' ? m.width : null, height: typeof m.height === 'number' ? m.height : null }))
        : []
      products.push({
        id: r.id,
        name: r.name,
        url: `${origin}/product-page/${encodeURIComponent(r.urlPart)}`,
        price: typeof r.price === 'number' ? r.price : null,
        inStock: r.isInStock,
        sku: typeof r.sku === 'string' && r.sku ? r.sku : null,
        media,
      })
      return
    }
    if (typeof r.totalCount === 'number') total = Math.max(total ?? 0, r.totalCount)
    Object.values(r).forEach(walk)
  }
  walk(JSON.parse(raw))
  return { products, total }
}

/** Wix «ricos» rich text (a JSON document of paragraph nodes) or HTML → plain paragraphs. */
export function wixText(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const doc = JSON.parse(raw) as { nodes?: { nodes?: { textData?: { text?: string } }[] }[] }
    const paras = (doc.nodes ?? []).map((n) => (n.nodes ?? []).map((x) => x.textData?.text ?? '').join('').trim()).filter(Boolean)
    return paras.length ? paras.join('\n') : null
  } catch {
    const t = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim()
    return t || null
  }
}

/** The product page: the studio's description and its info sections («Характеристики», «Доставка»). */
export function wixProductDetails(html: string): ShopDetails {
  const raw = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  if (!raw) return { description: null, extra: [] }
  let found: Record<string, unknown> | null = null
  const walk = (o: unknown): void => {
    if (found) return
    if (Array.isArray(o)) return o.forEach(walk)
    if (!o || typeof o !== 'object') return
    const r = o as Record<string, unknown>
    if (typeof r.urlPart === 'string' && 'description' in r) {
      found = r
      return
    }
    Object.values(r).forEach(walk)
  }
  walk(JSON.parse(raw))
  if (!found) return { description: null, extra: [] }
  const f = found as Record<string, unknown>
  const extra = Array.isArray(f.additionalInfo)
    ? (f.additionalInfo as Record<string, unknown>[]).flatMap((a) => {
        const text = wixText(typeof a.description === 'string' ? a.description : null)
        return typeof a.title === 'string' && text ? [{ title: a.title, text }] : []
      })
    : []
  return { description: wixText(typeof f.description === 'string' ? f.description : null), extra }
}

/** «Чашка "Злива" » → «Чашка «Злива»». */
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/"([^"]+)"/g, '«$1»')

/**
 * One successful read of a partner's shop: creates or updates its items, logs a check for each, and marks the products that
 * left the shop as gone. A read that found nothing, or fewer products than the shop says it has, marks nothing as gone.
 * `details` (per product id) keeps the studio's own text internally, for our rewrite.
 */
export async function applyShopRead(ex: Exec, studioId: number, read: { products: ShopProduct[]; total: number | null }, today: string, actor: Actor, details?: Map<string, ShopDetails>) {
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
    const d = details?.get(p.id)
    const evidence = { ...(cur?.evidence ?? {}), ...(p.sku ? { sku: p.sku } : {}), ...(d?.description ? { sourceDescription: d.description } : {}), ...(d?.extra.length ? { sourceExtra: d.extra } : {}) }
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
        ...(Object.keys(evidence).length ? { evidence } : {}),
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

const MAX_PHOTOS = 6

/**
 * Fetches a partner's product photos into `media` and links them to the items (in the shop's order). Items that already
 * have photos are left alone unless `force`. The same bytes twice (the dedupe in uploadImage) never make a second file.
 */
export async function attachShopPhotos(db: Db, studio: { id: number; slug: string; name: string }, products: ShopProduct[], actor: Actor, opts: { force?: boolean; fetcher?: (url: string) => Promise<Buffer | null> } = {}) {
  const fetcher =
    opts.fetcher ??
    (async (url: string) => {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hlyna.com.ua catalogue)' }, signal: AbortSignal.timeout(30_000) }).catch(() => null)
      return res?.ok ? Buffer.from(await res.arrayBuffer()) : null
    })
  const log: string[] = []
  let added = 0
  for (const p of products) {
    if (!p.media.length) continue
    const [it] = await db.select({ id: items.id, slug: items.slug, title: items.title }).from(items).where(and(eq(items.studioId, studio.id), eq(items.sourceKey, p.id))).limit(1)
    if (!it) continue
    const have = await db.select({ mediaId: itemPhotos.mediaId, position: itemPhotos.position }).from(itemPhotos).where(eq(itemPhotos.itemId, it.id))
    if (have.length && !opts.force) continue
    let position = have.length ? Math.max(...have.map((h) => h.position)) + 1 : 0
    for (const [i, m] of p.media.slice(0, MAX_PHOTOS).entries()) {
      const bytes = await fetcher(m.url)
      if (!bytes) { log.push(`${it.title}: photo ${i + 1} not fetched`); continue }
      const ext = m.url.match(/\.(png|webp)(?:$|\/|\?)/i)?.[1]?.toLowerCase() ?? 'jpg'
      const up = await uploadImage(db, { bytes, fileName: `${studio.slug}-${it.slug}-${i + 1}.${ext}`, alt: `${it.title} — ${studio.name}, фото студії`, studioSlug: studio.slug, status: 'active' }, actor)
      if (have.some((h) => h.mediaId === up.id)) continue
      await db.insert(itemPhotos).values({ itemId: it.id, mediaId: up.id, position: position++ }).onConflictDoNothing()
      added++
      log.push(`${it.title}: photo ${i + 1} ${up.duplicate ? 'already in media' : 'saved'} (#${up.id})`)
    }
  }
  return { added, log }
}
