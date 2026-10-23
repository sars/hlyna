// Shop orders against a real Postgres (PANEL_TEST_DATABASE_URL, default hlyna_apptest): a checkout splits a cart by
// studio and checks every line against the catalogue, the studio's transitions, stock held and returned, the owner's
// Telegram link and the order buttons, and the shop's shared rules (src/lib/shop.ts).
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { cities, studios } from '../../src/server/db/schema/catalog'
import { items } from '../../src/server/db/schema/items'
import { orders } from '../../src/server/db/schema/orders'
import { createUser, grantStudios } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { createCheckout, getCheckout, getOrder, listOrders, openOrderCounts, OrderError, setOrderStatus, updateOrder } from '../../src/server/services/orders'
import { linkOwnerTelegram, studioOwnerChats, telegramLinkToken } from '../../src/server/services/ownerTelegram'
import { handleTap } from '../../src/server/telegram/actions'
import { canOrder, effectiveTerms, itemState, leadText, nextStatuses, normalizePhone, uah } from '../../src/lib/shop'
import type { Actor } from '../../src/server/services/audit'

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
const staff: Actor = { id: 'staff', source: 'panel' }

let partnerA: number
let partnerB: number
let nonPartner: number
let cup: number // A, series in stock, 950
let bowl: number // A, one of a kind, 1200
let lamp: number // B, series in stock, 3000
let soldCup: number // A, sold
let igVase: number // non-partner, Instagram, in stock
let owner: string

const item = (studioId: number, slug: string, o: Partial<typeof items.$inferInsert> = {}) =>
  db
    .insert(items)
    .values({ studioId, slug, source: 'shop', sourceUrl: `https://shop.test/${slug}`, sourceKey: slug, title: slug, category: 'chashky', kind: 'series', priceText: '950 грн', priceMin: 950, priceMax: 950, availability: 'in_stock', confirmedAt: '2026-10-20', visibility: 'public', ...o })
    .returning({ id: items.id })
    .then((r) => r[0]!.id)

const buyer = {
  buyerName: 'Оксана Коваль',
  buyerPhone: '067 123 45 67',
  deliveryMethod: 'np_branch',
  deliveryCity: 'Київ',
  deliveryPoint: 'Відділення 12',
  paymentMethod: 'transfer',
  sourcePage: '/kramnytsia/oformlennia',
}

beforeEach(async () => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '-100'
  tgCalls.length = 0
  await db.execute(sql`truncate app.audit_log, app.order_items, app.orders, app.item_photos, app.item_checks, app.items, app.studio_owner, app.session, app.account, app."user", app.rate_limit, app.studios, app.cities restart identity cascade`)
  const [{ id: cityId }] = await db.insert(cities).values({ slug: 'sumy', name: 'Суми' }).returning({ id: cities.id })
  const studio = (slug: string, o: Partial<typeof studios.$inferInsert> = {}) =>
    db
      .insert(studios)
      .values({ slug, name: `Студія ${slug}`, cityId, visibility: 'public', status: 'active', type: 'studio', consentRequests: true, address: 'вул. Соборна, 1', ...o })
      .returning({ id: studios.id })
      .then((r) => r[0]!.id)
  partnerA = await studio('a')
  partnerB = await studio('b', { shopTerms: { delivery: ['np_courier'], payment: ['on_delivery'] } })
  nonPartner = await studio('c', { consentRequests: false })
  cup = await item(partnerA, 'cup')
  bowl = await item(partnerA, 'bowl', { kind: 'piece', priceMin: 1200, priceMax: 1200, priceText: '1200 грн', category: 'tarilky-i-mysky' })
  soldCup = await item(partnerA, 'sold-cup', { availability: 'sold' })
  lamp = await item(partnerB, 'lamp', { priceMin: 3000, priceMax: 3000, category: 'svitylnyky' })
  igVase = await item(nonPartner, 'vase', { source: 'instagram', category: 'vazy-i-dekor' })
  owner = await createUser(db, { role: 'owner', name: 'Оля' })
  await grantStudios(db, owner, [partnerA])
})

afterAll(async () => {
  await pool.end()
})

