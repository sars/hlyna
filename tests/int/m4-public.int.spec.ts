// The public catalogue read from schema `app`: record shape and order the pages expect, hidden fields left out,
// photos only with consent, old slugs resolved for 301s.
// Uses PANEL_TEST_DATABASE_URL (default hlyna_apptest).
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
process.env.DATABASE_URL = url

type Mod = typeof import('../../src/server/publicCatalog')
let pc: Mod
let dbm: typeof import('../../src/server/db')
let s: typeof import('../../src/server/db/schema/catalog')

beforeAll(async () => {
  dbm = await import('../../src/server/db')
  s = await import('../../src/server/db/schema/catalog')
  pc = await import('../../src/server/publicCatalog')
})

let cityId: number
let a: number
let b: number

beforeEach(async () => {
  const { db } = dbm
  await db.execute(sql`truncate app.studio_slug_history, app.city_slug_history, app.studio_prices, app.studio_photos, app.media, app.studios, app.cities restart identity cascade`)
  ;[{ id: cityId }] = await db.insert(s.cities).values({ slug: 'kyiv', name: 'Київ' }).returning({ id: s.cities.id })
  ;[{ id: b }] = await db
    .insert(s.studios)
    .values({ slug: 'b', name: 'Бета', cityId, visibility: 'public', ownerAbout: 'внутрішнє', ownerQuote: 'не схвалено', consentPhotos: true })
    .returning({ id: s.studios.id })
  ;[{ id: a }] = await db
    .insert(s.studios)
    .values({ slug: 'a', name: 'Альфа', cityId, visibility: 'public', ownerQuote: 'схвалено', ownerQuoteApproved: true, services: ['МК'] })
    .returning({ id: s.studios.id })
  await db.insert(s.studios).values({ slug: 'hidden', name: 'Аааа прихована', cityId, visibility: 'hidden' })
  await db.insert(s.studioPrices).values([
    { studioId: a, position: 1, text: 'друга — 2 грн' },
    { studioId: a, position: 0, text: 'перша — 1 грн', source: 'сайт', dateText: '2026' },
  ])
}, 60_000)

afterAll(async () => {
  await dbm.pool.end()
})

describe('public catalogue on schema app', () => {
  it('returns public studios by name, Payload shape, hidden fields removed', async () => {
    const [studios, cities] = await Promise.all([pc.loadPublicStudios(), pc.loadPublicCities()])
    expect(studios.map((x) => x.slug)).toEqual(['a', 'b'])
    expect(cities.map((c) => c.slug)).toEqual(['kyiv'])
    // Shards split by id and together hold every public studio once.
    const shards = await Promise.all([0, 1, 2, 3].map((index) => pc.loadPublicStudios({ index, of: 4 })))
    expect(shards.flat().map((x) => x.slug).sort()).toEqual(['a', 'b'])
    const [alpha, beta] = studios as unknown as Record<string, unknown>[]
    expect(alpha._status).toBe('published')
    expect(alpha.prices).toEqual([
      { text: 'перша — 1 грн', source: 'сайт', date: '2026' },
      { text: 'друга — 2 грн', source: null, date: null },
    ])
    expect(alpha.ownerQuote).toBe('схвалено')
    expect(beta.ownerQuote).toBeUndefined()
    for (const k of ['ownerAbout', 'ownerNews', 'consent', 'sources', 'sourceId', 'confidence', 'photos', 'pendingOwnerChanges']) expect(beta).not.toHaveProperty(k)
    expect(beta.services).toBeNull() // Payload: empty localized array → null
    expect(alpha.services).toEqual([{ text: 'МК' }])
  })

  it('serves photos only with consent, active media, in order, from /media', async () => {
    const { db } = dbm
    const [m1] = await db.insert(s.media).values({ fileName: 'one.jpg', width: 2000, height: 1500, alt: 'Один', variants: { large: { file: 'one-1400x1050.jpg', width: 1400, height: 1050, size: 1, mime: 'image/jpeg' } } }).returning()
    const [m2] = await db.insert(s.media).values({ fileName: 'two.jpg', width: 800, height: 600, alt: null }).returning()
    const [m3] = await db.insert(s.media).values({ fileName: 'pending.jpg', status: 'pending' }).returning()
    await db.insert(s.studioPhotos).values([
      { studioId: b, mediaId: m2.id, position: 1 },
      { studioId: b, mediaId: m1.id, position: 0 },
      { studioId: b, mediaId: m3.id, position: 2 },
      { studioId: a, mediaId: m1.id, position: 0 },
    ])
    expect(await pc.loadPublicPhotos(b)).toEqual([
      { url: '/media/one-1400x1050.jpg', full: '/media/one.jpg', alt: 'Один', width: 1400, height: 1050 },
      { url: '/media/two.jpg', full: '/media/two.jpg', alt: '', width: 800, height: 600 },
    ])
    expect(await pc.loadPublicPhotos(a)).toEqual([]) // no photo consent
  })

  it('resolves old studio and city slugs to the current ones', async () => {
    const { db } = dbm
    await db.insert(s.studioSlugHistory).values({ oldSlug: 'alfa-old', studioId: a })
    await db.insert(s.citySlugHistory).values({ oldSlug: 'kiev', cityId })
    expect(await pc.currentStudioSlug('alfa-old')).toBe('a')
    expect(await pc.currentStudioSlug('nope')).toBeNull()
    expect(await pc.currentCitySlug('kiev')).toBe('kyiv')
    expect(await pc.currentCitySlug('kyiv')).toBeNull()
  })
})
