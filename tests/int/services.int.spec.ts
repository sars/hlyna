// Milestone 3 services against a real Postgres (schema `app`): public forms, the owner cabinet (change sets, pending
// photos), ported import scripts, rate limits. Uses PANEL_TEST_DATABASE_URL (default hlyna_apptest).
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { cities, media, studioPhotos, studioPrices, studios } from '../../src/server/db/schema/catalog'
import { changeSets, importRuns, studioRevisions } from '../../src/server/db/schema/history'
import { claimStudios, claims, requests } from '../../src/server/db/schema/requests'
import { createUser, grantStudios } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { applyChangeSet } from '../../src/server/services/changeSets'
import { Forbidden, ownerEditInitial, ownerStudios, submitOwnerEdit } from '../../src/server/services/kabinet'
import { rateLimited } from '../../src/server/services/limits'
import { requestMessage, submitClaim, submitRequest } from '../../src/server/services/publicForms'
import { alternateNamesFor, nameParts } from '../../src/server/services/imports/altNames'
import { applyFixes, setVisibility } from '../../src/server/services/imports/fixes'
import { addressCandidates } from '../../src/server/services/imports/geo'
import { importHighlights, importIgNotes, sameOffer } from '../../src/server/services/imports/instagram'
import { finishRun, scriptActor, startRun, writeStudio } from '../../src/server/services/imports/runs'
import { tagsFor } from '../../src/server/services/imports/tags'

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db
const script = scriptActor('test')

let cityId: number
let studioA: number
let studioB: number
let ip = 0
const nextIp = () => `10.0.0.${++ip}`

beforeAll(() => {
  process.env.MEDIA_DIR = mkdtempSync(path.join(tmpdir(), 'hlyna-media-'))
  delete process.env.TELEGRAM_BOT_TOKEN
})

beforeEach(async () => {
  await db.execute(sql`truncate app.audit_log, app.change_sets, app.studio_revisions, app.import_runs, app.request_studios, app.requests, app.claim_studios, app.claims, app.invite_links, app.studio_owner, app.session, app.account, app."user", app.studio_prices, app.studio_photos, app.media, app.studios, app.cities, app.rate_limit restart identity cascade`)
  ;[{ id: cityId }] = await db.insert(cities).values({ slug: 'kyiv', name: 'Київ' }).returning({ id: cities.id })
  ;[{ id: studioA }] = await db.insert(studios).values({ slug: 'a', name: 'Студія А', cityId, visibility: 'public', type: 'studio', instagram: 'https://www.instagram.com/studio_a/' }).returning({ id: studios.id })
  ;[{ id: studioB }] = await db.insert(studios).values({ slug: 'b', name: 'Студія Б', cityId, visibility: 'public', type: 'studio' }).returning({ id: studios.id })
  await db.insert(studioPrices).values({ studioId: studioA, position: 0, text: 'МК на гончарному колі, 2 год — 900 грн (сайт, 2025)', source: 'сайт', dateText: '2025' })
})

afterAll(async () => {
  await pool.end()
})

const png = (color: string) => sharp({ create: { width: 900, height: 600, channels: 3, background: color } }).png().toBuffer()

describe('public forms', () => {
  it('request: saves, answers {ok,id}, message lists the fields', async () => {
    const r = await submitRequest(db, { what: 'logo-mugs', quantity: '20', city: 'Суми', contactName: 'Оля', contactPhoneOrTelegram: '+380501234567', sourcePage: '/x' }, nextIp())
    expect(r.ok).toBe(true)
    const id = (r as { id: number }).id
    const [row] = await db.select().from(requests).where(eq(requests.id, id))
    expect(row!.status).toBe('new')
    expect(row!.quantity).toBe('20')
    expect(requestMessage(id, row!)).toContain(`Новий запит #${id}: Чашки з логотипом`)
  })

  it('request: needs a contact; honeypot is refused', async () => {
    const a = await submitRequest(db, { what: 'tableware' }, nextIp())
    expect(a).toMatchObject({ ok: false, status: 400, field: 'contactPhoneOrTelegram' })
    const b = await submitRequest(db, { what: 'tableware', contactEmail: 'a@b.ua', website2: 'spam' }, nextIp())
    expect(b).toMatchObject({ ok: false, status: 400 })
    expect((await db.select().from(requests)).length).toBe(0)
  })

  it('request: rate limit per IP', async () => {
    const who = nextIp()
    for (let i = 0; i < 10; i++) expect((await submitRequest(db, { what: 'other', contactEmail: 'x@y.ua' }, who)).ok).toBe(true)
    expect(await submitRequest(db, { what: 'other', contactEmail: 'x@y.ua' }, who)).toMatchObject({ ok: false, status: 429 })
  })

  it('claim: main + other studios, honeypot pretends success, unknown studio 404', async () => {
    const r = await submitClaim(db, { name: 'Оля', contact: '@olya', studio: 'a', otherStudios: ['b'], represents: true }, nextIp())
    expect(r.ok).toBe(true)
    const rows = await db.select().from(claimStudios).orderBy(claimStudios.position)
    expect(rows.map((x) => [x.studioId, x.isMain])).toEqual([[studioA, true], [studioB, false]])
    expect(await submitClaim(db, { name: 'x', contact: 'y', studio: 'a', represents: true, website2: 'bot' }, nextIp())).toEqual({ ok: true, id: null })
    expect(await submitClaim(db, { name: 'x', contact: 'y', studio: 'nope', represents: true }, nextIp())).toMatchObject({ status: 404 })
    expect(await submitClaim(db, { name: 'x', contact: 'y', studio: 'a', represents: false }, nextIp())).toMatchObject({ status: 400 })
    expect((await db.select().from(claims)).length).toBe(1)
  })
})

