import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import type { City, Studio } from '@/payload-types'
import { cleanAddress, cleanPublic } from './present'

// Read-only data layer for public pages. One cached query per request; pages are statically
// generated and revalidated, so the database is hit rarely.

export const TYPE_LABEL: Record<string, string> = {
  studio: 'Студія',
  brand: 'Бренд',
  maker: 'Майстер',
  school: 'Школа',
  shop: 'Магазин',
  supplier: 'Постачальник',
  heritage: 'Традиційна майстерня',
  other: 'Інше',
}

// unverified: the research found no sign of activity after 2022 and says so (or work is suspended), with no
// fresher Instagram evidence. Such a studio keeps its profile but is left out of every list, count and map.
export type StudioCard = Studio & { cityDoc: City | null; unverified?: boolean }

// depth 0 + a separate city lookup keeps the cached payload small (Next's data cache limit is 2 MB per entry).
const loadStudiosRaw = async (): Promise<StudioCard[]> => {
    // The Docker build has no database: render empty and let /revalidate refill after deploy.
    if (process.env.NEXT_PHASE === 'phase-production-build' && process.env.BUILD_WITHOUT_DB === '1') return []
    const payload = await getPayload({ config: configPromise })
    const [studios, cities] = await Promise.all([
      payload.find({
        collection: 'studios',
        where: { _status: { equals: 'published' } },
        depth: 0,
        limit: 5000,
        pagination: false,
        overrideAccess: false,
        select: { sources: false, consent: false, sourceId: false, confidence: false, photos: false },
      }),
      payload.find({ collection: 'cities', depth: 0, limit: 2000, pagination: false, overrideAccess: false }),
    ])
    const byId = new Map(cities.docs.map((c) => [c.id, c]))
    return studios.docs.map((s) => ({ ...publicText(s as Studio), unverified: isUnverified(s as Studio), cityDoc: (typeof s.city === 'object' ? s.city : byId.get(s.city as number)) ?? null }))
}

// Scripts (pnpm payload run …) have no Next data cache: HLYNA_SCRIPT=1 reads the database directly,
// so build scripts see exactly what the pages see.
let scriptLoad: Promise<StudioCard[]> | null = null
const loadStudios = process.env.HLYNA_SCRIPT === '1' ? () => (scriptLoad ??= loadStudiosRaw()) : unstable_cache(loadStudiosRaw, ['studios-all-v6'], { revalidate: 3600, tags: ['studios'] })

// Research annotations stay in the database (admin sees them) but never reach public pages.
const cleanList = <T extends { text: string }>(xs?: T[] | null) => (xs ?? []).map((x) => ({ ...x, text: cleanPublic(x.text) })).filter((x) => x.text)
const publicText = (s: Studio): Studio => ({
  ...s,
  summary: cleanPublic(s.summary),
  publicDescription: cleanPublic(s.publicDescription),
  description: cleanPublic(s.description),
  recentNote: cleanPublic(s.recentNote),
  address: cleanAddress(s.address),
  services: cleanList(s.services),
  products: cleanList(s.products),
  prices: cleanList(s.prices),
})

const DOUBT = /актуальн\p{L}*[^.!?]{0,60}не підтвердж|не підтвердж\p{L}*[^.!?]{0,30}актуальн|роботу призупинено|тимчасово (?:закрит|не працює)|більше не працює|статус[^.!?]{0,40}не підтвердж|актуальн\p{L}* активн\p{L}*[^.!?]{0,30}не підтвердж/iu
const FRESH_SINCE = '2025-01-01'
function isUnverified(s: Studio): boolean {
  if (s.status === 'closed') return false // handled separately
  const fresh = (s.activity?.lastPostDate ?? '') >= FRESH_SINCE
  return !fresh && DOUBT.test([s.publicDescription, s.description, s.summary].filter(Boolean).join(' '))
}

/** Every published record, including closed and unverified ones (profiles and the sitemap). */
export const getCatalog = cache(loadStudios)

/** What lists, counts, the map and the price index use: no closed or unverified studios. */
export const getAllStudios = cache(async () => (await getCatalog()).filter((s) => s.status !== 'closed' && !s.unverified))

export const getStudioBySlug = cache(async (slug: string) => (await getCatalog()).find((s) => s.slug === slug) ?? null)

export type StudioPhoto = { url: string; full: string; alt: string; width: number; height: number }

