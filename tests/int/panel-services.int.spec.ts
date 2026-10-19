// Panel services against a real Postgres (schema `app`): requests, claims, owner change sets, audit log,
// revisions, and the Telegram button handlers that share them. Uses PANEL_TEST_DATABASE_URL (default hlyna_apptest).
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { inviteLinks, studioOwner, user } from '../../src/server/db/schema/auth'
import { cities, studioPrices, studios } from '../../src/server/db/schema/catalog'
import { auditLog, changeSets, studioRevisions } from '../../src/server/db/schema/history'
import { claims, claimStudios, requests } from '../../src/server/db/schema/requests'
import { createUser } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { applyChangeSet, getChangeSet, normalizeProposed, rejectChangeSet } from '../../src/server/services/changeSets'
import { approveClaim, rejectClaim } from '../../src/server/services/claims'
import { getRequest, setRequestStatus, setRequestStudios, updateRequest } from '../../src/server/services/requests'
import { handleTap } from '../../src/server/telegram/actions'

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db
const panel = { id: null, source: 'panel' as const }
const bot = { id: null, source: 'telegram' as const }

let cityId: number
let studioA: number
let studioB: number

beforeEach(async () => {
  await db.execute(sql`truncate app.audit_log, app.change_sets, app.studio_revisions, app.request_studios, app.requests, app.claim_studios, app.claims, app.invite_links, app.studio_owner, app.session, app.account, app."user", app.studio_prices, app.studio_photos, app.studios, app.cities restart identity cascade`)
  ;[{ id: cityId }] = await db.insert(cities).values({ slug: 'kyiv', name: 'Київ' }).returning({ id: cities.id })
  ;[{ id: studioA }] = await db.insert(studios).values({ slug: 'a', name: 'Студія А', cityId, visibility: 'public', instagram: 'https://www.instagram.com/a/' }).returning({ id: studios.id })
  ;[{ id: studioB }] = await db.insert(studios).values({ slug: 'b', name: 'Студія Б', cityId, visibility: 'public' }).returning({ id: studios.id })
  await db.insert(studioPrices).values({ studioId: studioA, position: 0, text: 'МК — 900 грн', source: 'сайт', dateText: '2026' })
})

afterAll(async () => {
  await pool.end()
})

const auditCount = async (entity: string) => (await db.select({ n: sql<number>`count(*)::int` }).from(auditLog).where(eq(auditLog.entity, entity)))[0]!.n

describe('requests', () => {
  it('status change is idempotent and audited once', async () => {
    const [{ id }] = await db.insert(requests).values({ what: 'tableware', contactName: 'Оля' }).returning({ id: requests.id })
    expect((await setRequestStatus(db, id, 'in_progress', panel)).changed).toBe(true)
    expect((await setRequestStatus(db, id, 'in_progress', panel)).changed).toBe(false)
    expect(await auditCount('request')).toBe(1)
    expect((await getRequest(db, id))!.status).toBe('in_progress')
  })

  it('deal amount stores kopecks and Postgres computes the 10 % commission', async () => {
    const [{ id }] = await db.insert(requests).values({ what: 'logo-mugs' }).returning({ id: requests.id })
    await updateRequest(db, id, { dealAmountUah: 12345.67, notes: 'тест' }, panel)
    const r = await getRequest(db, id)
    expect(r!.dealAmountKop).toBe(1234567)
    expect(r!.commissionKop).toBe(123457)
    expect(r!.notes).toBe('тест')
  })

  it('forwarding keeps order and sent dates', async () => {
    const [{ id }] = await db.insert(requests).values({ what: 'tableware' }).returning({ id: requests.id })
    await setRequestStudios(db, id, [studioB, studioA], panel)
    const r = await getRequest(db, id)
    expect(r!.sent.map((s) => s.id)).toEqual([studioB, studioA])
    expect(r!.sent.every((s) => s.sentAt)).toBe(true)
  })
})

describe('claims', () => {
  async function claim() {
    const [{ id }] = await db.insert(claims).values({ name: 'Катерина', contact: '@kat', represents: true }).returning({ id: claims.id })
    await db.insert(claimStudios).values([
      { claimId: id, studioId: studioA, isMain: true, position: 0 },
      { claimId: id, studioId: studioB, position: 1 },
    ])
    return id
  }

  it('approve creates the owner, grants both studios, marks them verified with a revision, issues one link; repeat is a no-op', async () => {
    const id = await claim()
    const r = await approveClaim(db, id, panel)
    expect(r.status).toBe('approved')
    if (r.status !== 'approved') return
    expect(r.link).toMatch(/\/kabinet\/parol\?token=/)
    expect(r.message).toContain(r.link!)
    const grants = await db.select().from(studioOwner).where(eq(studioOwner.userId, r.ownerId))
    expect(grants.map((g) => g.studioId).sort()).toEqual([studioA, studioB].sort())
    const [a] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(a!.ownerVerified).toBe(true)
    expect(a!.revision).toBe(2)
    expect((await db.select().from(studioRevisions).where(eq(studioRevisions.studioId, studioA))).length).toBe(1)
    const again = await approveClaim(db, id, panel)
    expect(again.status === 'approved' && again.already).toBe(true)
    expect((await db.select().from(inviteLinks)).length).toBe(1)
    expect((await rejectClaim(db, id, 'ні', panel)).status).toBe('approved')
  })

  it('approve can attach to an existing owner instead of creating one', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Є власник' })
    const id = await claim()
    const r = await approveClaim(db, id, panel, { linkToOwnerId: owner })
    expect(r.status === 'approved' && r.ownerId).toBe(owner)
    expect((await db.select().from(user)).length).toBe(1)
  })

  it('reject stores the reason and blocks a later approval', async () => {
    const id = await claim()
    await rejectClaim(db, id, 'не підтвердилось', panel)
    const [c] = await db.select().from(claims).where(eq(claims.id, id))
    expect(c!.status).toBe('rejected')
    expect(c!.rejectReason).toBe('не підтвердилось')
    expect((await approveClaim(db, id, panel)).status).toBe('rejected')
  })
})

