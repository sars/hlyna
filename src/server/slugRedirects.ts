// Old slug → current slug for public studios and for cities, read for src/proxy.ts. The tables are small;
// one query pair per minute at most, shared by all requests of the process.
import { eq } from 'drizzle-orm'

import { db, schema } from './db'

const { studios, cities, studioSlugHistory, citySlugHistory } = schema
const TTL = 60_000

type Maps = { studios: Map<string, string>; cities: Map<string, string> }
let cached: { at: number; maps: Promise<Maps> } | null = null

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

export function slugRedirects(): Promise<Maps> {
  if (!cached || Date.now() - cached.at > TTL) {
    const maps = load().catch((e) => {
      // A failed read must not take the site down: no redirects until the next try.
      console.error('slug redirects', e)
      cached = null
      return { studios: new Map(), cities: new Map() }
    })
    cached = { at: Date.now(), maps }
  }
  return cached.maps
}
