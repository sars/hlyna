import { createHash, randomBytes } from 'node:crypto'

import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { cities, studios } from '../db/schema/catalog'
import { items } from '../db/schema/items'
import { orderItems, orders } from '../db/schema/orders'
import type { TgKeyboard } from '../telegram/tg'
import { tg } from '../telegram/tg'
import { site } from '../../content/site'
import { canOrder, effectiveTerms, itemPath, nextStatuses, normalizePhone, OFFER_VERSION, uah } from '../../lib/shop'
import { shopName } from '../../lib/present'
import { DELIVERY_METHOD_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus, type PaymentStatus } from '../../shared/options'
import { checkoutCreate } from '../../shared/schemas'
import { audit, diff, type Actor, type Exec } from './audit'
import { rateLimited } from './limits'
import { studioOwnerChats } from './ownerTelegram'

// Shop orders (docs/shop/PLAN.md): a checkout makes one order per studio; the studio confirms, ships and closes it in
// /kabinet or with the Telegram buttons; staff see and may change everything in /panel; the buyer follows the checkout
// at /kramnytsia/zamovlennia/<token>. Prices and titles come from the database at checkout, never from the browser.

export class OrderError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message)
  }
}
export class NotFound extends Error {}

export const PAGE = 50
const PUBLIC: Actor = { id: null, source: 'kabinet' }
const token = () => randomBytes(18).toString('base64url')
export const hashIp = (ip: string) => createHash('sha256').update(`${ip}|orders`).digest('hex').slice(0, 32)

type Line = { itemId: number; qty: number; options?: { recipient?: string; message?: string } }

export type CheckoutResult = { ok: true; token: string; orders: { id: number; studio: string }[] } | { ok: false; status: number; error: string; field?: string }

/**
 * Turns a cart into orders. Every line is checked against the catalogue: the item must be orderable now (a partner's
 * public item with a price, not sold or gone), the delivery and payment ways must be ones its studio offers.
 */
