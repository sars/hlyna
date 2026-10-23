// Items: the freshness rule (owner, 19.10.2026), reading the Instagram scans and a partner's Wix shop, and the audited
// writes against a real Postgres (ITEMS_TEST_DATABASE_URL, default hlyna_apptest).
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { cities, studios } from '../../src/server/db/schema/catalog'
import { auditLog } from '../../src/server/db/schema/history'
import { itemChecks, items } from '../../src/server/db/schema/items'
import type { Db } from '../../src/server/db'
import { categoryOf, draftFromScan, postDate, seasonEnd, uahRange } from '../../src/server/services/imports/igItems'
import { applyShopRead, wixProducts } from '../../src/server/services/imports/shops'
import { freshness, refreshItems, type FreshnessInput, type StudioState } from '../../src/server/services/items'

const live: StudioState = { visibility: 'public', status: 'active', lastPostAt: '2026-10-10T00:00:00Z' }
const ig = (o: Partial<FreshnessInput> = {}): FreshnessInput => ({
  source: 'instagram', kind: 'series', availability: 'unknown', confirmedAt: '2026-10-01', occasion: null, seasonEnds: null, sourceGone: false, visibility: 'hidden', hiddenReason: null, ...o,
})

describe('freshness rule', () => {
  it('shows an Instagram item for 4 / 8 / 26 weeks by kind', () => {
    expect(freshness(ig({ kind: 'piece' }), live, '2026-10-29').visibility).toBe('public')
    expect(freshness(ig({ kind: 'piece' }), live, '2026-10-30')).toMatchObject({ visibility: 'hidden', hiddenReason: 'stale' })
    expect(freshness(ig(), live, '2026-11-26').visibility).toBe('public')
    expect(freshness(ig(), live, '2026-11-27').hiddenReason).toBe('stale')
    expect(freshness(ig({ kind: 'to_order', availability: 'to_order' }), { ...live, lastPostAt: '2027-01-01' }, '2027-01-10').visibility).toBe('public')
  })

  it('a made-to-order offer goes when the studio has not posted for 90 days', () => {
    expect(freshness(ig({ kind: 'to_order' }), { ...live, lastPostAt: '2026-06-01' }, '2026-10-19').hiddenReason).toBe('stale')
  })

  it('a seasonal item shows until its season ends, whatever its age', () => {
    const h = ig({ occasion: 'halloween', seasonEnds: '2026-11-01', confirmedAt: '2026-08-01' })
    expect(freshness(h, live, '2026-10-31').visibility).toBe('public')
    expect(freshness(h, live, '2026-11-01').hiddenReason).toBe('season_over')
  })

  it('hides at once: no date, gone, sold on Instagram, a hidden or inactive studio; a manual hide sticks', () => {
    expect(freshness(ig({ confirmedAt: null }), live, '2026-10-02').hiddenReason).toBe('no_date')
    expect(freshness(ig({ sourceGone: true }), live, '2026-10-02').hiddenReason).toBe('gone')
    expect(freshness(ig({ availability: 'sold' }), live, '2026-10-02').hiddenReason).toBe('sold')
    expect(freshness(ig(), { ...live, status: 'unclear' }, '2026-10-02').hiddenReason).toBe('studio_hidden')
    expect(freshness(ig(), { ...live, visibility: 'hidden' }, '2026-10-02').hiddenReason).toBe('studio_hidden')
    expect(freshness(ig({ hiddenReason: 'manual' }), live, '2026-10-02').hiddenReason).toBe('manual')
  })

  it('a shop item: «in stock» turns unknown after 3 days without a read; sold shows 2 weeks', () => {
    const shop = ig({ source: 'shop', availability: 'in_stock', confirmedAt: '2026-10-19' })
    expect(freshness(shop, live, '2026-10-22')).toMatchObject({ visibility: 'public', availability: 'in_stock' })
    expect(freshness(shop, live, '2026-10-23')).toMatchObject({ visibility: 'public', availability: 'unknown' })
    expect(freshness({ ...shop, availability: 'sold' }, live, '2026-11-02').visibility).toBe('public')
    expect(freshness({ ...shop, availability: 'sold' }, live, '2026-11-03').hiddenReason).toBe('sold')
    expect(freshness({ ...shop, availability: 'sold', confirmedAt: null }, live, '2026-10-19').hiddenReason).toBe('sold')
  })
})

