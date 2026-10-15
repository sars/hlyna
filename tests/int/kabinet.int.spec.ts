// The studio cabinet's service against a real Postgres (schema `app`): section saves into the one pending change set,
// section states, photo actions and the delayed Telegram note about photos. Uses PANEL_TEST_DATABASE_URL (default hlyna_apptest).
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { cities, media, studioPhotos, studioPrices, studios } from '../../src/server/db/schema/catalog'
import { changeSets } from '../../src/server/db/schema/history'
import { createUser, grantStudios } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { applyChangeSet, rejectChangeSet } from '../../src/server/services/changeSets'
import { FieldErrors, Forbidden, ownerStudioSummaries, saveSection, sectionPage, studioSummary } from '../../src/server/services/kabinet'
import { addPhoto, photosOf, sendDuePhotoNotices, setPhotoCaption, setPhotoOrder } from '../../src/server/services/kabinetPhotos'
import { Invalid } from '../../src/server/services/studioEditor'
import { handleTap } from '../../src/server/telegram/actions'
import { MEDIA_DIR } from '../../src/server/media'

const tgCalls = vi.hoisted(() => [] as { method: string; body: Record<string, unknown> }[])
vi.mock('../../src/server/telegram/tg', () => ({
  tg: async (method: string, body: Record<string, unknown>) => {
    tgCalls.push({ method, body })
    return { message_id: 1 }
  },
}))

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db

let studioA: number
let studioB: number
let owner: string
const png = (color: string) => sharp({ create: { width: 700, height: 500, channels: 3, background: color } }).png().toBuffer()
const save = (section: Parameters<typeof saveSection>[1]['section'], data: unknown, slug = 'a') => saveSection(db, { userId: owner, ownerName: 'Оля', slug, section, data })
const openSet = async () => (await db.select().from(changeSets))[0]!
const proposedKeys = async () => Object.keys((await openSet()).proposed as object).sort()

beforeAll(() => {
  process.env.MEDIA_DIR = mkdtempSync(path.join(tmpdir(), 'hlyna-media-'))
})

beforeEach(async () => {
  delete process.env.TELEGRAM_BOT_TOKEN
  delete process.env.TELEGRAM_CHAT_ID
  tgCalls.length = 0
  await db.execute(sql`truncate app.audit_log, app.change_sets, app.studio_revisions, app.studio_owner, app.session, app.account, app."user", app.studio_prices, app.studio_photos, app.media, app.studios, app.cities restart identity cascade`)
  const [{ id: cityId }] = await db.insert(cities).values({ slug: 'sumy', name: 'Суми' }).returning({ id: cities.id })
  ;[{ id: studioA }] = await db
    .insert(studios)
    .values({ slug: 'a', name: 'Студія А', cityId, visibility: 'public', type: 'studio', address: 'вул. Соборна, 1', website: 'https://a.ua/', instagram: 'https://www.instagram.com/studio_a/', services: ['Коло', 'Розпис'], products: ['Чашка'], publicDescription: 'Опис від редактора.' })
    .returning({ id: studios.id })
  ;[{ id: studioB }] = await db.insert(studios).values({ slug: 'b', name: 'Студія Б', cityId, visibility: 'public', type: 'studio' }).returning({ id: studios.id })
  await db.insert(studioPrices).values({ studioId: studioA, position: 0, text: 'МК на гончарному колі, 2 год — 900 грн', source: 'сайт', dateText: 'вересень 2026' })
  owner = await createUser(db, { role: 'owner', name: 'Оля' })
  await grantStudios(db, owner, [studioA])
})

afterAll(async () => {
  await pool.end()
})