// Published photos of one studio (owner uploads, shown only with photo consent). Separate from the catalogue
// query so the big cached list stays small.
export const getStudioPhotos = unstable_cache(
  async (id: number): Promise<StudioPhoto[]> => {
    if (process.env.NEXT_PHASE === 'phase-production-build' && process.env.BUILD_WITHOUT_DB === '1') return []
    const payload = await getPayload({ config: configPromise })
    const doc = await payload
      .findByID({ collection: 'studios', id, depth: 1, overrideAccess: true, select: { photos: true, consent: true, _status: true } })
      .catch(() => null)
    if (!doc?.consent?.photos || doc._status !== 'published') return []
    return (doc.photos ?? [])
      .filter((p): p is Exclude<typeof p, number> => typeof p === 'object' && Boolean(p?.url))
      .map((p) => {
        const big = p.sizes?.large?.url ? p.sizes.large : p
        return { url: big.url as string, full: p.url as string, alt: p.alt || '', width: big.width || 1400, height: big.height || 933 }
      })
  },
  ['studio-photos-v1'],
  { revalidate: 3600, tags: ['studios'] },
)

export const texts = (s: Studio) =>
  [s.description, ...(s.services ?? []).map((x) => x.text), ...(s.products ?? []).map((x) => x.text), ...(s.prices ?? []).map((x) => x.text)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export type Format = NonNullable<Studio['formats']>[number]

// Format tags come from scripts/tag-studios.ts (and admin edits); the regexes below are a fallback for untagged studios.
export const hasFormat = (s: Studio, f: Format) => Boolean(s.formats?.includes(f))

// Master-class places come from format tags only (scripts/tag-studios.ts). Studios and schools need any
// class tag; makers and brands need a class-specific tag or a class word next to a technique tag, so an
// artist who simply paints ceramics is not listed as a place to take a class. Shops and academic
// departments are never listed.
const CLASS_TAGS: Format[] = ['wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop']
const CLASS_ONLY_TAGS: Format[] = ['kids', 'couples', 'courses', 'corporate-workshop']
const ACADEMIC = /університет|академі[яї]|кафедр|факультет|інститут|коледж|ліцей|училищ/iu
const CLASS_WORDS = /майстер-клас|(?<!\p{L})мк(?!\p{L})|заняття|урок|навчан|гурт[оі]к/iu

export const offersMasterClasses = (s: Studio) => {
  if (ACADEMIC.test(s.name)) return false
  if (s.type === 'studio' || s.type === 'school') return CLASS_TAGS.some((f) => hasFormat(s, f)) || CLASS_WORDS.test(texts(s))
  if (!s.formats?.length) return false
  if (s.type === 'shop' || s.type === 'supplier') return false
  return CLASS_ONLY_TAGS.some((f) => hasFormat(s, f)) || (CLASS_TAGS.some((f) => hasFormat(s, f)) && CLASS_WORDS.test(texts(s)))
}

const MAKER_TYPES = new Set(['studio', 'brand', 'maker', 'school'])

// Business tags come from scripts/tag-studios.ts (same phrases the old regexes used) or admin checkboxes.
export const worksWithVenues = (s: Studio) => MAKER_TYPES.has(s.type ?? '') && (hasFormat(s, 'horeca') || Boolean(s.b2b?.worksWithHoreca))

export const worksWithCompanies = (s: Studio) =>
  hasFormat(s, 'corporate-gifts') || hasFormat(s, 'corporate-workshop') || hasFormat(s, 'logo') || Boolean(s.b2b?.worksWithCorporate)

// Hryvnia amounts mentioned in a studio's price lines (used for honest "from–to" ranges).
export function hryvniaAmounts(s: Studio): number[] {
  const out: number[] = []
  for (const p of s.prices ?? []) {
    for (const m of p.text.matchAll(/(\d[\d\s]{1,6})\s*(?:грн|₴)/g)) {
      const n = Number(m[1].replace(/\s/g, ''))
      if (n >= 100 && n <= 20000) out.push(n)
    }
  }
  return out
}

export type CityGroup = { city: City; studios: StudioCard[] }

export function groupByCity(studios: StudioCard[]): CityGroup[] {
  const map = new Map<string, CityGroup>()
  for (const s of studios) {
    if (!s.cityDoc?.slug) continue
    const g = map.get(s.cityDoc.slug) ?? { city: s.cityDoc, studios: [] }
    g.studios.push(s)
    map.set(s.cityDoc.slug, g)
  }
  return [...map.values()].sort((a, b) => b.studios.length - a.studios.length)
}

/** Newest updatedAt among studios (page dateModified / sitemap lastmod). */
export const latestUpdate = (xs: { updatedAt?: string | null }[]) => xs.reduce<string | null>((m, x) => (x.updatedAt && (!m || x.updatedAt > m) ? x.updatedAt : m), null)

export const MIN_LIST = 3 // no thin pages: a list needs at least 3 real entries (AGENTS.md)

export const fmt = (n: number) => n.toLocaleString('uk-UA')

export function range(nums: number[]) {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  return { min: sorted[0], max: sorted[sorted.length - 1], median: sorted[Math.floor(sorted.length / 2)] }
}

export const igHandle = (url?: string | null) => url?.replace(/\/$/, '').split('/').pop() ?? ''

// Ukrainian plural: pluralUk(5, ['місце', 'місця', 'місць']) → 'місць'
export function pluralUk(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
