// @vitest-environment node
// Panel milestone 2 services against a real Postgres (schema `app`): studio editor (save, version conflict,
// slug history, revisions and restore), cities (rename keeps the old slug), media (sharp sizes, EXIF gone,
// delete only when unused), users (invites, roles, deactivate, owner studios, sessions).
// Uses PANEL_TEST_DATABASE_URL (default hlyna_apptest). Run serially with the other suites (they share the DB).
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { inviteLinks, session, studioOwner, user } from '../../src/server/db/schema/auth'
import { cities, citySlugHistory, media, studioPhotos, studioPrices, studios, studioSlugHistory } from '../../src/server/db/schema/catalog'
import { studioRevisions } from '../../src/server/db/schema/history'
import { createUser } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { deleteMedia, uploadImage } from '../../src/server/media'
import { listCities, resolveCitySlug, saveCity } from '../../src/server/services/cities'
import { overview } from '../../src/server/services/overview'
import { cityOptions, Conflict, getStudioForEdit, Invalid, listRevisions, listStudios, restoreRevision, revisionChanges, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { createOwner, createStaff, issueInvite, listUsers, revokeSession, setActive, setOwnerStudios, setRole } from '../../src/server/services/users'

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db
const panel = { id: null, source: 'panel' as const }

let cityId: number
let studioId: number
let mediaDir: string

beforeAll(async () => {
  mediaDir = await mkdtemp(path.join(os.tmpdir(), 'hlyna-media-'))
  process.env.MEDIA_DIR = mediaDir
})

beforeEach(async () => {
  for (const f of await readdir(mediaDir)) await rm(path.join(mediaDir, f))
  await db.execute(sql`truncate app.audit_log, app.change_sets, app.studio_revisions, app.request_studios, app.requests, app.claim_studios, app.claims, app.invite_links, app.studio_owner, app.session, app.account, app."user", app.studio_prices, app.studio_photos, app.studio_slug_history, app.city_slug_history, app.media, app.studios, app.cities restart identity cascade`)
  ;[{ id: cityId }] = await db.insert(cities).values({ slug: 'kyiv', name: 'Київ', locative: 'у Києві' }).returning({ id: cities.id })
  ;[{ id: studioId }] = await db.insert(studios).values({ slug: 'yar', name: 'Яр', cityId, visibility: 'public', services: ['коло'] }).returning({ id: studios.id })
})

afterAll(async () => {
  await pool.end()
  await rm(mediaDir, { recursive: true, force: true })
})

const form = async () => toEditForm((await getStudioForEdit(db, studioId))!)
const count = async (q: ReturnType<typeof sql>) => Number((await db.execute(q)).rows[0]!.n)

describe('studio editor', () => {
  it('saves fields, prices and photos in one revision with an audit entry', async () => {
    const f = await form()
    const res = await saveStudio(db, studioId, { ...f, summary: 'Гончарство біля Золотих воріт', prices: [{ text: 'МК — 900 грн', source: 'сайт', dateText: '10.2026' }] }, panel)
    expect(res.revision).toBe(f.expectedRevision + 1)
    expect(Object.keys(res.changes).sort()).toEqual(['prices', 'summary'])
    const after = await getStudioForEdit(db, studioId)
    expect(after!.row.summary).toBe('Гончарство біля Золотих воріт')
    expect(after!.prices).toEqual([{ text: 'МК — 900 грн', source: 'сайт', dateText: '10.2026' }])
    expect(await count(sql`select count(*) n from app.audit_log where entity = 'studio'`)).toBe(1)
    // the state before the first panel edit is kept as a baseline revision, then the save itself
    expect((await listRevisions(db, studioId)).map((r) => r.source)).toEqual(['panel', 'baseline'])
  })

  it('a save with nothing changed writes nothing', async () => {
    const res = await saveStudio(db, studioId, await form(), panel)
    expect(res.changes).toEqual({})
    expect((await listRevisions(db, studioId)).length).toBe(0)
  })

  it('refuses a stale save and reports what the other person changed', async () => {
    const stale = await form()
    await saveStudio(db, studioId, { ...stale, recentNote: 'Нове у жовтні' }, { id: null, source: 'panel' })
    const err = await saveStudio(db, studioId, { ...stale, summary: 'моя правка' }, panel).catch((e) => e)
    expect(err).toBeInstanceOf(Conflict)
    expect(Object.keys((err as Conflict).changes)).toContain('recentNote')
    expect((await getStudioForEdit(db, studioId))!.row.summary).toBeNull()
  })

  it('a slug change keeps the old slug; a taken slug is refused', async () => {
    await db.insert(studios).values({ slug: 'other', name: 'Інша' })
    await expect(saveStudio(db, studioId, { ...(await form()), slug: 'other' }, panel)).rejects.toBeInstanceOf(Invalid)
    await saveStudio(db, studioId, { ...(await form()), slug: 'yar-workshop' }, panel)
    const [h] = await db.select().from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, 'yar'))
    expect(h!.studioId).toBe(studioId)
    // taking the old slug back removes it from history
    await saveStudio(db, studioId, { ...(await form()), slug: 'yar' }, panel)
    expect((await db.select().from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, 'yar'))).length).toBe(0)
  })

  it('shows a revision diff and restores it as a new revision', async () => {
    await saveStudio(db, studioId, { ...(await form()), summary: 'перша' }, panel)
    await saveStudio(db, studioId, { ...(await form()), summary: 'друга', services: ['коло', 'ліплення'] }, panel)
    const [latest, first] = await listRevisions(db, studioId) // [second save, first save, baseline]
    const d = await revisionChanges(db, studioId, latest!.id)
    expect(d!.changes.summary).toEqual({ from: 'перша', to: 'друга' })
    const cur = (await getStudioForEdit(db, studioId))!.row.revision
    await restoreRevision(db, studioId, first!.id, cur, panel)
    const after = (await getStudioForEdit(db, studioId))!
    expect(after.row.summary).toBe('перша')
    expect(after.row.services).toEqual(['коло'])
    expect((await listRevisions(db, studioId)).length).toBe(4)
    expect(await count(sql`select count(*) n from app.audit_log where action = 'restored'`)).toBe(1)
  })

  it('restores a migrated Payload-shaped revision', async () => {
    await db.insert(studioRevisions).values({ studioId, revision: 1, source: 'payload-version', snapshot: { name: 'Яр (стара назва)', slug: 'yar', city: cityId, _status: 'published', services: [{ text: 'коло' }, { text: 'розпис' }], prices: [{ text: 'МК — 700 грн', source: 'сайт', date: '2025' }], photos: [], b2b: { minOrder: '20 шт' }, geo: {} } })
    const [legacy] = await db.select().from(studioRevisions)
    await restoreRevision(db, studioId, legacy!.id, (await form()).expectedRevision, panel)
    const after = (await getStudioForEdit(db, studioId))!
    expect(after.row.name).toBe('Яр (стара назва)')
    expect(after.row.services).toEqual(['коло', 'розпис'])
    expect(after.row.b2bMinOrder).toBe('20 шт')
    expect(after.prices[0]).toEqual({ text: 'МК — 700 грн', source: 'сайт', dateText: '2025' })
  })

  it('lists with filters and keyset paging', async () => {
    await db.insert(studios).values([{ slug: 'b1', name: 'Б', cityId, formats: ['wheel'] }, { slug: 'c1', name: 'В' }])
    const p1 = await listStudios(db, { limit: 2 })
    expect(p1.rows.map((r) => r.name)).toEqual(['Б', 'В'])
    const p2 = await listStudios(db, { limit: 2, after: p1.next! })
    expect(p2.rows.map((r) => r.name)).toEqual(['Яр'])
    expect((await listStudios(db, { format: 'wheel' })).rows.map((r) => r.slug)).toEqual(['b1'])
    expect((await listStudios(db, { hasPrices: false, cityId })).rows.length).toBe(2)
  })
})