describe('shared rules', () => {
  it('formats hryvnias and reads phones', () => {
    expect(uah(95000)).toBe('950 грн')
    expect(uah(125050)).toBe('1 250,50 грн')
    expect(normalizePhone('067 123 45 67')).toBe('+380671234567')
    expect(normalizePhone('+38 (067) 123-45-67')).toBe('+380671234567')
    expect(normalizePhone('380671234567')).toBe('+380671234567')
    expect(normalizePhone('12345')).toBeNull()
  })

  it('names states and lead times', () => {
    const base = { kind: 'series' as const, availability: 'in_stock' as const, sourceGone: false, stock: null }
    expect(itemState(base)).toBe('in_stock')
    expect(itemState({ ...base, kind: 'piece' })).toBe('piece')
    expect(itemState({ ...base, availability: 'unknown' })).toBe('unknown')
    expect(itemState({ ...base, kind: 'to_order', availability: 'to_order' })).toBe('to_order')
    expect(itemState({ ...base, stock: 0 })).toBe('reserved')
    expect(itemState({ ...base, availability: 'sold' })).toBe('sold')
    expect(leadText(14, 28)).toBe('2–4 тижні')
    expect(leadText(7, 7)).toBe('7 днів')
    expect(leadText(14, 14)).toBe('2 тижні')
    expect(leadText(3, 7)).toBe('3–7 днів')
    expect(leadText(null, null)).toBeNull()
  })

  it('lets only a partner’s priced, unsold item be ordered', () => {
    const i = { kind: 'series' as const, availability: 'in_stock' as const, visibility: 'public' as const, sourceGone: false, priceMin: 950 }
    const s = { visibility: 'public', status: 'active', consentRequests: true }
    expect(canOrder(i, s)).toBe(true)
    expect(canOrder(i, { ...s, consentRequests: false })).toBe(false)
    expect(canOrder({ ...i, availability: 'sold' }, s)).toBe(false)
    expect(canOrder({ ...i, availability: 'unknown' }, s)).toBe(true)
    expect(canOrder({ ...i, priceMin: null }, s)).toBe(false)
    expect(canOrder({ ...i, stock: 0 }, s)).toBe(false)
  })

  it('fills a studio’s shop terms with defaults', () => {
    const t = effectiveTerms(null, 'вул. Соборна, 1')
    expect(t.delivery).toEqual(['np_branch', 'np_postomat', 'np_courier', 'pickup'])
    expect(t.payment).toEqual(['transfer', 'on_delivery'])
    expect(effectiveTerms(null, null).delivery).not.toContain('pickup')
    expect(effectiveTerms({ delivery: ['pickup'] }, null).delivery).toEqual([])
    expect(nextStatuses('new')).toContain('confirmed')
    expect(nextStatuses('done')).toEqual([])
  })
})