export async function createCheckout(db: Db, raw: unknown, ip: string): Promise<CheckoutResult> {
  if (await rateLimited(db, `order:${ip}`, 10, 3600_000)) return { ok: false, status: 429, error: 'Забагато замовлень. Спробуйте пізніше.' }
  const parsed = checkoutCreate.safeParse(raw)
  if (!parsed.success) {
    const i = parsed.error.issues[0]
    return { ok: false, status: 400, error: i?.message ?? 'Перевірте форму.', field: i?.path?.[0] !== undefined ? String(i.path[0]) : undefined }
  }
  const { website2: _honeypot, ...d } = parsed.data
  const phone = normalizePhone(d.buyerPhone)
  if (!phone) return { ok: false, status: 400, error: 'Перевірте телефон: потрібен український номер, наприклад 067 123 45 67.', field: 'buyerPhone' }

  // One line per item: the same item twice adds up.
  const merged = new Map<number, Line>()
  for (const l of d.lines) {
    const cur = merged.get(l.itemId)
    merged.set(l.itemId, cur ? { ...cur, qty: Math.min(20, cur.qty + l.qty) } : l)
  }
  const ids = [...merged.keys()]
  const rows = await db
    .select({ item: items, studio: studios, city: cities.name })
    .from(items)
    .innerJoin(studios, eq(studios.id, items.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(inArray(items.id, ids))
  const byId = new Map(rows.map((r) => [r.item.id, r]))
  for (const id of ids) {
    const r = byId.get(id)
    if (!r) return { ok: false, status: 409, error: 'Одного з виробів у кошику вже немає. Оновіть кошик.', field: 'lines' }
    if (!canOrder(r.item, r.studio)) return { ok: false, status: 409, error: `«${r.item.title}» уже недоступний для замовлення. Приберіть його з кошика.`, field: 'lines' }
    const line = merged.get(id)!
    if (r.item.stock != null && line.qty > r.item.stock) return { ok: false, status: 409, error: `«${r.item.title}»: у студії лишилось ${r.item.stock} шт.`, field: 'lines' }
  }

  // Group by studio; each group becomes an order and must accept the chosen delivery and payment.
  const groups = new Map<number, typeof rows>()
  for (const r of rows) groups.set(r.studio.id, [...(groups.get(r.studio.id) ?? []), r])
  for (const [, g] of groups) {
    const s = g[0]!.studio
    const terms = effectiveTerms(s.shopTerms, s.address)
    const allDigital = g.every((r) => r.item.fulfillment === 'digital')
    if (d.deliveryMethod === 'none' ? !allDigital : !terms.delivery.includes(d.deliveryMethod)) return { ok: false, status: 400, error: `${shopName(s)} не доставляє так: ${DELIVERY_METHOD_LABEL[d.deliveryMethod].toLowerCase()}.`, field: 'deliveryMethod' }
    if (d.paymentMethod === 'card_online' || !terms.payment.includes(d.paymentMethod)) return { ok: false, status: 400, error: `${shopName(s)} не приймає такий спосіб оплати.`, field: 'paymentMethod' }
    if (d.deliveryMethod === 'pickup' && !terms.pickupAddress) return { ok: false, status: 400, error: `${shopName(s)} не має самовивозу.`, field: 'deliveryMethod' }
  }

  const checkoutToken = token()
  const made = await db.transaction(async (tx) => {
    const out: { id: number; studio: string; studioId: number }[] = []
    for (const [studioId, g] of groups) {
      const s = g[0]!.studio
      const terms = effectiveTerms(s.shopTerms, s.address)
      const lines = g.map((r) => ({ r, line: merged.get(r.item.id)! }))
      const subtotalKop = lines.reduce((sum, { r, line }) => sum + r.item.priceMin! * 100 * line.qty, 0)
      const [o] = await tx
        .insert(orders)
        .values({
          studioId,
          checkoutToken,
          status: 'new',
          buyerName: d.buyerName,
          buyerPhone: phone,
          buyerEmail: d.buyerEmail ?? null,
          noCall: Boolean(d.noCall),
          comment: d.comment ?? null,
          deliveryMethod: d.deliveryMethod,
          deliveryCity: d.deliveryMethod === 'pickup' || d.deliveryMethod === 'none' ? null : (d.deliveryCity ?? null),
          deliveryPoint: d.deliveryMethod === 'pickup' ? terms.pickupAddress : d.deliveryMethod === 'none' ? null : (d.deliveryPoint ?? null),
          paymentMethod: d.paymentMethod,
          subtotalKop,
          offerVersion: OFFER_VERSION,
          sourcePage: d.sourcePage ?? null,
          ipHash: hashIp(ip),
        })
        .returning({ id: orders.id })
      await tx.insert(orderItems).values(
        lines.map(({ r, line }) => ({
          orderId: o!.id,
          itemId: r.item.id,
          title: r.item.title,
          itemPath: itemPath(s.slug, r.item.slug),
          unitKop: r.item.priceMin! * 100,
          qty: line.qty,
          options: line.options && (line.options.recipient || line.options.message) ? line.options : null,
        })),
      )
      // A counted stock goes down; a one-off without a count is held (stock 0) until the studio closes or cancels the order.
      for (const { r, line } of lines) {
        if (r.item.stock != null) await tx.update(items).set({ stock: sql`greatest(${items.stock} - ${line.qty}, 0)` }).where(eq(items.id, r.item.id))
        else if (r.item.kind === 'piece') await tx.update(items).set({ stock: 0 }).where(eq(items.id, r.item.id))
      }
      await audit(tx, PUBLIC, 'order', o!.id, 'create', null)
      out.push({ id: o!.id, studio: shopName(s), studioId })
    }
    return out
  })

  for (const o of made) {
    try {
      await notifyNewOrder(db, o.id)
    } catch (e) {
      console.error('order notification error', String(e).slice(0, 200)) // never lose the order
    }
  }
  return { ok: true, token: checkoutToken, orders: made.map(({ id, studio }) => ({ id, studio })) }
}

// ---------- reads

export type OrderLine = { id: number; itemId: number | null; title: string; itemPath: string | null; unitKop: number; qty: number; options: { recipient?: string; message?: string } | null; photo: string | null }
export type OrderFull = typeof orders.$inferSelect & {
  lines: OrderLine[]
  studio: { id: number; slug: string; name: string; city: string | null; phone: string | null; email: string | null; instagram: string | null; website: string | null; address: string | null; shopTerms: (typeof studios.$inferSelect)['shopTerms'] }
}

async function linesOf(ex: Exec, orderIds: number[]): Promise<Map<number, OrderLine[]>> {
  if (!orderIds.length) return new Map()
  const rows = await ex
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      itemId: orderItems.itemId,
      title: orderItems.title,
      itemPath: orderItems.itemPath,
      unitKop: orderItems.unitKop,
      qty: orderItems.qty,
      options: orderItems.options,
      // The outer column is named in full: a bare `item_id` would bind to item_photos (see src/server/db/index.ts).
      photo: sql<string | null>`(select coalesce(m.variants->'thumbnail'->>'file', m.file_name) from app.item_photos ip join app.media m on m.id = ip.media_id where ip.item_id = "app"."order_items"."item_id" and m.status = 'active' order by ip.position limit 1)`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(orderItems.id)
  const out = new Map<number, OrderLine[]>()
  for (const r of rows) {
    const { orderId, photo, ...line } = r
    out.set(orderId, [...(out.get(orderId) ?? []), { ...line, photo: photo ? `/media/${photo}` : null }])
  }
  return out
}

const studioCols = {
  id: studios.id,
  slug: studios.slug,
  name: studios.name,
  shortName: studios.shortName,
  city: cities.name,
  phone: studios.phone,
  email: studios.email,
  instagram: studios.instagram,
  website: studios.website,
  address: studios.address,
  shopTerms: studios.shopTerms,
}

async function hydrate(ex: Exec, rows: { o: typeof orders.$inferSelect; s: { id: number; slug: string; name: string; shortName: string | null; city: string | null; phone: string | null; email: string | null; instagram: string | null; website: string | null; address: string | null; shopTerms: (typeof studios.$inferSelect)['shopTerms'] } }[]): Promise<OrderFull[]> {
  const lines = await linesOf(ex, rows.map((r) => r.o.id))
  return rows.map(({ o, s }) => ({ ...o, lines: lines.get(o.id) ?? [], studio: { ...s, name: shopName({ name: s.name, shortName: s.shortName }) } }))
}

export async function getOrder(db: Db, id: number): Promise<OrderFull | null> {
  const rows = await db.select({ o: orders, s: studioCols }).from(orders).innerJoin(studios, eq(studios.id, orders.studioId)).leftJoin(cities, eq(cities.id, studios.cityId)).where(eq(orders.id, id)).limit(1)
  return (await hydrate(db, rows))[0] ?? null
}

/** The buyer's page: every order of one checkout. */
export async function getCheckout(db: Db, checkoutToken: string): Promise<OrderFull[]> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(checkoutToken)) return []
  const rows = await db.select({ o: orders, s: studioCols }).from(orders).innerJoin(studios, eq(studios.id, orders.studioId)).leftJoin(cities, eq(cities.id, studios.cityId)).where(eq(orders.checkoutToken, checkoutToken)).orderBy(orders.id)
  return hydrate(db, rows)
}