describe('reading the Instagram scans', () => {
  it('decodes the post day from its code', () => {
    expect(postDate('DegiTqFAn_b')).toBe('2026-10-15')
    expect(postDate('DZZj16UCIgC')).toBe('2026-06-10')
  })

  it('reads hryvnias, not sizes, volumes or other currencies', () => {
    expect(uahRange('тарілка 20 см — 700 грн; чашки — по 650 грн')).toEqual({ min: 650, max: 700 })
    expect(uahRange('190–445 грн за прикрасу')).toEqual({ min: 190, max: 445 })
    expect(uahRange('13 400–23 800 грн з абажуром')).toEqual({ min: 13400, max: 23800 })
    expect(uahRange('36–54 USD')).toBeNull()
  })

  it('puts an item on the right product page', () => {
    expect(categoryOf('Котокрісло з котиком (підставка для прикрас)')).toBe('vazy-i-dekor')
    expect(categoryOf('Великі настільні лампи з рельєфом')).toBe('svitylnyky')
    expect(categoryOf('Горнятка з рельєфним обличчям')).toBe('chashky')
    expect(categoryOf('Ялинкові прикраси з косівським розписом')).toBe('vazy-i-dekor')
    expect(categoryOf('Кулон «Часник»')).toBe('prykrasy')
    expect(categoryOf('Свічка «Мак»')).toBe('svichky')
    expect(categoryOf('Керамічний свічник')).toBe('vazy-i-dekor')
  })

  it('a season ends on or after the post day', () => {
    expect(seasonEnd('halloween', '2026-10-09')).toBe('2026-11-01')
    expect(seasonEnd('xmas', '2026-09-07')).toBe('2027-01-08')
  })

  it('a scanned item: the latest dated note confirms it, terms decide kind and availability; examples of work are skipped', () => {
    const d = draftFromScan(
      { slug: 'maruna', handle: 'maruna_ceramics' },
      { title: 'Кулон «Часник»', price: '800 грн', terms: 'У наявності (17.10.2026); під замовлення — 4–6 тижнів.', embed: 'https://www.instagram.com/p/DeRKRlUiA5Q/' },
      'halloween',
      '2026-10-19',
    )
    expect(d).toMatchObject({ category: 'prykrasy', kind: 'series', availability: 'in_stock', confirmedAt: '2026-10-17', occasion: 'halloween', seasonEnds: '2026-11-01', priceMin: 800 })
    expect(draftFromScan({ slug: 'x' }, { title: '74 плитки для каміна', kind: 'project' }, 'interior', '2026-10-19')).toEqual({ skip: 'not for sale (project)' })
  })
})

const wixPage = (list: object[], totalCount = list.length) =>
  `<html><script type="application/json" id="wix-warmup-data">${JSON.stringify({ appsWarmupData: { a: { products_default: { list, totalCount } } } })}</script></html>`
const product = (id: string, name: string, isInStock: boolean, price = 950) => ({ id, name, urlPart: name.toLowerCase(), isInStock, price })

describe('reading a Wix shop', () => {
  it('finds the products, their stock and the total', () => {
    const r = wixProducts(wixPage([product('1', 'Чашка "Мак"', true), product('2', 'Чашка Велика', false, 700)], 2), 'https://shop.test')
    expect(r.total).toBe(2)
    expect(r.products).toEqual([
      { id: '1', name: 'Чашка "Мак"', url: 'https://shop.test/product-page/' + encodeURIComponent('чашка "мак"'), price: 950, inStock: true },
      { id: '2', name: 'Чашка Велика', url: 'https://shop.test/product-page/' + encodeURIComponent('чашка велика'), price: 700, inStock: false },
    ])
    expect(wixProducts('<html></html>', 'https://shop.test')).toEqual({ products: [], total: null })
  })
})

