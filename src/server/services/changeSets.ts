import { asc, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { user } from '../db/schema/auth'
import { cities, media, studioPhotos, studioPrices, studios } from '../db/schema/catalog'
import { changeSets } from '../db/schema/history'
import { revalidateStudios } from '../revalidate'
import { audit, same, type Actor } from './audit'
import { NotFound } from './requests'
import { recordRevision } from './studios'

// Owner changes waiting for review (they replace Payload drafts). Each change set holds only the fields the owner
// may edit; we accept them field by field. Owner free text (about, news, quote) is stored internally and never
// rendered as is: we rewrite it in the site voice. Panel and Telegram share this code.

type Row = typeof studios.$inferSelect
type B2b = { minOrder: string | null; leadTime: string | null; logoMethods: string[]; foodSafe: boolean; dishwasherSafe: boolean; worksWithHoreca: boolean; worksWithCorporate: boolean }
type Price = { text: string; source: string | null; dateText: string | null }

export type FieldKey =
  | 'ownerAbout' | 'ownerNews' | 'ownerQuote' | 'services' | 'products' | 'prices' | 'address' | 'website' | 'instagram'
  | 'phone' | 'email' | 'facebook' | 'b2b' | 'photos' | 'instagramPosts' | 'consentPhotos'

/** Owner text: kept internal, the editor rewrites it into the public description. */
export const OWNER_TEXT: FieldKey[] = ['ownerAbout', 'ownerNews', 'ownerQuote']
export const FIELD_ORDER: FieldKey[] = [
  'prices', 'services', 'products', 'b2b', 'address', 'phone', 'email', 'website', 'instagram', 'facebook', 'photos', 'instagramPosts', 'consentPhotos',
  'ownerAbout', 'ownerNews', 'ownerQuote',
]

const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : (x as { text?: string; url?: string })?.text ?? (x as { url?: string })?.url ?? '')).map((s) => s.trim()).filter(Boolean) : []
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const bool = (v: unknown) => v === true

function normPrices(v: unknown): Price[] {
  if (!Array.isArray(v)) return []
  return v
    .map((p) => p as { text?: string; source?: string | null; date?: string | null; dateText?: string | null })
    .filter((p) => p?.text?.trim())
    .map((p) => ({ text: p.text!.trim(), source: str(p.source), dateText: str(p.dateText ?? p.date) }))
}
function normB2b(v: unknown): B2b {
  const b = (v ?? {}) as Record<string, unknown>
  return {
    minOrder: str(b.minOrder),
    leadTime: str(b.leadTime),
    logoMethods: strs(b.logoMethods),
    foodSafe: bool(b.foodSafe),
    dishwasherSafe: bool(b.dishwasherSafe),
    worksWithHoreca: bool(b.worksWithHoreca),
    worksWithCorporate: bool(b.worksWithCorporate),
  }
}

/** Accepts both today's kabinet shape and the keys of change sets migrated in 2026-10 (nested `consent.photos` etc.). */
export function normalizeProposed(p: Record<string, unknown>): Partial<Record<FieldKey, unknown>> {
  const out: Partial<Record<FieldKey, unknown>> = {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(p, k)
  for (const k of ['ownerAbout', 'ownerNews', 'ownerQuote', 'address', 'website', 'instagram', 'phone', 'email', 'facebook'] as const) if (has(k)) out[k] = str(p[k])
  for (const k of ['services', 'products'] as const) if (has(k)) out[k] = strs(p[k])
  if (has('prices')) out.prices = normPrices(p.prices)
  if (has('b2b')) out.b2b = normB2b(p.b2b)
  if (has('photos')) out.photos = Array.isArray(p.photos) ? (p.photos as unknown[]).map(Number).filter(Number.isInteger) : []
  if (has('instagramPosts') || has('activity.instagramPosts')) out.instagramPosts = strs(p.instagramPosts ?? p['activity.instagramPosts']).slice(0, 3)
  if (has('consentPhotos') || has('consent.photos')) out.consentPhotos = bool(p.consentPhotos ?? p['consent.photos'])
  return out
}

function currentValue(key: FieldKey, row: Row, prices: Price[], photos: number[]): unknown {
  switch (key) {
    case 'prices': return prices
    case 'photos': return photos
    case 'b2b':
      return normB2b({ minOrder: row.b2bMinOrder, leadTime: row.b2bLeadTime, logoMethods: row.b2bLogoMethods, foodSafe: row.b2bFoodSafe, dishwasherSafe: row.b2bDishwasherSafe, worksWithHoreca: row.b2bWorksWithHoreca, worksWithCorporate: row.b2bWorksWithCorporate })
    case 'instagramPosts': return row.instagramPosts
    case 'consentPhotos': return bool(row.consentPhotos)
    case 'services': return row.services
    case 'products': return row.products
    default: return (row as Record<string, unknown>)[key] ?? null
  }
}

async function load(ex: Db | Parameters<Parameters<Db['transaction']>[0]>[0], studioId: number) {
  const [row] = await ex.select().from(studios).where(eq(studios.id, studioId)).limit(1)
  const prices = await ex.select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText }).from(studioPrices).where(eq(studioPrices.studioId, studioId)).orderBy(asc(studioPrices.position))
  const photos = (await ex.select({ m: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, studioId)).orderBy(asc(studioPhotos.position))).map((p) => p.m)
  return { row, prices, photos }
}