export type OrderFilters = { status?: OrderStatus | 'open'; studioId?: number; q?: string; before?: number }
export const OPEN_STATUSES: OrderStatus[] = ['new', 'confirmed', 'in_progress', 'shipped']

/** Orders for a list, newest first, `PAGE` at a time (`before` = the last id of the previous page). */
export async function listOrders(db: Db, f: OrderFilters = {}) {
  const where = and(
    f.status === 'open' ? inArray(orders.status, OPEN_STATUSES) : f.status ? eq(orders.status, f.status) : undefined,
    f.studioId ? eq(orders.studioId, f.studioId) : undefined,
    f.q ? or(sql`${orders.buyerName} ilike ${'%' + f.q + '%'}`, sql`${orders.buyerPhone} ilike ${'%' + f.q.replace(/\D/g, '') + '%'}`, sql`${orders.id}::text = ${f.q.replace(/^#/, '')}`) : undefined,
    f.before ? lt(orders.id, f.before) : undefined,
  )
  const rows = await db
    .select({ o: orders, s: studioCols })
    .from(orders)
    .innerJoin(studios, eq(studios.id, orders.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(where)
    .orderBy(desc(orders.id))
    .limit(PAGE + 1)
  const page = await hydrate(db, rows.slice(0, PAGE))
  return { rows: page, hasMore: rows.length > PAGE, next: rows.length > PAGE ? page[page.length - 1]!.id : null }
}

/** Open orders per studio (the cabinet's overview line). */
export async function openOrderCounts(db: Db, studioIds: number[]): Promise<Map<number, number>> {
  if (!studioIds.length) return new Map()
  const rows = await db
    .select({ studioId: orders.studioId, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(inArray(orders.studioId, studioIds), inArray(orders.status, OPEN_STATUSES)))
    .groupBy(orders.studioId)
  return new Map(rows.map((r) => [r.studioId, r.n]))
}

// ---------- writes

/**
 * Moves an order to a status. A studio (`by: 'studio'`) may only follow `nextStatuses`; staff may set any. Cancelling
 * stores the reason (shown to the buyer). Idempotent: the same status again changes nothing.
 */
export async function setOrderStatus(db: Db, id: number, status: OrderStatus, actor: Actor, opts: { by: 'staff' | 'studio'; reason?: string | null } = { by: 'staff' }) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(orders).where(eq(orders.id, id)).for('update')
    if (!cur) throw new NotFound('Замовлення не знайдено.')
    if (cur.status === status) return { id, status, already: true as const }
    if (opts.by === 'studio' && !nextStatuses(cur.status).includes(status)) throw new OrderError(409, `З «${ORDER_STATUS_LABEL[cur.status]}» не можна перейти до «${ORDER_STATUS_LABEL[status]}».`)
    const patch: Partial<typeof orders.$inferInsert> = { status, updatedAt: sql`now()` as unknown as string, updatedBy: actor.id ?? actor.source }
    if (status === 'cancelled') patch.cancelReason = opts.reason?.trim().slice(0, 500) || null
    if (status !== 'cancelled' && cur.cancelReason) patch.cancelReason = null
    await tx.update(orders).set(patch).where(eq(orders.id, id))
    // The held stock comes back on a cancellation and is taken again when a cancelled order is reopened.
    if (status === 'cancelled' || cur.status === 'cancelled') {
      const sign = status === 'cancelled' ? 1 : -1
      for (const l of await tx.select({ itemId: orderItems.itemId, qty: orderItems.qty }).from(orderItems).where(eq(orderItems.orderId, id))) {
        if (l.itemId == null) continue
        await tx.update(items).set({ stock: sql`greatest(${items.stock} + ${sign * l.qty}, 0)` }).where(and(eq(items.id, l.itemId), sql`${items.stock} is not null`))
      }
    }
    await audit(tx, actor, 'order', id, 'status', { status: { from: cur.status, to: status }, ...(patch.cancelReason ? { cancelReason: { from: cur.cancelReason, to: patch.cancelReason } } : {}) })
    return { id, status, already: false as const, from: cur.status }
  })
}

