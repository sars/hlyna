// Old slug → current slug for public studios and for cities, and hidden profiles → the makers page nearby, read for
// src/proxy.ts. The slug tables are small: one query pair per minute at most, shared by all requests of the process.
// The hidden-profile map needs the city pages, so it reads the catalogue, every few minutes.
import { eq, inArray } from 'drizzle-orm'

import { loadCatalogUncached } from '@/lib/catalog'
import { hiddenProfileTarget, makerCityPages } from '@/lib/makers'
import { db, schema } from './db'

const { studios, cities, studioSlugHistory, citySlugHistory } = schema
const TTL = 60_000
const HIDDEN_TTL = 5 * 60_000

type Maps = { studios: Map<string, string>; cities: Map<string, string> }

function every<T>(ttl: number, load: () => Promise<T>, empty: () => T, what: string) {
  let cached: { at: number; value: Promise<T> } | null = null
  return (): Promise<T> => {
    if (!cached || Date.now() - cached.at > ttl) {
      const value = load().catch((e) => {
        // A failed read must not take the site down: no redirects until the next try.
        console.error(what, e)
        cached = null
        return empty()
      })
      cached = { at: Date.now(), value }
    }
    return cached.value
  }
}

async function load(): Promise<Maps> {
  const [s, c] = await Promise.all([
    db
      .select({ old: studioSlugHistory.oldSlug, slug: studios.slug, visibility: studios.visibility })
      .from(studioSlugHistory)
      .innerJoin(studios, eq(studios.id, studioSlugHistory.studioId)),
    db.select({ old: citySlugHistory.oldSlug, slug: cities.slug }).from(citySlugHistory).innerJoin(cities, eq(cities.id, citySlugHistory.cityId)),
  ])
  return {
    studios: new Map(s.filter((r) => r.visibility === 'public' && r.slug && r.old !== r.slug).map((r) => [r.old, r.slug])),
    cities: new Map(c.filter((r) => r.slug && r.old !== r.slug).map((r) => [r.old, r.slug as string])),
  }
}

// Slug (current or old) of a hidden profile → path. A slug a public profile answers to is never taken.
async function loadHidden(): Promise<Map<string, string>> {
  const [catalog, hidden, cityRows] = await Promise.all([
    loadCatalogUncached(),
    db.select({ id: studios.id, slug: studios.slug, cityId: studios.cityId }).from(studios).where(eq(studios.visibility, 'hidden')),
    db.select({ id: cities.id, slug: cities.slug, oblast: cities.oblast }).from(cities),
  ])
  const old = hidden.length
    ? await db.select({ old: studioSlugHistory.oldSlug, studioId: studioSlugHistory.studioId }).from(studioSlugHistory).where(inArray(studioSlugHistory.studioId, hidden.map((h) => h.id)))
    : []
  const pages = new Set(makerCityPages(catalog).map((p) => p.city.slug as string))
  const live = new Set(catalog.map((s) => s.slug))
  const cityById = new Map(cityRows.map((r) => [r.id, r]))
  const target = new Map(hidden.map((h) => [h.id, hiddenProfileTarget((h.cityId && cityById.get(h.cityId)) || null, pages)]))
  const out = new Map<string, string>()
  for (const [slug, id] of [...hidden.map((h) => [h.slug, h.id] as const), ...old.map((o) => [o.old, o.studioId] as const)]) {
    if (!live.has(slug)) out.set(slug, target.get(id)!)
  }
  return out
}

export const slugRedirects = every(TTL, load, () => ({ studios: new Map(), cities: new Map() }), 'slug redirects')
export const hiddenProfiles = every(HIDDEN_TTL, loadHidden, () => new Map<string, string>(), 'hidden profile redirects')