describe('section saves', () => {
  it('merge only their own keys into the one pending change set; the studio stays untouched', async () => {
    await save('pro-studiyu', { ownerAbout: 'Ми ліпимо', ownerNews: '', ownerQuote: '' })
    const first = await openSet()
    expect(await proposedKeys()).toEqual(['ownerAbout', 'ownerNews', 'ownerQuote'])
    await save('kontakty', { address: 'вул. Нова, 5', phone: '099 123 45 67', email: '', website: 'a.ua', instagram: '@studio_a', instagramPosts: [] })
    expect(await db.select().from(changeSets)).toHaveLength(1)
    expect((await openSet()).id).toBe(first.id)
    expect(await proposedKeys()).toEqual(['address', 'email', 'instagram', 'instagramPosts', 'ownerAbout', 'ownerNews', 'ownerQuote', 'phone', 'website'])
    // saving the first section again keeps the second one's keys
    await save('pro-studiyu', { ownerAbout: 'Ми ліпимо й розписуємо', ownerNews: '', ownerQuote: '' })
    const p = (await openSet()).proposed as Record<string, unknown>
    expect(p.ownerAbout).toBe('Ми ліпимо й розписуємо')
    expect(p.address).toBe('вул. Нова, 5')
    const [s] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(s!.ownerAbout).toBeNull()
    expect(s!.address).toBe('вул. Соборна, 1')
  })

  it('write nothing when the values are what the profile already has', async () => {
    const r = await save('kontakty', { address: 'вул. Соборна, 1', phone: '', email: '', website: 'https://a.ua/', instagram: 'https://www.instagram.com/studio_a/', instagramPosts: [] })
    expect(r.studio.sections.find((x) => x.key === 'kontakty')!.state).toBe('live')
    expect(r.changed).toBe(false)
    expect(await db.select().from(changeSets)).toHaveLength(0)
    // a real change says so; saving it again changes nothing
    const phone = { address: 'вул. Соборна, 1', phone: '099 123 45 67', email: '', website: 'https://a.ua/', instagram: 'https://www.instagram.com/studio_a/', instagramPosts: [] }
    expect((await save('kontakty', phone)).changed).toBe(true)
    expect((await save('kontakty', phone)).changed).toBe(false)
  })

  it('field errors come back keyed by field and nothing is saved', async () => {
    const err = await save('kontakty', { phone: '123', email: 'a@b', website: 'a b', instagram: 'two words', instagramPosts: ['', 'https://evil.example/p/1/'] }).catch((e) => e)
    expect(err).toBeInstanceOf(FieldErrors)
    expect(err).toBeInstanceOf(Invalid)
    expect(Object.keys((err as FieldErrors).fields).sort()).toEqual(['email', 'instagram', 'instagramPosts.1', 'phone', 'website'])
    const price = await save('tsiny', { prices: [{ text: '', date: 'жовтень 2026', source: '' }] }).catch((e) => e)
    expect((price as FieldErrors).fields).toEqual({ 'prices.0.text': 'Напишіть, що саме й скільки коштує.' })
    expect(await db.select().from(changeSets)).toHaveLength(0)
  })

  it('normalise phone, website and Instagram and return what was saved', async () => {
    const r = await save('kontakty', { address: 'вул. Соборна, 1', phone: '(099) 123-45-67', email: '', website: 'b.ua', instagram: 'nick', instagramPosts: ['instagram.com/p/AAA?x=1'] })
    expect(r.values).toEqual({ address: 'вул. Соборна, 1', phone: '+380 99 123 45 67', email: '', website: 'https://b.ua/', instagram: 'https://www.instagram.com/nick/', instagramPosts: ['https://www.instagram.com/p/AAA/'] })
  })

  it('price lines: unchanged text keeps its source, new or edited ones become «від студії»', async () => {
    await save('tsiny', { prices: [{ text: 'МК на гончарному колі, 2 год — 900 грн', date: 'жовтень 2026', source: '' }, { text: 'Розпис — 700 грн', date: '', source: '' }] })
    const prices = (await openSet()).proposed as { prices: { source: string; dateText: string | null }[] }
    expect(prices.prices.map((x) => x.source)).toEqual(['сайт', expect.stringMatching(/^від студії, \d{2}\.\d{4}$/)])
    expect(prices.prices[0]!.dateText).toBe('жовтень 2026')
  })

  it('another owner cannot touch the studio; a foreign slug is Forbidden', async () => {
    await expect(save('pro-studiyu', { ownerAbout: 'x' }, 'b')).rejects.toBeInstanceOf(Forbidden)
    const other = await createUser(db, { role: 'owner', name: 'Інна' })
    await grantStudios(db, other, [studioB])
    await expect(saveSection(db, { userId: other, ownerName: 'Інна', slug: 'a', section: 'pro-studiyu', data: { ownerAbout: 'x' } })).rejects.toBeInstanceOf(Forbidden)
    expect(await sectionPage(db, other, 'a', 'kontakty')).toBeNull()
    expect(await studioSummary(db, other, 'a')).toBeNull()
    expect((await ownerStudioSummaries(db, other)).map((s) => s.slug)).toEqual(['b'])
    expect(await db.select().from(changeSets)).toHaveLength(0)
  })

  it('tell the editor in Telegram, naming the section and keeping the news block', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't'
    process.env.TELEGRAM_CHAT_ID = '1'
    await save('pro-studiyu', { ownerAbout: 'Ми ліпимо', ownerNews: 'Нова серія', ownerQuote: '' })
    expect(tgCalls).toHaveLength(1)
    const text = String(tgCalls[0]!.body.text)
    expect(text).toContain('Зміни від власника: Студія А — Про студію')
    expect(text).toContain('перепишіть голосом сайту')
    expect(text).toContain('Нова серія')
    await save('pro-studiyu', { ownerAbout: 'Ми ліпимо', ownerNews: 'Нова серія', ownerQuote: '' })
    expect(tgCalls).toHaveLength(1)
  })
})