describe('correlated counts (outer columns must be qualified)', () => {
  it('city studio counts, users list and «without prices» count read the right rows', async () => {
    const [{ id: lviv }] = await db.insert(cities).values({ slug: 'lviv', name: 'Львів' }).returning({ id: cities.id })
    const [{ id: l1 }] = await db.insert(studios).values([{ slug: 'l1', name: 'Л1', cityId: lviv, visibility: 'public' }, { slug: 'l2', name: 'Л2', cityId: lviv }]).returning({ id: studios.id })
    await db.insert(studioPrices).values({ studioId: l1, position: 0, text: 'МК — 800 грн' })
    const opts = await cityOptions(db)
    expect(opts.find((c) => c.id === lviv)!.count).toBe(2)
    expect(opts.find((c) => c.id === cityId)!.count).toBe(1)
    const list = await listCities(db)
    expect(list.find((c) => c.id === lviv)).toMatchObject({ studios: 2, publicStudios: 1 })
    const owner = await createUser(db, { role: 'owner', name: 'В', contact: '@v' })
    await db.insert(studioOwner).values({ userId: owner, studioId })
    expect((await listUsers(db, { kind: 'owner' }))[0]).toMatchObject({ name: 'В', studios: ['Яр'] })
    // public studios without prices: only Яр (Л1 has a price, Л2 is hidden)
    expect((await overview(db)).catalog.noPrices).toBe(1)
  })
})

describe('cities', () => {
  it('renaming the slug keeps the old one resolvable', async () => {
    await saveCity(db, cityId, { name: 'Київ', slug: 'kyiv-city', oblast: null, locative: 'у Києві', population: 2_900_000, isOver100k: true }, panel)
    expect(await resolveCitySlug(db, 'kyiv')).toBe('kyiv-city')
    expect((await db.select().from(citySlugHistory)).length).toBe(1)
    expect(await count(sql`select count(*) n from app.audit_log where entity = 'city'`)).toBe(1)
  })
})