const url = process.env.ITEMS_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db
const actor = { id: null, source: 'script:test' as const }
let studioId: number

beforeEach(async () => {
  await db.execute(sql`truncate app.item_checks, app.items, app.audit_log, app.studios, app.cities restart identity cascade`)
  const [{ id: cityId }] = await db.insert(cities).values({ slug: 'sumy', name: 'Суми' }).returning({ id: cities.id })
  ;[{ id: studioId }] = await db.insert(studios).values({ slug: 'osonnia', name: 'Осоння', cityId, visibility: 'public', status: 'active', consentRequests: true }).returning({ id: studios.id })
})

afterAll(async () => {
  await pool.end()
})

describe('a partner shop read in the database', () => {
  it('creates items, then logs a sale and a product that left the shop, all audited', async () => {
    const first = wixProducts(wixPage([product('1', 'Чашка "Мак"', true), product('2', 'Свічка "Злива"', true)]), 'https://shop.test')
    const r1 = await db.transaction((tx) => applyShopRead(tx, studioId, first, '2026-10-19', actor))
    expect(r1.counts).toMatchObject({ created: 2 })
    await db.transaction((tx) => refreshItems(tx, actor, '2026-10-19'))
    const cup = (await db.select().from(items).where(eq(items.sourceKey, '1')))[0]!
    expect(cup).toMatchObject({ title: 'Чашка «Мак»', category: 'chashky', availability: 'in_stock', visibility: 'public', slug: 'chashka-mak', priceMin: 950 })

    // A day later the cup is sold and the candle is gone from the shop.
    const second = wixProducts(wixPage([product('1', 'Чашка "Мак"', false)]), 'https://shop.test')
    const r2 = await db.transaction((tx) => applyShopRead(tx, studioId, second, '2026-10-20', actor))
    expect(r2.counts).toMatchObject({ updated: 1, gone: 1 })
    await db.transaction((tx) => refreshItems(tx, actor, '2026-10-20'))
    const rows = await db.select().from(items).orderBy(items.sourceKey)
    expect(rows.map((i) => [i.availability, i.confirmedAt, i.visibility, i.hiddenReason])).toEqual([
      ['sold', '2026-10-19', 'public', null],
      ['in_stock', '2026-10-19', 'hidden', 'gone'],
    ])
    const signals = (await db.select({ s: itemChecks.signal }).from(itemChecks).orderBy(itemChecks.id)).map((c) => c.s)
    expect(signals).toEqual(['available', 'available', 'sold', 'gone'])
    expect((await db.select().from(auditLog).where(eq(auditLog.entity, 'item'))).length).toBeGreaterThanOrEqual(6)

    // Two weeks after the last day it was in stock, the sold cup leaves the catalogue.
    await db.transaction((tx) => refreshItems(tx, actor, '2026-11-03'))
    expect((await db.select().from(items).where(eq(items.sourceKey, '1')))[0]).toMatchObject({ visibility: 'hidden', hiddenReason: 'sold' })
  })

  it('an empty or partial read marks nothing as gone', async () => {
    await db.transaction((tx) => applyShopRead(tx, studioId, wixProducts(wixPage([product('1', 'Чашка', true), product('2', 'Стакан', true)]), 'https://s.test'), '2026-10-19', actor))
    const r = await db.transaction((tx) => applyShopRead(tx, studioId, wixProducts(wixPage([product('1', 'Чашка', true)], 12), 'https://s.test'), '2026-10-20', actor))
    expect(r.counts.gone).toBe(0)
    expect((await db.select().from(items).where(eq(items.sourceGone, true))).length).toBe(0)
  })
})