describe('section states', () => {
  it('summarise the published studio: live, missing, what is lacking', async () => {
    const sum = (await studioSummary(db, owner, 'a'))!
    expect(sum).toMatchObject({ name: 'Студія А', kicker: 'Студія · Суми', profileUrl: '/vyrobnyky/a', total: 6, reviewSince: null, savedAt: null })
    const by = Object.fromEntries(sum.sections.map((s) => [s.key, s]))
    expect(by['pro-studiyu']).toMatchObject({ state: 'live', line: 'Опис від редактора є. Своїми словами — ще ні.' })
    expect(by.posluhy).toMatchObject({ state: 'live', line: '2 послуги, 1 виріб' })
    expect(by.tsiny).toMatchObject({ state: 'live', line: '1 ціна · вересень 2026' })
    expect(by.biznes.state).toBe('missing')
    expect(by.kontakty).toMatchObject({ state: 'live', line: 'Адреса, сайт, Instagram · без телефону' })
    expect(by.foto.state).toBe('missing')
    expect(sum.filled).toBe(4)
    expect(sum.missing).toEqual([
      { label: 'фото', section: 'foto' },
      { label: 'умов для бізнесу', section: 'biznes' },
      { label: 'телефону', section: 'kontakty' },
    ])
  })

  it('a saved section turns to review; the others stay as they were', async () => {
    const r = await save('biznes', { minOrder: 'від 20 чашок', leadTime: '', logoMethods: ['Деколь'], foodSafe: true, dishwasherSafe: false, worksWithHoreca: false, worksWithCorporate: false })
    const by = Object.fromEntries(r.studio.sections.map((s) => [s.key, s.state]))
    expect(by).toMatchObject({ biznes: 'review', kontakty: 'live', foto: 'missing', 'pro-studiyu': 'live' })
    expect(r.studio.filled).toBe(5)
    expect(r.studio.reviewSince).not.toBeNull()
    expect(r.studio.savedAt).not.toBeNull()
    expect(r.studio.missing.map((m) => m.label)).toEqual(['фото', 'телефону'])
    const page = (await sectionPage(db, owner, 'a', 'biznes'))!
    expect(page.values).toMatchObject({ minOrder: 'від 20 чашок', logoMethods: ['Деколь'], foodSafe: true })
    expect((await sectionPage(db, owner, 'a', 'pro-studiyu'))!.extras).toEqual({ publicNow: 'Опис від редактора.' })
  })

  it('plural forms in the lines: 1 / 2–4 / 5+', async () => {
    const line = async (services: string[], products: string[]) =>
      (await save('posluhy', { services, products })).studio.sections.find((s) => s.key === 'posluhy')!.line
    expect(await line(['1'], [])).toBe('1 послуга')
    expect(await line(['1', '2', '3', '4', '5'], ['1', '2', '3', '4', '5', '6'])).toBe('5 послуг, 6 виробів')
    expect(await line(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], ['1', '2'])).toBe('12 послуг, 2 вироби')
  })

  it('an empty profile lists everything as missing', async () => {
    await db.update(studios).set({ publicDescription: null, services: [], products: [], address: null, website: null, instagram: null }).where(eq(studios.id, studioA))
    await db.delete(studioPrices)
    const sum = (await studioSummary(db, owner, 'a'))!
    expect(sum.filled).toBe(0)
    expect(sum.missing.map((m) => m.label)).toEqual(['фото', 'умов для бізнесу', 'цін', 'послуг і виробів', 'опису студії', 'контактів'])
  })
})