describe('owner change sets', () => {
  async function changeSet(proposed: Record<string, unknown>) {
    const [{ id }] = await db.insert(changeSets).values({ studioId: studioA, proposed, baseRevision: 1 }).returning({ id: changeSets.id })
    return id
  }

  it('normalises the legacy Payload draft shape', () => {
    const n = normalizeProposed({ services: [{ text: 'Гончарне коло' }], 'activity.instagramPosts': [{ url: 'https://www.instagram.com/p/x/' }], 'consent.photos': true, prices: [{ text: 'X', date: '2026', source: null }] })
    expect(n.services).toEqual(['Гончарне коло'])
    expect(n.instagramPosts).toEqual(['https://www.instagram.com/p/x/'])
    expect(n.consentPhotos).toBe(true)
    expect(n.prices).toEqual([{ text: 'X', source: null, dateText: '2026' }])
  })

  it('applies only accepted fields, keeps owner text internal, records a revision and closes the set', async () => {
    const id = await changeSet({
      prices: [{ text: 'МК — 1 000 грн', source: 'від студії, 10.2026' }],
      b2b: { minOrder: '20 шт', leadTime: '4 тижні', foodSafe: true },
      ownerAbout: 'Ми найкраща студія міста!',
      phone: '+380 50 000 00 00',
    })
    const view = await getChangeSet(db, id)
    expect(view!.fields.map((f) => f.key)).toEqual(['prices', 'b2b', 'phone', 'ownerAbout'])
    const r = await applyChangeSet(db, id, ['prices', 'b2b'], panel, { publicDescription: 'Студія в центрі Києва.' })
    expect(r.status).toBe('partially_applied')
    const [a] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(a!.b2bMinOrder).toBe('20 шт')
    expect(a!.b2bFoodSafe).toBe(true)
    expect(a!.phone).toBeNull()
    expect(a!.ownerAbout).toBeNull()
    expect(a!.publicDescription).toBe('Студія в центрі Києва.')
    expect(a!.revision).toBe(2)
    const prices = await db.select().from(studioPrices).where(eq(studioPrices.studioId, studioA))
    expect(prices.map((p) => p.text)).toEqual(['МК — 1 000 грн'])
    expect((await applyChangeSet(db, id, 'all', panel)).already).toBe(true)
  })

  it('«all but text» skips owner text but publishes studio news, dated; reject closes without changes', async () => {
    const id = await changeSet({ ownerAbout: 'про нас', ownerNews: 'новина', email: 'a@b.ua' })
    const [{ updatedAt }] = await db.select({ updatedAt: changeSets.updatedAt }).from(changeSets).where(eq(changeSets.id, id))
    const r = await applyChangeSet(db, id, 'all-but-text', panel)
    expect(r.applied).toEqual(['ownerNews', 'email'])
    const [n] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect([n!.ownerNews, n!.ownerNewsAt, n!.ownerAbout]).toEqual(['новина', updatedAt, null])
    const id2 = await changeSet({ email: 'x@y.ua' })
    await rejectChangeSet(db, id2, 'дубль', panel)
    const [a] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(a!.email).toBe('a@b.ua')
  })
})

describe('telegram buttons use the same services', () => {
  it('request status and claim approval from a tap', async () => {
    const [{ id }] = await db.insert(requests).values({ what: 'tableware' }).returning({ id: requests.id })
    const r = await handleTap(db, `r:w:${id}`, bot)
    expect(r.answer).toBe('В роботі')
    expect((await getRequest(db, id))!.status).toBe('in_progress')
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.entity, 'request'))
    expect(audit!.source).toBe('telegram')

    const [{ id: cid }] = await db.insert(claims).values({ name: 'К', contact: '@k' }).returning({ id: claims.id })
    await db.insert(claimStudios).values({ claimId: cid, studioId: studioB, isMain: true })
    const a = await handleTap(db, `c:a:${cid}`, bot)
    expect(a.answer).toBe('Схвалено')
    expect(a.say?.[1]?.text).toMatch(/kabinet\/parol\?token=/)
    expect((await handleTap(db, `c:a:${cid}`, bot)).answer).toBe('Вже схвалено')
  })

  it('«Опублікувати» publishes studio news without asking', async () => {
    await db.insert(changeSets).values({ studioId: studioA, proposed: { ownerNews: 'Ярмарок 25 жовтня', phone: '+380' } })
    expect((await handleTap(db, `s:p:${studioA}`, bot)).answer).toBe('Опубліковано')
    const [a] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(a!.ownerNews).toBe('Ярмарок 25 жовтня')
    expect(a!.ownerNewsAt).not.toBeNull()
  })

  it('«Опублікувати» asks first when owner text is present', async () => {
    await db.insert(changeSets).values({ studioId: studioA, proposed: { ownerAbout: 'текст', phone: '+380' } })
    const ask = await handleTap(db, `s:p:${studioA}`, bot)
    expect(ask.say?.[0]?.keyboard?.[0]?.[0]?.callback_data).toBe(`s:n:${studioA}`)
    const done = await handleTap(db, `s:n:${studioA}`, bot)
    expect(done.answer).toBe('Опубліковано')
    const [a] = await db.select().from(studios).where(eq(studios.id, studioA))
    expect(a!.phone).toBe('+380')
    expect(a!.ownerAbout).toBeNull()
  })
})