describe('media', () => {
  async function jpegWithGps() {
    return sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#b4683f' } })
      .jpeg()
      .withExif({ IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 27/1 0/1' } })
      .toBuffer()
  }

  it('makes Payload’s seven sizes, drops EXIF, dedupes the same bytes', async () => {
    const bytes = await jpegWithGps()
    expect((await sharp(bytes).metadata()).exif).toBeTruthy()
    const up = await uploadImage(db, { bytes, fileName: 'IMG_1.jpg', alt: 'Чашки на полиці', studioSlug: 'yar' }, panel)
    const [m] = await db.select().from(media).where(eq(media.id, up.id))
    expect(Object.keys(m!.variants!).sort()).toEqual(['large', 'medium', 'og', 'small', 'square', 'thumbnail', 'xlarge'])
    expect(m!.variants!.og).toMatchObject({ width: 1200, height: 630 })
    expect(m!.variants!.thumbnail!.width).toBe(300)
    const stored = await sharp(path.join(mediaDir, m!.fileName)).metadata()
    expect(stored.exif).toBeUndefined()
    expect((await readdir(mediaDir)).length).toBe(8)
    const again = await uploadImage(db, { bytes, fileName: 'copy.jpg', alt: 'x' }, panel)
    expect(again).toEqual({ id: up.id, duplicate: true })
  })

  it('needs alt text and refuses non-images', async () => {
    await expect(uploadImage(db, { bytes: await jpegWithGps(), fileName: 'a.jpg', alt: ' ' }, panel)).rejects.toBeInstanceOf(Invalid)
    await expect(uploadImage(db, { bytes: Buffer.from('not an image'), fileName: 'a.jpg', alt: 'a' }, panel)).rejects.toBeInstanceOf(Invalid)
  })

  it('deletes only a photo no profile shows', async () => {
    const { id } = await uploadImage(db, { bytes: await jpegWithGps(), fileName: 'a.jpg', alt: 'Фото' }, panel)
    await saveStudio(db, studioId, { ...(await form()), photoIds: [id] }, panel)
    await expect(deleteMedia(db, id, panel)).rejects.toBeInstanceOf(Invalid)
    await saveStudio(db, studioId, { ...(await form()), photoIds: [] }, panel)
    expect((await db.select().from(studioPhotos)).length).toBe(0)
    await deleteMedia(db, id, panel)
    expect((await db.select().from(media)).length).toBe(0)
    expect((await readdir(mediaDir)).length).toBe(0)
  })
})

describe('users', () => {
  it('creates staff with a one-time link; a new link replaces the old', async () => {
    const r = await createStaff(db, { name: 'Олена', email: 'olena@example.com', role: 'editor' }, panel, 'https://hlyna.com.ua')
    expect(r.link).toMatch(/^https:\/\/hlyna\.com\.ua\/panel\/parol\?token=/)
    expect(r.message).toContain(r.link)
    await issueInvite(db, r.id, panel, 'https://hlyna.com.ua')
    const links = await db.select().from(inviteLinks).where(eq(inviteLinks.userId, r.id))
    expect(links.filter((l) => !l.usedAt).length).toBe(1)
  })

  it('owner studios: grant marks verified, removing the last owner unmarks', async () => {
    const r = await createOwner(db, { name: 'Ірина', contact: '@yar', studioIds: [studioId] }, panel, 'https://hlyna.com.ua')
    expect(r.link).toContain('/kabinet/parol')
    expect((await getStudioForEdit(db, studioId))!.row.ownerVerified).toBe(true)
    await setOwnerStudios(db, r.id, [], panel)
    expect((await db.select().from(studioOwner)).length).toBe(0)
    expect((await getStudioForEdit(db, studioId))!.row.ownerVerified).toBe(false)
  })

  it('deactivate ends sessions; the last admin can’t be demoted or switched off', async () => {
    const admin = await createUser(db, { role: 'admin', name: 'Адмін', email: 'a@example.com' })
    const ed = await createUser(db, { role: 'editor', name: 'Ред', email: 'e@example.com' })
    await db.insert(session).values({ id: 's1', token: 't1', userId: ed, expiresAt: new Date(Date.now() + 86400e3) })
    await setActive(db, ed, false, { id: admin, source: 'panel' })
    expect((await db.select().from(session)).length).toBe(0)
    expect((await db.select({ a: user.active }).from(user).where(eq(user.id, ed)))[0]!.a).toBe(false)
    await expect(setRole(db, admin, 'editor', { id: 'someone-else', source: 'panel' })).rejects.toBeInstanceOf(Invalid)
    await expect(setActive(db, admin, false, { id: 'someone-else', source: 'panel' })).rejects.toBeInstanceOf(Invalid)
    await setActive(db, ed, true, { id: admin, source: 'panel' })
    await db.insert(session).values({ id: 's2', token: 't2', userId: ed, expiresAt: new Date(Date.now() + 86400e3) })
    await revokeSession(db, ed, 's2', { id: admin, source: 'panel' })
    expect((await db.select().from(session)).length).toBe(0)
    expect(await count(sql`select count(*) n from app.audit_log where entity = 'user'`)).toBeGreaterThanOrEqual(3)
  })
})

