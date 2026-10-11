// Public catalogue reads on the new data layer (DATA_BACKEND=app). Returns exactly what lib/catalog.ts got from
// Payload before: published studios in Payload's document shape (via legacy.ts), sorted by name, with the fields
// Payload's field access hides from anonymous readers left out. Pages and lib/* don't change.
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { City, Studio } from '@/payload-types'
import { db, schema } from './db'
import { toLegacyCity, toLegacyStudio } from './legacy'

const { studios, studioPrices, cities, studioPhotos, media, studioSlugHistory, citySlugHistory } = schema

// Fields the Payload query left out (select) or Payload's field access hid from anonymous reads.
const HIDDEN = ['sources', 'consent', 'sourceId', 'confidence', 'photos', 'ownerAbout', 'ownerNews', 'pendingOwnerChanges'] as const

export async function loadPublicCatalog(): Promise<{ studios: Studio[]; cities: City[] }> {
  const [rows, cityRows] = await Promise.all([
    db.select().from(studios).where(eq(studios.visibility, 'public')).orderBy(asc(studios.name), asc(studios.id)),
    db.select().from(cities).orderBy(asc(cities.name), asc(cities.id)),
  ])
  const ids = rows.map((r) => r.id)
  const prices = ids.length ? await db.select().from(studioPrices).where(inArray(studioPrices.studioId, ids)) : []
  const byStudio = new Map<number, (typeof prices)[number][]>()
  for (const p of prices) byStudio.set(p.studioId, [...(byStudio.get(p.studioId) ?? []), p])

  const out = rows.map((r) => {
    const doc = toLegacyStudio(r, byStudio.get(r.id) ?? [], []) as Record<string, unknown>
    for (const k of HIDDEN) delete doc[k]
    // ownerQuote is readable to the public only once approved (Payload field access).
    if (!r.ownerQuoteApproved) delete doc.ownerQuote
    // Payload returns null, not [], for empty localized arrays.
    for (const k of ['services', 'products'] as const) if (Array.isArray(doc[k]) && !(doc[k] as unknown[]).length) doc[k] = null
    return doc as unknown as Studio
  })
  return { studios: out, cities: cityRows.map((c) => toLegacyCity(c) as unknown as City) }
}

export type PublicPhoto = { url: string; full: string; alt: string; width: number; height: number }

// Approved photos of a public studio with photo consent, in profile order. Served from /media/* (Caddy; the old
// /api/media/file/* path 301s there).
export async function loadPublicPhotos(studioId: number): Promise<PublicPhoto[]> {
  const [s] = await db
    .select({ consent: studios.consentPhotos, visibility: studios.visibility })
    .from(studios)
    .where(eq(studios.id, studioId))
  if (!s?.consent || s.visibility !== 'public') return []
  const rows = await db
    .select({ fileName: media.fileName, alt: media.alt, width: media.width, height: media.height, variants: media.variants })
    .from(studioPhotos)
    .innerJoin(media, eq(media.id, studioPhotos.mediaId))
    .where(and(eq(studioPhotos.studioId, studioId), eq(media.status, 'active')))
    .orderBy(asc(studioPhotos.position))
  return rows.map((m) => {
    const large = m.variants?.large
    const big = large?.file ? { file: large.file, width: large.width, height: large.height } : { file: m.fileName, width: m.width, height: m.height }
    return { url: `/media/${big.file}`, full: `/media/${m.fileName}`, alt: m.alt || '', width: big.width || 1400, height: big.height || 933 }
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