describe('checkout', () => {
  it('makes one order per studio, prices from the catalogue, and tells Telegram', async () => {
    const r = await createCheckout(db, { ...buyer, deliveryMethod: 'np_courier', deliveryPoint: 'вул. Хрещатик, 1, кв. 2', paymentMethod: 'on_delivery', lines: [{ itemId: cup, qty: 2 }, { itemId: cup, qty: 1 }, { itemId: lamp, qty: 1 }] }, '1.1.1.1')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.orders).toHaveLength(2)
    const all = await getCheckout(db, r.token)
    expect(all.map((o) => o.studio.slug).sort()).toEqual(['a', 'b'])
    const a = all.find((o) => o.studio.slug === 'a')!
    expect(a.lines).toEqual([expect.objectContaining({ title: 'cup', qty: 3, unitKop: 95000, itemPath: '/kramnytsia/a/cup' })])
    expect(a.subtotalKop).toBe(285000)
    expect(a.commissionKop).toBe(28500)
    expect(a.buyerPhone).toBe('+380671234567')
    expect(a.status).toBe('new')
    // the owner's group hears about both, the studio owner (unlinked) about none
    expect(tgCalls.filter((c) => c.method === 'sendMessage')).toHaveLength(2)
    expect(String(tgCalls[0]!.body.text)).toContain('Замовлення №')
  })

  it('refuses a sold item, a non-partner’s item, a way the studio does not offer, a bad phone', async () => {
    const sold = await createCheckout(db, { ...buyer, lines: [{ itemId: soldCup, qty: 1 }] }, '1.1.1.2')
    expect(sold).toMatchObject({ ok: false, status: 409, field: 'lines' })
    const ig = await createCheckout(db, { ...buyer, lines: [{ itemId: igVase, qty: 1 }] }, '1.1.1.3')
    expect(ig).toMatchObject({ ok: false, status: 409 })
    const way = await createCheckout(db, { ...buyer, lines: [{ itemId: lamp, qty: 1 }] }, '1.1.1.4')
    expect(way).toMatchObject({ ok: false, status: 400, field: 'deliveryMethod' })
    const pay = await createCheckout(db, { ...buyer, deliveryMethod: 'np_courier', deliveryPoint: 'вул. 1', lines: [{ itemId: lamp, qty: 1 }] }, '1.1.1.5')
    expect(pay).toMatchObject({ ok: false, status: 400, field: 'paymentMethod' })
    const phone = await createCheckout(db, { ...buyer, buyerPhone: '12345678', lines: [{ itemId: cup, qty: 1 }] }, '1.1.1.6')
    expect(phone).toMatchObject({ ok: false, status: 400, field: 'buyerPhone' })
    const missing = await createCheckout(db, { ...buyer, deliveryPoint: '', lines: [{ itemId: cup, qty: 1 }] }, '1.1.1.7')
    expect(missing).toMatchObject({ ok: false, status: 400, field: 'deliveryPoint' })
    expect(await db.select().from(orders)).toHaveLength(0)
  })

  it('holds a one-off while its order is open and frees it on cancellation', async () => {
    const r = await createCheckout(db, { ...buyer, lines: [{ itemId: bowl, qty: 1 }] }, '1.1.1.8')
    expect(r.ok).toBe(true)
    const [held] = await db.select({ stock: items.stock }).from(items).where(eq(items.id, bowl))
    expect(held!.stock).toBe(0)
    const again = await createCheckout(db, { ...buyer, lines: [{ itemId: bowl, qty: 1 }] }, '1.1.1.9')
    expect(again).toMatchObject({ ok: false, status: 409 })
    const id = (await db.select({ id: orders.id }).from(orders))[0]!.id
    await setOrderStatus(db, id, 'cancelled', staff, { by: 'staff', reason: 'покупець передумав' })
    const [freed] = await db.select({ stock: items.stock }).from(items).where(eq(items.id, bowl))
    expect(freed!.stock).toBe(1)
    expect((await getOrder(db, id))!.cancelReason).toBe('покупець передумав')
  })

  it('pickup takes the studio’s address and the honeypot stops bots', async () => {
    const r = await createCheckout(db, { ...buyer, deliveryMethod: 'pickup', deliveryCity: '', deliveryPoint: '', lines: [{ itemId: cup, qty: 1 }] }, '1.1.2.1')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((await getCheckout(db, r.token))[0]!.deliveryPoint).toBe('вул. Соборна, 1')
    const bot = await createCheckout(db, { ...buyer, website2: 'x', lines: [{ itemId: cup, qty: 1 }] }, '1.1.2.2')
    expect(bot.ok).toBe(false)
  })
})