describe('photos', () => {
  it('a new photo is pending media, listed last, with a plain alt and no caption', async () => {
    const r = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#c86'), fileName: 'cup.png', mime: 'image/png' })
    expect(r.photos).toHaveLength(1)
    expect(r.photo).toMatchObject({ caption: null, canCaption: true, state: 'review' })
    expect(r.photo.url).toMatch(/^\/media\//)
    expect(r.studio.sections.find((s) => s.key === 'foto')).toMatchObject({ state: 'review', line: '1 фото' })
    const [m] = await db.select().from(media)
    expect(m).toMatchObject({ status: 'pending', alt: 'Фото від студії — Студія А' })
    const cs = await openSet()
    expect(cs.newMediaIds).toEqual([m!.id])
    expect(cs.photosNotifyAt).not.toBeNull()
    expect((cs.proposed as { consentPhotos: boolean }).consentPhotos).toBe(true)
    expect((await db.select().from(studioPhotos)).length).toBe(0)
    // accepted by the editor: the media becomes active and the profile shows it
    await applyChangeSet(db, cs.id, 'all-but-text', { id: null, source: 'panel' })
    expect((await db.select().from(media))[0]!.status).toBe('active')
    expect((await db.select().from(studioPhotos)).map((p) => p.mediaId)).toEqual([m!.id])
  })

  it('a caption given with the file is kept as the alt; the same file twice is listed once', async () => {
    const bytes = await png('#468')
    const a = await addPhoto(db, { userId: owner, slug: 'a', bytes, fileName: 'x.png', mime: 'image/png', caption: '  Чашка «Злива»  ' })
    expect(a.photo.caption).toBe('Чашка «Злива»')
    const b = await addPhoto(db, { userId: owner, slug: 'a', bytes, fileName: 'x.png', mime: 'image/png' })
    expect(b.photos).toHaveLength(1)
    expect(await db.select().from(media)).toHaveLength(1)
  })

  it('refuses non-images, big files and an eleventh photo (400 messages)', async () => {
    await expect(addPhoto(db, { userId: owner, slug: 'a', bytes: Buffer.from('pdf'), fileName: 'a.pdf', mime: 'application/pdf' })).rejects.toThrow('Це не фото. Підійдуть JPG, PNG, HEIC.')
    await expect(addPhoto(db, { userId: owner, slug: 'a', bytes: Buffer.alloc(9 * 1024 * 1024), fileName: 'a.jpg', mime: 'image/jpeg' })).rejects.toThrow('Фото більше 8 МБ.')
    const rows = await db.insert(media).values(Array.from({ length: 10 }, (_, i) => ({ fileName: `p${i}.jpg`, alt: 'p' }))).returning({ id: media.id })
    await db.insert(studioPhotos).values(rows.map((m, position) => ({ studioId: studioA, mediaId: m.id, position })))
    await expect(addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#111'), fileName: 'c.png', mime: 'image/png' })).rejects.toThrow('У профілі максимум 10 фото.')
    expect(await db.select().from(changeSets)).toHaveLength(0)
  })

  it('order: remove, reorder, make main; foreign ids are refused; repeats dropped', async () => {
    const rows = await db.insert(media).values(['x', 'y', 'z'].map((f) => ({ fileName: `${f}.jpg`, alt: f }))).returning({ id: media.id })
    const [x, y, z] = rows.map((r) => r.id) as [number, number, number]
    await db.insert(studioPhotos).values([x, y, z].map((mediaId, position) => ({ studioId: studioA, mediaId, position })))
    const [foreign] = await db.insert(media).values({ fileName: 'f.jpg', alt: 'f' }).returning({ id: media.id })

    const r = await setPhotoOrder(db, { userId: owner, slug: 'a', order: [z, x, z] })
    expect(r.photos.map((p) => p.id)).toEqual([z, x])
    expect(((await openSet()).proposed as { photos: number[] }).photos).toEqual([z, x])
    expect(r.photos.every((p) => p.state === 'live')).toBe(true)
    await expect(setPhotoOrder(db, { userId: owner, slug: 'a', order: [x, foreign!.id] })).rejects.toBeInstanceOf(Invalid)
    await expect(setPhotoOrder(db, { userId: owner, slug: 'b', order: [] })).rejects.toBeInstanceOf(Forbidden)
    expect(((await openSet()).proposed as { photos: number[] }).photos).toEqual([z, x])
    // the removed photo can be put back while it is still on review
    expect((await setPhotoOrder(db, { userId: owner, slug: 'a', order: [z, x, y] })).photos.map((p) => p.id)).toEqual([z, x, y])
  })

  it('captions: only on own uploads still on review; empty goes back to the default', async () => {
    const [pub] = await db.insert(media).values({ fileName: 'pub.jpg', alt: 'pub' }).returning({ id: media.id })
    await db.insert(studioPhotos).values({ studioId: studioA, mediaId: pub!.id, position: 0 })
    const { photo } = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#852'), fileName: 'n.png', mime: 'image/png' })
    const set = await setPhotoCaption(db, { userId: owner, slug: 'a', mediaId: photo.id, caption: ' Глечик ' })
    expect(set.photo.caption).toBe('Глечик')
    expect((await db.select().from(media).where(eq(media.id, photo.id)))[0]!.alt).toBe('Глечик')
    expect((await setPhotoCaption(db, { userId: owner, slug: 'a', mediaId: photo.id, caption: '' })).photo.caption).toBeNull()
    await expect(setPhotoCaption(db, { userId: owner, slug: 'a', mediaId: pub!.id, caption: 'hack' })).rejects.toBeInstanceOf(Forbidden)
    const [foreign] = await db.insert(media).values({ fileName: 'f.jpg', alt: 'f' }).returning({ id: media.id })
    await expect(setPhotoCaption(db, { userId: owner, slug: 'a', mediaId: foreign!.id, caption: 'hack' })).rejects.toBeInstanceOf(Forbidden)
    expect((await db.select().from(media).where(eq(media.id, pub!.id)))[0]!.alt).toBe('pub')
  })

  it('another owner cannot touch the photos', async () => {
    const other = await createUser(db, { role: 'owner', name: 'Інна' })
    await grantStudios(db, other, [studioB])
    await expect(addPhoto(db, { userId: other, slug: 'a', bytes: await png('#999'), fileName: 'n.png', mime: 'image/png' })).rejects.toBeInstanceOf(Forbidden)
    await expect(setPhotoOrder(db, { userId: other, slug: 'a', order: [] })).rejects.toBeInstanceOf(Forbidden)
    expect(await db.select().from(media)).toHaveLength(0)
  })
})

describe('photo list races', () => {
  const seed = async () => {
    const rows = await db.insert(media).values(['x', 'y', 'z'].map((f) => ({ fileName: `${f}.jpg`, alt: f }))).returning({ id: media.id })
    const [x, y, z] = rows.map((r) => r.id) as [number, number, number]
    await db.insert(studioPhotos).values([x, y, z].map((mediaId, position) => ({ studioId: studioA, mediaId, position })))
    return { x, y, z }
  }
  const proposedPhotos = async () => ((await openSet()).proposed as { photos: number[] }).photos

  it('an upload and a reorder that overlap both stay: the new photo is appended to the list as it is at the lock', async () => {
    const { x, y, z } = await seed()
    const bytes = await png('#7a3')
    const [added] = await Promise.all([
      addPhoto(db, { userId: owner, slug: 'a', bytes, fileName: 'n.png', mime: 'image/png' }),
      setPhotoOrder(db, { userId: owner, slug: 'a', order: [z, x], known: [x, y, z] }),
    ])
    expect(await proposedPhotos()).toEqual([z, x, added.photo.id])
    expect((await db.select().from(changeSets)).length).toBe(1)
  })

  it('an order that does not know a photo uploaded meanwhile keeps it at the end; one it did know and dropped stays dropped', async () => {
    const { x, y, z } = await seed()
    const { photo } = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#3a7'), fileName: 'n.png', mime: 'image/png' })
    // the page still shows x, y, z only, and removes y
    const r = await setPhotoOrder(db, { userId: owner, slug: 'a', order: [z, x], known: [x, y, z] })
    expect(r.photos.map((p) => p.id)).toEqual([z, x, photo.id])
    // without `known` the order is taken as it is
    expect((await setPhotoOrder(db, { userId: owner, slug: 'a', order: [photo.id, z] })).photos.map((p) => p.id)).toEqual([photo.id, z])
    // a photo removed from the proposal can still be put back, and an upload after a removal does not bring it back
    await setPhotoOrder(db, { userId: owner, slug: 'a', order: [z, x] })
    const again = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#a37'), fileName: 'm.png', mime: 'image/png' })
    expect(again.photos.map((p) => p.id)).toEqual([z, x, again.photo.id])
  })

  it('the photos GET returns what the server has; a foreign studio is Forbidden', async () => {
    const { x, y, z } = await seed()
    expect((await photosOf(db, { userId: owner, slug: 'a' })).photos.map((p) => p.id)).toEqual([x, y, z])
    await expect(photosOf(db, { userId: owner, slug: 'b' })).rejects.toBeInstanceOf(Forbidden)
  })
})

describe('orphan pending media', () => {
  const fileOf = async (id: number) => path.join(MEDIA_DIR(), (await db.select().from(media).where(eq(media.id, id)))[0]!.fileName)

  it('a file the owner uploaded and then removed is deleted when the change set is published', async () => {
    const a = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#111'), fileName: '1.png', mime: 'image/png' })
    const b = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#222'), fileName: '2.png', mime: 'image/png' })
    await setPhotoOrder(db, { userId: owner, slug: 'a', order: [a.photo.id] })
    const gone = await fileOf(b.photo.id)
    expect(existsSync(gone)).toBe(true)
    await applyChangeSet(db, (await openSet()).id, 'all-but-text', { id: null, source: 'panel' })
    expect((await db.select().from(media)).map((m) => [m.id, m.status])).toEqual([[a.photo.id, 'active']])
    expect(existsSync(gone)).toBe(false)
    expect(existsSync(await fileOf(a.photo.id))).toBe(true)
  })

  it('rejecting deletes every file of the change set that went nowhere', async () => {
    const a = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#333'), fileName: '1.png', mime: 'image/png' })
    const file = await fileOf(a.photo.id)
    await rejectChangeSet(db, (await openSet()).id, 'не підходить', { id: null, source: 'panel' })
    expect(await db.select().from(media)).toHaveLength(0)
    expect(existsSync(file)).toBe(false)
  })

  it('never deletes media that a profile shows, that is active, or that another open change set names', async () => {
    const a = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#444'), fileName: '1.png', mime: 'image/png' })
    const b = await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#555'), fileName: '2.png', mime: 'image/png' })
    // the first is shown by another studio meanwhile, the second is proposed by that studio's own open change set
    await db.insert(studioPhotos).values({ studioId: studioB, mediaId: a.photo.id, position: 0 })
    await db.insert(changeSets).values({ studioId: studioB, status: 'pending', proposed: { photos: [b.photo.id] }, newMediaIds: [] })
    await rejectChangeSet(db, (await db.select().from(changeSets).where(eq(changeSets.studioId, studioA)))[0]!.id, '', { id: null, source: 'panel' })
    expect((await db.select().from(media)).map((m) => m.id).sort()).toEqual([a.photo.id, b.photo.id].sort())
    expect(existsSync(await fileOf(a.photo.id))).toBe(true)
    expect(existsSync(await fileOf(b.photo.id))).toBe(true)
  })
})

describe('Telegram «Опублікувати» and photos still arriving', () => {
  it('does not publish while the note about new photos has not gone out; publishes after it', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't'
    process.env.TELEGRAM_CHAT_ID = '1'
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#666'), fileName: '1.png', mime: 'image/png' })
    const early = await handleTap(db, `s:p:${studioA}`, { id: null, source: 'telegram' })
    expect(early.answer).toBe('Є нові фото від студії, повідомлення про них прийде за кілька хвилин. Опублікуйте після нього або в панелі.')
    expect(early.mark).toBeUndefined()
    expect((await openSet()).status).toBe('pending')
    expect((await handleTap(db, `s:n:${studioA}`, { id: null, source: 'telegram' })).answer).toBe(early.answer)
    expect((await db.select().from(studioPhotos)).length).toBe(0)
    // the note goes out (it clears the time): now the button applies
    await db.update(changeSets).set({ photosNotifyAt: sql`now() - interval '1 minute'` })
    expect(await sendDuePhotoNotices(db)).toBe(1)
    expect((await handleTap(db, `s:p:${studioA}`, { id: null, source: 'telegram' })).answer).toBe('Опубліковано')
    expect((await db.select().from(studioPhotos)).length).toBe(1)
  })

  it('a text-only change set is not held back', async () => {
    await save('biznes', { minOrder: 'від 20 чашок', leadTime: '', logoMethods: [], foodSafe: false, dishwasherSafe: false, worksWithHoreca: false, worksWithCorporate: false })
    expect((await handleTap(db, `s:p:${studioA}`, { id: null, source: 'telegram' })).answer).toBe('Опубліковано')
  })
})

describe('the delayed Telegram note about photos', () => {
  const due = () => db.update(changeSets).set({ photosNotifyAt: sql`now() - interval '1 minute'` })

  it('waits ten minutes, then goes out once with the counts and the review buttons', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't'
    process.env.TELEGRAM_CHAT_ID = '1'
    const olds = await db.insert(media).values([{ fileName: 'old.jpg', alt: 'old' }, { fileName: 'old2.jpg', alt: 'old2' }]).returning({ id: media.id })
    await db.insert(studioPhotos).values(olds.map((m, position) => ({ studioId: studioA, mediaId: m.id, position })))
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#aaa'), fileName: '1.png', mime: 'image/png' })
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#bbb'), fileName: '2.png', mime: 'image/png' })
    const [{ minutes }] = (await db.execute(sql`select extract(epoch from (photos_notify_at - now())) / 60 as minutes from app.change_sets`)).rows as { minutes: number }[]
    expect(Number(minutes)).toBeGreaterThan(9)
    expect(Number(minutes)).toBeLessThanOrEqual(10)
    expect(tgCalls).toHaveLength(0)
    expect(await sendDuePhotoNotices(db)).toBe(0)

    await due()
    expect(await sendDuePhotoNotices(db)).toBe(1)
    expect(await sendDuePhotoNotices(db)).toBe(0)
    expect(tgCalls).toHaveLength(1)
    expect(String(tgCalls[0]!.body.text)).toBe('Фото від власника: Студія А\nнових: 2')
    expect(tgCalls[0]!.body.reply_markup).toMatchObject({ inline_keyboard: [[{ text: expect.stringContaining('Переглянути') }, { callback_data: `s:p:${studioA}` }]] })
    expect((await openSet()).photosNotifyAt).toBeNull()

    // a later photo action starts a new quiet time
    const [o1, o2, n1] = ((await openSet()).proposed as { photos: number[] }).photos as [number, number, number]
    await setPhotoOrder(db, { userId: owner, slug: 'a', order: [o2, o1, n1] })
    expect((await openSet()).photosNotifyAt).not.toBeNull()
    await due()
    expect(await sendDuePhotoNotices(db)).toBe(1)
    expect(String(tgCalls[1]!.body.text)).toBe('Фото від власника: Студія А\nнових: 1, порядок змінено')
  })

  it('sends nothing once the change set is published or rejected', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't'
    process.env.TELEGRAM_CHAT_ID = '1'
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#abc'), fileName: '1.png', mime: 'image/png' })
    await due()
    await applyChangeSet(db, (await openSet()).id, 'all-but-text', { id: null, source: 'panel' })
    expect(await sendDuePhotoNotices(db)).toBe(0)
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#cba'), fileName: '2.png', mime: 'image/png' })
    await due()
    await rejectChangeSet(db, (await db.select().from(changeSets).where(eq(changeSets.status, 'pending')))[0]!.id, '', { id: null, source: 'panel' })
    expect(await sendDuePhotoNotices(db)).toBe(0)
    expect(tgCalls).toHaveLength(0)
  })

  it('does nothing where the bot is not configured', async () => {
    await addPhoto(db, { userId: owner, slug: 'a', bytes: await png('#def'), fileName: '1.png', mime: 'image/png' })
    await due()
    expect(await sendDuePhotoNotices(db)).toBe(0)
    expect(tgCalls).toHaveLength(0)
  })
})