describe('owner cabinet', () => {
  it('a save becomes one pending change set, updated on the next save; others get Forbidden', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Оля' })
    await grantStudios(db, owner, [studioA])
    expect((await ownerStudios(db, owner)).map((s) => s.slug)).toEqual(['a'])
    const data = { ownerAbout: 'Ми ліпимо', services: ['Коло'], prices: [{ text: 'МК на гончарному колі, 2 год — 900 грн (сайт, 2025)', source: 'сайт', date: '2025' }, { text: 'Розпис — 700 грн' }], b2b: { minOrder: '20 шт' }, keepPhotos: [] }
    const first = await submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'a', data, photos: [] })
    const second = await submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'a', data: { ...data, ownerNews: 'Нова серія' }, photos: [] })
    expect(second.changeSetId).toBe(first.changeSetId)
    const [cs] = await db.select().from(changeSets)
    const p = cs!.proposed as Record<string, unknown>
    expect(p.ownerNews).toBe('Нова серія')
    // unchanged price keeps its source, a new line is «від студії»
    expect((p.prices as { source: string }[]).map((x) => x.source)).toEqual(['сайт', expect.stringMatching(/^від студії, \d{2}\.\d{4}$/)])
    // the studio itself is untouched until we accept
    const [s] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(s!.ownerAbout).toBeNull()
    await expect(submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'b', data, photos: [] })).rejects.toBeInstanceOf(Forbidden)
  })

  it('the edit form shows the pending proposal over published data', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Оля' })
    await grantStudios(db, owner, [studioA])
    await submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'a', data: { address: 'вул. Нова, 1', services: ['Коло'], keepPhotos: [] }, photos: [] })
    const f = await ownerEditInitial(db, owner, 'a')
    expect(f!.initial.address).toBe('вул. Нова, 1')
    expect(f!.initial.pending).toBe(true)
    expect(await ownerEditInitial(db, owner, 'b')).toBeNull()
  })

  it('new photos are pending media until the change set is accepted', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Оля' })
    await grantStudios(db, owner, [studioA])
    const r = await submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'a', data: { keepPhotos: [] }, photos: [{ bytes: await png('#c86'), fileName: 'cup.png', mime: 'image/png', alt: 'Чашка' }] })
    expect(r.newPhotos).toBe(1)
    const [m] = await db.select().from(media)
    expect(m!.status).toBe('pending')
    expect((await db.select().from(studioPhotos)).length).toBe(0)
    await applyChangeSet(db, r.changeSetId, 'all-but-text', { id: null, source: 'panel' })
    expect((await db.select().from(media))[0]!.status).toBe('active')
    expect((await db.select().from(studioPhotos)).map((p) => p.mediaId)).toEqual([m!.id])
    expect((await db.select().from(studios).where(eq(studios.id, studioA)))[0]!.consentPhotos).toBe(true)
  })

  it('a photo without alt text is refused', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Оля' })
    await grantStudios(db, owner, [studioA])
    await expect(
      submitOwnerEdit(db, { userId: owner, ownerName: 'Оля', slug: 'a', data: { keepPhotos: [] }, photos: [{ bytes: await png('#123'), fileName: 'x.png', mime: 'image/png', alt: ' ' }] }),
    ).rejects.toThrow(/опис/)
  })
})