describe('the studio and the staff on an order', () => {
  async function oneOrder() {
    const r = await createCheckout(db, { ...buyer, lines: [{ itemId: cup, qty: 1 }] }, '2.2.2.2')
    if (!r.ok) throw new Error(r.error)
    return r.orders[0]!.id
  }

  it('a studio follows the steps; staff may jump; the same status twice changes nothing', async () => {
    const id = await oneOrder()
    const studioActor: Actor = { id: owner, source: 'kabinet' }
    await expect(setOrderStatus(db, id, 'done', studioActor, { by: 'studio' })).rejects.toBeInstanceOf(OrderError)
    expect(await setOrderStatus(db, id, 'confirmed', studioActor, { by: 'studio' })).toMatchObject({ already: false, from: 'new' })
    expect(await setOrderStatus(db, id, 'confirmed', studioActor, { by: 'studio' })).toMatchObject({ already: true })
    await setOrderStatus(db, id, 'shipped', studioActor, { by: 'studio' })
    await setOrderStatus(db, id, 'done', staff, { by: 'staff' })
    expect((await getOrder(db, id))!.status).toBe('done')
    const log = await db.execute<{ action: string; changes: Record<string, unknown> }>(sql`select action, changes from app.audit_log where entity = 'order' and entity_id = ${String(id)} order by id`)
    expect(log.rows.map((r) => r.action)).toEqual(['create', 'status', 'status', 'status'])
  })

  it('keeps the tracking number, the note and the payment state', async () => {
    const id = await oneOrder()
    expect(await updateOrder(db, id, { tracking: ' 2045 0000 1111 2222 ', studioNote: 'пакуємо в п’ятницю', paymentStatus: 'paid' }, staff)).toMatchObject({ changed: true })
    const o = (await getOrder(db, id))!
    expect(o.tracking).toBe('2045 0000 1111 2222')
    expect(o.paymentStatus).toBe('paid')
    expect(o.paidAt).toBeTruthy()
    expect(await updateOrder(db, id, { tracking: '2045 0000 1111 2222' }, staff)).toMatchObject({ changed: false })
  })

  it('lists and counts', async () => {
    const id = await oneOrder()
    expect((await listOrders(db, { status: 'open' })).rows.map((o) => o.id)).toEqual([id])
    expect((await listOrders(db, { q: 'коваль' })).rows).toHaveLength(1)
    expect((await listOrders(db, { q: '067' })).rows).toHaveLength(1)
    expect((await listOrders(db, { studioId: partnerB })).rows).toHaveLength(0)
    expect((await openOrderCounts(db, [partnerA, partnerB])).get(partnerA)).toBe(1)
  })
})

describe('the owner’s Telegram', () => {
  it('links a chat by the cabinet’s token, then gets new orders with buttons that only that owner may tap', async () => {
    const token = await telegramLinkToken(db, owner)
    expect(await telegramLinkToken(db, owner)).toBe(token)
    expect(await linkOwnerTelegram(db, 'nope', 555, { id: null, source: 'telegram' })).toBeNull()
    expect(await linkOwnerTelegram(db, token, 555, { id: null, source: 'telegram' })).toMatchObject({ userId: owner, name: 'Оля' })
    expect(await studioOwnerChats(db, partnerA)).toEqual([{ userId: owner, chatId: 555 }])
    expect(await studioOwnerChats(db, partnerB)).toEqual([])

    const r = await createCheckout(db, { ...buyer, lines: [{ itemId: cup, qty: 1 }] }, '3.3.3.3')
    if (!r.ok) throw new Error(r.error)
    const sent = tgCalls.filter((c) => c.method === 'sendMessage')
    expect(sent.map((c) => c.body.chat_id)).toEqual(['-100', 555])
    const toOwner = sent[1]!.body as { text: string; reply_markup: { inline_keyboard: { text: string; callback_data?: string }[][] } }
    expect(toOwner.text).toContain('Нове замовлення')
    expect(toOwner.reply_markup.inline_keyboard[0]![0]!.callback_data).toBe(`o:c:${r.orders[0]!.id}`)

    const id = r.orders[0]!.id
    const stranger = await handleTap(db, `o:c:${id}`, { id: null, source: 'telegram' }, { ourChat: false, chatId: 999 })
    expect(stranger.answer).toBe('Це замовлення не вашої студії')
    expect((await getOrder(db, id))!.status).toBe('new')
    // a studio cannot close a new order in one tap; staff can
    const skip = await handleTap(db, `o:d:${id}`, { id: null, source: 'telegram' }, { ourChat: false, chatId: 555 })
    expect(skip.answer).toContain('не можна перейти')
    const ok = await handleTap(db, `o:c:${id}`, { id: null, source: 'telegram' }, { ourChat: false, chatId: 555 })
    expect(ok.answer).toBe('Підтверджено')
    expect(ok.mark?.keyboard[0]![0]!.callback_data).toBe(`o:s:${id}`)
    expect((await getOrder(db, id))!.status).toBe('confirmed')
    const staffTap = await handleTap(db, `o:d:${id}`, { id: null, source: 'telegram' }, { ourChat: true, chatId: -100 })
    expect(staffTap.answer).toBe('Виконано')
  })
})