export type OrderPatch = { tracking?: string | null; studioNote?: string | null; paymentStatus?: PaymentStatus; deliveryKop?: number | null }

/** Tracking number, the studio's note, payment state, the delivery cost the studio told the buyer. */
export async function updateOrder(db: Db, id: number, patch: OrderPatch, actor: Actor) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(orders).where(eq(orders.id, id)).for('update')
    if (!cur) throw new NotFound('Замовлення не знайдено.')
    const next = {
      tracking: patch.tracking === undefined ? cur.tracking : patch.tracking?.trim().slice(0, 60) || null,
      studioNote: patch.studioNote === undefined ? cur.studioNote : patch.studioNote?.trim().slice(0, 2000) || null,
      paymentStatus: patch.paymentStatus ?? cur.paymentStatus,
      deliveryKop: patch.deliveryKop === undefined ? cur.deliveryKop : patch.deliveryKop,
      paidAt: patch.paymentStatus === 'paid' && cur.paymentStatus !== 'paid' ? (new Date().toISOString() as string) : patch.paymentStatus && patch.paymentStatus !== 'paid' ? null : cur.paidAt,
    }
    const changes = diff(cur as Record<string, unknown>, next, ['tracking', 'studioNote', 'paymentStatus', 'deliveryKop', 'paidAt'])
    if (!Object.keys(changes).length) return { id, changed: false as const }
    await tx.update(orders).set({ ...next, updatedAt: sql`now()` as unknown as string, updatedBy: actor.id ?? actor.source }).where(eq(orders.id, id))
    await audit(tx, actor, 'order', id, 'update', changes)
    return { id, changed: true as const }
  })
}

