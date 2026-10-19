// Public catalogue reads: published studios in the record shape the pages render (publicShape.ts), sorted by name,
// with internal fields (owner «about», unapproved quote, consent, sources…) left out.
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { City, Studio } from '@/types/catalog'
import { db, schema } from './db'
import { toPublicCity, toPublicStudio } from './publicShape'

const { studios, studioPrices, cities, studioPhotos, media, studioSlugHistory, citySlugHistory } = schema

// Internal fields never shown to anonymous readers.
const HIDDEN = ['sources', 'consent', 'sourceId', 'confidence', 'ownerAbout'] as const

// Published studios, optionally one shard of them (id % of = index) so a cached part stays small. `order` is the
// position in the whole catalogue (by name, database collation), so merged shards keep the same order.
export async function loadPublicStudios(shard?: { index: number; of: number }): Promise<(Studio & { order: number })[]> {
  const ordered = db.$with('ordered').as(
    db
      .select({ id: studios.id, order: sql<number>`row_number() over (order by ${studios.name}, ${studios.id})`.mapWith(Number).as('order') })
      .from(studios)
      .where(eq(studios.visibility, 'public')),
  )
  const found = await db
    .with(ordered)
    .select({ row: studios, order: ordered.order })
    .from(studios)
    .innerJoin(ordered, eq(ordered.id, studios.id))
    .where(shard ? sql`${studios.id} % ${shard.of} = ${shard.index}` : undefined)
    .orderBy(ordered.order)
  const rows = found.map((f) => f.row)
  const orderOf = new Map(found.map((f) => [f.row.id, f.order]))
  const ids = rows.map((r) => r.id)
  const prices = ids.length ? await db.select().from(studioPrices).where(inArray(studioPrices.studioId, ids)) : []
  const byStudio = new Map<number, (typeof prices)[number][]>()
  for (const p of prices) byStudio.set(p.studioId, [...(byStudio.get(p.studioId) ?? []), p])

  return rows.map((r) => {
    const doc = toPublicStudio(r, byStudio.get(r.id) ?? []) as Record<string, unknown>
    for (const k of HIDDEN) delete doc[k]
    // ownerQuote is public only once approved.
    if (!r.ownerQuoteApproved) delete doc.ownerQuote
    // Empty services/products are null (the shape pages were built on).
    for (const k of ['services', 'products'] as const) if (Array.isArray(doc[k]) && !(doc[k] as unknown[]).length) doc[k] = null
    return { ...(doc as unknown as Studio), order: orderOf.get(r.id) as number }
  })
}

export async function loadPublicCities(): Promise<City[]> {
  const rows = await db.select().from(cities).orderBy(asc(cities.name), asc(cities.id))
  return rows.map((c) => toPublicCity(c) as unknown as City)
}

/** `focalY`: where a cropped tile keeps the photo, 0 (top) to 100 (bottom); null lets the layout decide. */
export type PublicPhoto = { url: string; full: string; alt: string; width: number; height: number; focalY: number | null }

// Approved photos of a public studio with photo consent, in profile order. Served from /media/* (Caddy; the old
// /api/media/file/* path 301s there).
export async function loadPublicPhotos(studioId: number): Promise<PublicPhoto[]> {
  const [s] = await db
    .select({ consent: studios.consentPhotos, visibility: studios.visibility })
    .from(studios)
    .where(eq(studios.id, studioId))
  if (!s?.consent || s.visibility !== 'public') return []
  const rows = await db
    .select({ fileName: media.fileName, alt: media.alt, width: media.width, height: media.height, variants: media.variants, focalY: media.focalY })
    .from(studioPhotos)
    .innerJoin(media, eq(media.id, studioPhotos.mediaId))
    .where(and(eq(studioPhotos.studioId, studioId), eq(media.status, 'active')))
    .orderBy(asc(studioPhotos.position))
  return rows.map((m) => {
    const large = m.variants?.large
    const big = large?.file ? { file: large.file, width: large.width, height: large.height } : { file: m.fileName, width: m.width, height: m.height }
    return { url: `/media/${big.file}`, full: `/media/${m.fileName}`, alt: m.alt || '', width: big.width || 1400, height: big.height || 933, focalY: m.focalY }
  })
}

// Old slugs after a rename (panel keeps them), so every old URL can 301 to the current one.
export async function currentStudioSlug(oldSlug: string): Promise<string | null> {
  const [r] = await db
    .select({ slug: studios.slug, visibility: studios.visibility })
    .from(studioSlugHistory)
    .innerJoin(studios, eq(studios.id, studioSlugHistory.studioId))
    .where(eq(studioSlugHistory.oldSlug, oldSlug))
  return r && r.visibility === 'public' && r.slug !== oldSlug ? r.slug : null
}

export async function currentCitySlug(oldSlug: string): Promise<string | null> {
  const [r] = await db
    .select({ slug: cities.slug })
    .from(citySlugHistory)
    .innerJoin(cities, eq(cities.id, citySlugHistory.cityId))
    .where(eq(citySlugHistory.oldSlug, oldSlug))
  return r && r.slug !== oldSlug ? r.slug : null
}

// Photos a collection item names by the sha256 of the uploaded file (first 12+ hex, the same in every database copy),
// in the given order. Shown only for a public studio with photo consent and only active media; anything else is
// skipped, so the item falls back to its Instagram embed.
export async function loadItemPhotos(slug: string, shas: string[]): Promise<PublicPhoto[]> {
  const keys = shas.map((h) => h.toLowerCase()).filter((h) => /^[0-9a-f]{12,64}$/.test(h))
  if (!keys.length) return []
  const [s] = await db
    .select({ consent: studios.consentPhotos, visibility: studios.visibility })
    .from(studios)
    .where(eq(studios.slug, slug))
  if (!s?.consent || s.visibility !== 'public') return []
  const rows = await db
    .select({ sha256: media.sha256, fileName: media.fileName, alt: media.alt, width: media.width, height: media.height, variants: media.variants, focalY: media.focalY })
    .from(media)
    .where(and(eq(media.status, 'active'), sql`left(${media.sha256}, 12) in (${sql.join(keys.map((k) => k.slice(0, 12)), sql`, `)})`))
  return keys.flatMap((k) => {
    const m = rows.find((r) => r.sha256?.startsWith(k))
    if (!m) return []
    const med = m.variants?.medium
    const pic = med?.file ? { file: med.file, width: med.width, height: med.height } : { file: m.fileName, width: m.width, height: m.height }
    return [{ url: `/media/${pic.file}`, full: `/media/${m.fileName}`, alt: m.alt || '', width: pic.width || 900, height: pic.height || 1200, focalY: m.focalY }]
  })
}