export async function listChangeSets(db: Db, status: 'pending' | 'done' = 'pending') {
  const rows = await db
    .select({
      id: changeSets.id,
      status: changeSets.status,
      createdAt: changeSets.createdAt,
      decidedAt: changeSets.decidedAt,
      studioId: studios.id,
      studio: studios.name,
      slug: studios.slug,
      city: cities.name,
      author: user.name,
      fields: sql<number>`(select count(*)::int from jsonb_object_keys(${changeSets.proposed}))`,
    })
    .from(changeSets)
    .innerJoin(studios, eq(studios.id, changeSets.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .leftJoin(user, eq(user.id, changeSets.authorId))
    .where(status === 'pending' ? eq(changeSets.status, 'pending') : sql`${changeSets.status} <> 'pending'`)
    .orderBy(status === 'pending' ? asc(changeSets.createdAt) : desc(changeSets.decidedAt))
    .limit(200)
  if (status !== 'pending') return rows
  // «полів: N» counts what really differs from the live profile, not every key the owner's form sent.
  return Promise.all(rows.map(async (r) => ({ ...r, fields: (await getChangeSet(db, r.id))?.fields.filter((f) => f.changed).length ?? r.fields })))
}

export async function getChangeSet(db: Db, id: number) {
  const [cs] = await db.select().from(changeSets).where(eq(changeSets.id, id)).limit(1)
  if (!cs) return null
  const { row, prices, photos } = await load(db, cs.studioId)
  if (!row) return null
  const proposed = normalizeProposed(cs.proposed as Record<string, unknown>)
  const fields = FIELD_ORDER.filter((k) => k in proposed).map((key) => {
    const from = currentValue(key, row, prices, photos)
    const to = proposed[key]
    return { key, from, to, changed: !same(from, to), ownerText: OWNER_TEXT.includes(key), applied: cs.appliedFields.includes(key) }
  })
  const mediaIds = [...new Set(fields.filter((f) => f.key === 'photos').flatMap((f) => [...(f.from as number[]), ...(f.to as number[])]))]
  const mediaRows = mediaIds.length
    ? await db.select({ id: media.id, fileName: media.fileName, alt: media.alt, status: media.status, variants: media.variants }).from(media).where(inArray(media.id, mediaIds))
    : []
  const [author] = cs.authorId ? await db.select({ name: user.name }).from(user).where(eq(user.id, cs.authorId)).limit(1) : []
  return {
    ...cs,
    author: author?.name ?? null,
    studio: { id: row.id, name: row.name, slug: row.slug, revision: row.revision, publicDescription: row.publicDescription, recentNote: row.recentNote },
    stale: cs.baseRevision != null && row.revision !== cs.baseRevision,
    fields,
    media: mediaRows,
  }
}

/**
 * Applies the accepted fields and closes the change set (accepted ones applied, the rest dropped). Idempotent:
 * a closed change set is left as it is. Optionally saves our rewrite of the public description in the same step.
 */
async function applyChangeSetTx(
  db: Db,
  id: number,
  accept: FieldKey[] | 'all' | 'all-but-text',
  actor: Actor,
  opts: { note?: string; publicDescription?: string | null; recentNote?: string | null; approveQuote?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const [cs] = await tx.select().from(changeSets).where(eq(changeSets.id, id)).for('update').limit(1)
    if (!cs) throw new NotFound(`Зміни #${id} не знайдено`)
    if (cs.status !== 'pending') return { status: cs.status, applied: cs.appliedFields, already: true }
    await tx.select({ id: studios.id }).from(studios).where(eq(studios.id, cs.studioId)).for('update')
    const proposed = normalizeProposed(cs.proposed as Record<string, unknown>)
    const offered = FIELD_ORDER.filter((k) => k in proposed)
    const keys = accept === 'all' ? offered : accept === 'all-but-text' ? offered.filter((k) => !OWNER_TEXT.includes(k)) : offered.filter((k) => accept.includes(k))

    const { row, prices, photos } = await load(tx, cs.studioId)
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const set: Partial<typeof studios.$inferInsert> = {}
    for (const k of keys) {
      const to = proposed[k]
      const from = currentValue(k, row!, prices, photos)
      if (same(from, to)) continue
      changes[k] = { from, to }
      if (k === 'b2b') {
        const b = to as B2b
        Object.assign(set, { b2bMinOrder: b.minOrder, b2bLeadTime: b.leadTime, b2bLogoMethods: b.logoMethods, b2bFoodSafe: b.foodSafe, b2bDishwasherSafe: b.dishwasherSafe, b2bWorksWithHoreca: b.worksWithHoreca, b2bWorksWithCorporate: b.worksWithCorporate })
      } else if (k === 'prices') {
        await tx.delete(studioPrices).where(eq(studioPrices.studioId, cs.studioId))
        const ps = to as Price[]
        if (ps.length) await tx.insert(studioPrices).values(ps.map((p, position) => ({ studioId: cs.studioId, position, ...p })))
      } else if (k === 'photos') {
        const ids = to as number[]
        await tx.delete(studioPhotos).where(eq(studioPhotos.studioId, cs.studioId))
        if (ids.length) {
          await tx.insert(studioPhotos).values(ids.map((mediaId, position) => ({ studioId: cs.studioId, mediaId, position })))
          await tx.update(media).set({ status: 'active' }).where(inArray(media.id, ids))
        }
      } else if (k === 'ownerQuote') {
        Object.assign(set, { ownerQuote: to as string | null, ownerQuoteApproved: false })
      } else {
        Object.assign(set, { [k]: to })
      }
    }
    if (opts.approveQuote) set.ownerQuoteApproved = true
    if (opts.publicDescription !== undefined && !same(row!.publicDescription, opts.publicDescription)) {
      changes.publicDescription = { from: row!.publicDescription, to: opts.publicDescription }
      set.publicDescription = opts.publicDescription || null
    }
    if (opts.recentNote !== undefined && !same(row!.recentNote, opts.recentNote)) {
      changes.recentNote = { from: row!.recentNote, to: opts.recentNote }
      set.recentNote = opts.recentNote || null
    }
    if (Object.keys(set).length) await tx.update(studios).set(set).where(eq(studios.id, cs.studioId))
    if (Object.keys(changes).length || opts.approveQuote) await recordRevision(tx, cs.studioId, actor, `зміни власника #${id}`)
    const status = keys.length === offered.length ? 'applied' : keys.length ? 'partially_applied' : 'rejected'
    await tx
      .update(changeSets)
      .set({ status, appliedFields: keys, decidedBy: actor.id, decidedAt: sql`now()`, decisionNote: opts.note?.trim() || null, updatedAt: sql`now()` })
      .where(eq(changeSets.id, id))
    await audit(tx, actor, 'studio', cs.studioId, 'owner-changes', changes)
    await audit(tx, actor, 'change_set', id, status, { fields: { from: offered, to: keys } })
    return { status, applied: keys, already: false, studioId: cs.studioId, slug: row!.slug }
  })
}

/** Applies the accepted fields of an owner's change set and refreshes the studio's public pages. */
export async function applyChangeSet(...args: Parameters<typeof applyChangeSetTx>) {
  const res = await applyChangeSetTx(...args)
  if (!res.already && 'studioId' in res && res.studioId && res.status !== 'rejected') await revalidateStudios(args[0], [res.studioId])
  return res
}

export async function rejectChangeSet(db: Db, id: number, note: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [cs] = await tx.select({ status: changeSets.status }).from(changeSets).where(eq(changeSets.id, id)).for('update').limit(1)
    if (!cs) throw new NotFound(`Зміни #${id} не знайдено`)
    if (cs.status !== 'pending') return { status: cs.status, already: true }
    await tx.update(changeSets).set({ status: 'rejected', decidedBy: actor.id, decidedAt: sql`now()`, decisionNote: note.trim() || null, updatedAt: sql`now()` }).where(eq(changeSets.id, id))
    await audit(tx, actor, 'change_set', id, 'rejected', note.trim() ? { note: { from: null, to: note.trim() } } : null)
    return { status: 'rejected' as const, already: false }
  })
}

/** The open change set of a studio, if any (Telegram buttons address studios, not change sets). */
export async function pendingChangeSetOf(db: Db, studioId: number) {
  const [cs] = await db.select({ id: changeSets.id }).from(changeSets).where(sql`${changeSets.studioId} = ${studioId} and ${changeSets.status} = 'pending'`).limit(1)
  return cs?.id ?? null
}