// ---------- Telegram

export const panelOrderUrl = (id: number) => `${site.url}/panel/zamovlennia/${id}`
export const kabinetOrderUrl = (slug: string, id: number) => `${site.url}/kabinet/studiya/${slug}/zamovlennia/${id}`

/** Buttons under a new order in the studio owner's chat. */
export const ownerOrderKeyboard = (o: { id: number; studio: { slug: string } }): TgKeyboard => [
  [
    { text: '✅ Підтвердити', callback_data: `o:c:${o.id}` },
    { text: '🔗 У кабінеті', url: kabinetOrderUrl(o.studio.slug, o.id) },
  ],
]
/** Buttons under the copy in the owner's group. */
export const staffOrderKeyboard = (id: number): TgKeyboard => [[{ text: '🔗 В панелі', url: panelOrderUrl(id) }]]

const deliveryLine = (o: OrderFull) =>
  o.deliveryMethod === 'pickup' ? `самовивіз${o.deliveryPoint ? `: ${o.deliveryPoint}` : ''}` : o.deliveryMethod === 'none' ? 'без доставки' : `${DELIVERY_METHOD_LABEL[o.deliveryMethod]}${o.deliveryCity ? `, ${o.deliveryCity}` : ''}${o.deliveryPoint ? `, ${o.deliveryPoint}` : ''}`

/** The Telegram text of an order; `forStudio` leaves out what the studio does not need (our panel link lives in the keyboard). */
export function orderMessage(o: OrderFull, forStudio: boolean) {
  const head = forStudio ? `Нове замовлення №${o.id} у крамниці «Глина»` : `Замовлення №${o.id} · ${o.studio.name}`
  return [
    head,
    ...o.lines.map((l) => `• ${l.title} × ${l.qty} — ${uah(l.unitKop * l.qty)}${l.options?.recipient ? ` (для: ${l.options.recipient})` : ''}`),
    `Разом за вироби: ${uah(o.subtotalKop)}`,
    `Покупець: ${o.buyerName}, ${o.buyerPhone}${o.buyerEmail ? `, ${o.buyerEmail}` : ''}${o.noCall ? ' — просить не телефонувати, а написати' : ''}`,
    `Доставка: ${deliveryLine(o)}`,
    `Оплата: ${PAYMENT_METHOD_LABEL[o.paymentMethod]}`,
    ...(o.comment ? [`Коментар: ${o.comment}`] : []),
    ...(forStudio ? ['Підтвердіть замовлення й домовтеся з покупцем про оплату. Покупець бачить стан на сторінці замовлення.'] : []),
  ].join('\n')
}

async function notifyNewOrder(db: Db, id: number) {
  const o = await getOrder(db, id)
  if (!o || !process.env.TELEGRAM_BOT_TOKEN) return
  if (process.env.TELEGRAM_CHAT_ID) await tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: orderMessage(o, false).slice(0, 4000), disable_web_page_preview: true, reply_markup: { inline_keyboard: staffOrderKeyboard(o.id) } })
  for (const c of await studioOwnerChats(db, o.studioId)) await tg('sendMessage', { chat_id: c.chatId, text: orderMessage(o, true).slice(0, 4000), disable_web_page_preview: true, reply_markup: { inline_keyboard: ownerOrderKeyboard(o) } })
}

/** The owner's group hears when a studio closes or cancels an order (the 10 % and the buyer depend on it). */
export async function notifyStatusToStaff(o: Pick<OrderFull, 'id' | 'status' | 'subtotalKop' | 'cancelReason'> & { studio: { name: string } }) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return
  const line = o.status === 'done' ? `виконано, сума ${uah(o.subtotalKop)}, наша частка ${uah(Math.round(o.subtotalKop / 10))}` : o.status === 'cancelled' ? `скасовано${o.cancelReason ? `: ${o.cancelReason}` : ''}` : ORDER_STATUS_LABEL[o.status].toLowerCase()
  await tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: `Замовлення №${o.id} · ${o.studio.name}: ${line}.`, disable_web_page_preview: true, reply_markup: { inline_keyboard: staffOrderKeyboard(o.id) } })
}
