import { and, desc, eq, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'

import { REQUEST_STATUS, REQUEST_WHAT, type RequestStatus, type RequestWhat } from '../../shared/options'
import type { Db } from '../db'
import { studios } from '../db/schema/catalog'
import { requests, requestStudios } from '../db/schema/requests'
import { audit, diff, type Actor } from './audit'

// Customer requests: the list, one request, its status, notes, deal amount and the studios it went to.
// The panel and the Telegram buttons both call these, so a tap and a click do exactly the same thing.

export const PAGE = 50

export type RequestFilters = { status?: RequestStatus | 'open'; what?: RequestWhat; q?: string; before?: number }
const OPEN: RequestStatus[] = ['new', 'in_progress', 'forwarded', 'replied']

export async function listRequests(db: Db, f: RequestFilters = {}) {
  const where: SQL[] = []
  if (f.status === 'open') where.push(inArray(requests.status, OPEN))
  else if (f.status && (REQUEST_STATUS as readonly string[]).includes(f.status)) where.push(eq(requests.status, f.status))
  if (f.what && (REQUEST_WHAT as readonly string[]).includes(f.what)) where.push(eq(requests.what, f.what))
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, '\\$&')}%`
    where.push(
      or(
        ilike(requests.contactName, like),
        ilike(requests.contactPhoneOrTelegram, like),
        ilike(requests.contactEmail, like),
        ilike(requests.details, like),
        ilike(requests.city, like),
        ilike(requests.studioName, like),
      )!,
    )
  }
  if (f.before) where.push(lt(requests.id, f.before))
  const rows = await db
    .select({
      id: requests.id,
      what: requests.what,
      status: requests.status,
      city: requests.city,
      quantity: requests.quantity,
      deadline: requests.deadline,
      contactName: requests.contactName,
      details: requests.details,
      studioName: requests.studioName,
      createdAt: requests.createdAt,
      dealAmountKop: requests.dealAmountKop,
      sentTo: sql<number>`(select count(*)::int from ${requestStudios} rs where rs.request_id = "app"."requests"."id")`,
    })
    .from(requests)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(requests.id))
    .limit(PAGE + 1)
  return { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE, next: rows.length > PAGE ? rows[PAGE - 1]!.id : null }
}

export async function getRequest(db: Db, id: number) {
  const [r] = await db.select().from(requests).where(eq(requests.id, id)).limit(1)
  if (!r) return null
  const sent = await db
    .select({ id: studios.id, name: studios.name, slug: studios.slug, sentAt: requestStudios.sentAt })
    .from(requestStudios)
    .innerJoin(studios, eq(studios.id, requestStudios.studioId))
    .where(eq(requestStudios.requestId, id))
    .orderBy(requestStudios.position)
  return { ...r, sent }
}

export class NotFound extends Error {}

/** Idempotent: setting the status a request already has changes nothing and writes no audit row. */
export async function setRequestStatus(db: Db, id: number, status: RequestStatus, actor: Actor, note?: string) {
  return db.transaction(async (tx) => {
    const [r] = await tx.select({ status: requests.status, notes: requests.notes }).from(requests).where(eq(requests.id, id)).for('update').limit(1)
    if (!r) throw new NotFound(`Запит #${id} не знайдено`)
    if (r.status === status && !note) return { changed: false, status }
    const notes = note ? [r.notes, `${new Date().toISOString().slice(0, 10)}: ${note}`].filter(Boolean).join('\n') : r.notes
    await tx.update(requests).set({ status, notes, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(requests.id, id))
    await audit(tx, actor, 'request', id, 'status', { status: { from: r.status, to: status }, ...(note ? { note: { from: null, to: note } } : {}) })
    return { changed: true, status }
  })
}

/** Notes and the deal amount (UAH, whole hryvnias in the form → kopecks in the database; commission is computed by Postgres). */
export async function updateRequest(db: Db, id: number, patch: { notes?: string | null; dealAmountUah?: number | null }, actor: Actor) {
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(requests).where(eq(requests.id, id)).for('update').limit(1)
    if (!r) throw new NotFound(`Запит #${id} не знайдено`)
    const next = {
      notes: patch.notes === undefined ? r.notes : patch.notes || null,
      dealAmountKop: patch.dealAmountUah === undefined ? r.dealAmountKop : patch.dealAmountUah == null ? null : Math.round(patch.dealAmountUah * 100),
    }
    const changes = diff(r, next, ['notes', 'dealAmountKop'])
    if (!Object.keys(changes).length) return { changed: false }
    await tx.update(requests).set({ ...next, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(requests.id, id))
    await audit(tx, actor, 'request', id, 'update', changes)
    return { changed: true }
  })
}

/** The studios a request was forwarded to (replaces the list; new ones get sent_at now). */
export async function setRequestStudios(db: Db, id: number, studioIds: number[], actor: Actor) {
  const ids = [...new Set(studioIds)].slice(0, 20)
  return db.transaction(async (tx) => {
    const [r] = await tx.select({ id: requests.id, status: requests.status }).from(requests).where(eq(requests.id, id)).for('update').limit(1)
    if (!r) throw new NotFound(`Запит #${id} не знайдено`)
    const before = await tx.select({ studioId: requestStudios.studioId, sentAt: requestStudios.sentAt }).from(requestStudios).where(eq(requestStudios.requestId, id))
    const had = new Map(before.map((b) => [b.studioId, b.sentAt]))
    await tx.delete(requestStudios).where(eq(requestStudios.requestId, id))
    if (ids.length)
      await tx.insert(requestStudios).values(ids.map((studioId, position) => ({ requestId: id, studioId, position, sentAt: had.get(studioId) ?? new Date().toISOString() })))
    const from = before.map((b) => b.studioId).sort((a, b) => a - b)
    const to = [...ids].sort((a, b) => a - b)
    if (JSON.stringify(from) !== JSON.stringify(to)) await audit(tx, actor, 'request', id, 'studios', { studios: { from, to } })
    // Same meaning as the Telegram «Передано студіям» button: choosing studios for a fresh request forwards it.
    let status = r.status
    if (ids.length && (r.status === 'new' || r.status === 'in_progress')) {
      await tx.update(requests).set({ status: 'forwarded', updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(requests.id, id))
      await audit(tx, actor, 'request', id, 'status', { status: { from: r.status, to: 'forwarded' } })
      status = 'forwarded'
    }
    return { count: ids.length, status }
  })
}