describe('imports', () => {
  it('highlights: a fresh price replaces the same offer, kids prices stay apart', async () => {
    expect(sameOffer('МК на гончарному колі, 2 год — 900 грн (сайт, 2025)', 'МК на гончарному колі, 2 год — 1 000 грн (Instagram, 09.2026)')).toBe(true)
    expect(sameOffer('Дитячий МК на гончарному колі — 600 грн', 'МК на гончарному колі — 1 000 грн')).toBe(false)
    const r = await importHighlights(db, [{ slug: 'a', checked: '2026-10-11', prices: ['МК на гончарному колі, 2 год — 1 000 грн (Instagram, 09.2026)'], address: 'вул. Хрещатик, 1', formats: ['wheel', 'nonsense'] }], {}, script)
    expect(r.counts).toMatchObject({ updated: 1, pricesAdded: 1, pricesReplaced: 1 })
    expect(r.replaced[0]!.text).toContain('900 грн')
    const prices = await db.select().from(studioPrices).where(eq(studioPrices.studioId, studioA))
    expect(prices.map((p) => p.text)).toEqual(['МК на гончарному колі, 2 год — 1 000 грн (Instagram, 09.2026)'])
    const [s] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(s!.address).toBe('вул. Хрещатик, 1')
    expect(s!.formats).toEqual(['wheel'])
    expect((await db.select().from(studioRevisions)).length).toBe(1)
  })

  it('posts: skips studios with pending owner changes and keeps hand-edited notes', async () => {
    await db.insert(changeSets).values({ studioId: studioB, status: 'pending', proposed: { ownerAbout: 'x' } })
    await db.update(studios).set({ recentNote: 'Наш текст' }).where(eq(studios.id, studioA))
    const imported = { a: 'Старий імпорт' }
    const r = await importIgNotes(db, [{ slug: 'a', note: 'Новий імпорт', followers: 500, offers: ['kids'] }, { slug: 'b', note: 'x' }, { slug: 'zzz' }], { imported }, script)
    expect(r.counts).toMatchObject({ updated: 1, skippedOwner: 1, missing: 1 })
    const [s] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(s!.recentNote).toBe('Наш текст')
    expect(s!.activityFollowers).toBe(500)
    expect(s!.formats).toEqual(['kids'])
  })

  it('tags, alternate names and address candidates keep the old rules', () => {
    expect(tagsFor('studio', 'Майстер-класи на гончарному колі, дитячі групи, корпоративи')).toEqual(['wheel', 'kids', 'corporate-workshop'])
    expect(tagsFor('studio', 'Корпоративи не проводять')).not.toContain('corporate-workshop')
    expect(tagsFor('shop', 'гончарне коло')).toEqual([])
    expect(nameParts('Ґроно (Grono)')).toEqual(['Ґроно', 'Grono'])
    expect(alternateNamesFor({ name: 'Ґроно (Grono)', type: 'brand', instagram: 'https://www.instagram.com/grono.shop/', slug: 'grono' }, undefined, undefined)).toEqual(['Ґроно', 'Grono', 'grono.shop'])
    expect(addressCandidates(['Чекаємо вас: студія на Володимирській, 42, вхід з двору'], 'Київ', ['Київ', 'Львів']).map((c) => c.addr)).toEqual(['вул. Володимирська, 42, Київ'])
    expect(addressCandidates(['Раніше працювали на вул. Січових Стрільців, 7'], 'Київ', [])).toEqual([])
  })

  it('visibility, fixes with a new city, runs and no-op writes', async () => {
    expect((await setVisibility(db, ['a', 'nope'], 'hidden', script)).missing).toEqual(['nope'])
    expect((await db.select().from(studios).where(eq(studios.id, studioA)))[0]!.visibility).toBe('hidden')
    await applyFixes(db, [{ slug: 'b', city: 'Черкаси', address: 'вул. Колійна, 2' }], script)
    const [b] = await db.select({ s: studios, c: cities.name }).from(studios).innerJoin(cities, eq(cities.id, studios.cityId)).where(eq(studios.id, studioB))
    expect([b!.c, b!.s.address]).toEqual(['Черкаси', 'вул. Колійна, 2'])
    const before = (await db.select().from(studioRevisions)).length
    expect(await writeStudio(db, studioB, { address: 'вул. Колійна, 2' }, undefined, script, 'no-op')).toEqual({})
    expect((await db.select().from(studioRevisions)).length).toBe(before)
    const run = await startRun(db, 'test')
    await finishRun(db, run, { updated: 3 })
    expect((await db.select().from(importRuns))[0]!.counts).toEqual({ updated: 3 })
  })

  it('rate limit: fixed window in Postgres', async () => {
    for (let i = 0; i < 3; i++) expect(await rateLimited(db, 'k', 3, 60_000)).toBe(false)
    expect(await rateLimited(db, 'k', 3, 60_000)).toBe(true)
    await new Promise((r) => setTimeout(r, 20))
    expect(await rateLimited(db, 'k', 3, 10)).toBe(false) // window passed → count resets
  })
})
