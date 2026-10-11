import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm'

import type { StudioFormat, StudioType } from '../../shared/options'
import type { StudioEdit } from '../../shared/schemas'
import type { Db } from '../db'
import { cities, media, studioPhotos, studioPrices, studios, studioSlugHistory } from '../db/schema/catalog'
import { studioRevisions } from '../db/schema/history'
import { user } from '../db/schema/auth'
import { revalidateCatalog, studioPaths } from '../revalidate'
import { audit, diff, same, type Actor, type Changes } from './audit'
import { NotFound } from './requests'
import { recordRevision, snapshotStudio, type StudioSnapshot } from './studios'

// The panel's studio editor: list with filters, full edit with a version check, revisions with diff and restore.
// Every save is one transaction: version check → row, prices, photos, slug history → revision + audit; the public
// pages are refreshed after commit.

export class Conflict extends Error {
  constructor(
    public current: number,
    public changes: Changes,
    public by: string | null,
  ) {
    super('Студію вже змінили після того, як ви її відкрили.')
  }
}

export class Invalid extends Error {}

// ---------------------------------------------------------------- list

export type StudioListFilters = {
  q?: string
  cityId?: number
  type?: StudioType
  status?: string
  visibility?: 'public' | 'hidden'
  format?: StudioFormat
  verified?: boolean
  hasPrices?: boolean
  hasAddress?: boolean
  /** keyset: name of the last row shown + its id */
  after?: { name: string; id: number }
  limit?: number
}

const hasPricesSql = sql`exists (select 1 from ${studioPrices} p where p.studio_id = "app"."studios"."id")`
const hasAddressSql = sql`(${studios.geoPrecision} in ('address', 'street'))`

export async function listStudios(db: Db, f: StudioListFilters) {
  const limit = Math.min(f.limit ?? 50, 100)
  const where: (SQL | undefined)[] = []
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, '\\$&')}%`
    where.push(
      or(
        ilike(studios.name, like),
        ilike(studios.slug, like),
        ilike(studios.instagram, like),
        sql`exists (select 1 from unnest(${studios.alternateNames}) a where a ilike ${like})`,
      ),
    )
  }
  if (f.cityId) where.push(eq(studios.cityId, f.cityId))
  if (f.type) where.push(eq(studios.type, f.type))
  if (f.status === 'none') where.push(isNull(studios.status))
  else if (f.status) where.push(eq(studios.status, f.status as never))
  if (f.visibility) where.push(eq(studios.visibility, f.visibility))
  if (f.format) where.push(sql`${f.format} = any(${studios.formats})`)
  if (f.verified !== undefined) where.push(f.verified ? eq(studios.ownerVerified, true) : sql`coalesce(${studios.ownerVerified}, false) = false`)
  if (f.hasPrices !== undefined) where.push(f.hasPrices ? hasPricesSql : sql`not ${hasPricesSql}`)
  if (f.hasAddress !== undefined) where.push(f.hasAddress ? hasAddressSql : sql`not coalesce(${hasAddressSql}, false)`)
  // Keyset paging in the same Ukrainian collation as the ORDER BY below.
  if (f.after)
    where.push(
      or(
        sql`${studios.name} collate "uk-UA-x-icu" > ${f.after.name} collate "uk-UA-x-icu"`,
        and(sql`${studios.name} collate "uk-UA-x-icu" = ${f.after.name} collate "uk-UA-x-icu"`, gt(studios.id, f.after.id)),
      ),
    )

  const rows = await db
    .select({
      id: studios.id,
      name: studios.name,
      slug: studios.slug,
      type: studios.type,
      status: studios.status,
      visibility: studios.visibility,
      city: cities.name,
      formats: studios.formats,
      ownerVerified: studios.ownerVerified,
      hasPrices: sql<boolean>`${hasPricesSql}`,
      geoPrecision: studios.geoPrecision,
      updatedAt: studios.updatedAt,
    })
    .from(studios)
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(and(...where))
    .orderBy(sql`${studios.name} collate "uk-UA-x-icu"`, asc(studios.id))
    .limit(limit + 1)
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  return { rows: page, hasMore, next: hasMore && last ? { name: last.name, id: last.id } : null }
}

export async function cityOptions(db: Db) {
  return db
    .select({ id: cities.id, name: cities.name, count: sql<number>`(select count(*)::int from ${studios} s where s.city_id = "app"."cities"."id")` })
    .from(cities)
    .orderBy(sql`${cities.name} collate "uk-UA-x-icu"`)
}

// ---------------------------------------------------------------- read for the editor

export type EditorPhoto = { id: number; fileName: string; alt: string | null; width: number | null; height: number | null; thumb: string | null; status: string }

export async function getStudioForEdit(db: Db, id: number) {
  const snap = await snapshotStudio(db, id)
  if (!snap) return null
  const photos = snap.photos.length
    ? await db.select().from(media).where(inArray(media.id, snap.photos))
    : []
  const byId = new Map(photos.map((m) => [m.id, m]))
  const city = snap.row.cityId ? (await db.select().from(cities).where(eq(cities.id, snap.row.cityId)).limit(1))[0] ?? null : null
  return {
    row: snap.row,
    prices: snap.prices,
    city,
    photos: snap.photos
      .map((mid) => byId.get(mid))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ id: m.id, fileName: m.fileName, alt: m.alt, width: m.width, height: m.height, thumb: m.variants?.thumbnail?.file ?? null, status: m.status })),
  }
}

/** The editor's form state: exactly the fields of the shared `studioEdit` schema. */
export function toEditForm(s: NonNullable<Awaited<ReturnType<typeof getStudioForEdit>>>): StudioEdit {
  const r = s.row
  return {
    name: r.name,
    slug: r.slug,
    type: r.type,
    status: r.status,
    visibility: r.visibility,
    confidence: r.confidence,
    cityId: r.cityId,
    oblast: r.oblast,
    address: r.address,
    geoLat: r.geoLat,
    geoLng: r.geoLng,
    geoPrecision: r.geoPrecision,
    summary: r.summary,
    publicDescription: r.publicDescription,
    recentNote: r.recentNote,
    descriptionInternal: r.descriptionInternal,
    ownerQuoteApproved: r.ownerQuoteApproved,
    instagram: r.instagram,
    website: r.website,
    facebook: r.facebook,
    phone: r.phone,
    email: r.email,
    b2bMinOrder: r.b2bMinOrder,
    b2bLeadTime: r.b2bLeadTime,
    b2bFoodSafe: r.b2bFoodSafe,
    b2bDishwasherSafe: r.b2bDishwasherSafe,
    b2bWorksWithHoreca: r.b2bWorksWithHoreca,
    b2bWorksWithCorporate: r.b2bWorksWithCorporate,
    consentPhotos: r.consentPhotos,
    consentRequests: r.consentRequests,
    consentNotes: r.consentNotes,
    alternateNames: r.alternateNames,
    formats: r.formats as StudioEdit['formats'],
    services: r.services,
    products: r.products,
    salesChannels: r.salesChannels,
    otherLinks: r.otherLinks,
    sources: r.sources,
    instagramPosts: r.instagramPosts,
    b2bLogoMethods: r.b2bLogoMethods,
    prices: s.prices.map((p) => ({ text: p.text, source: p.source, dateText: p.dateText })),
    photoIds: s.photos.map((p) => p.id),
    expectedRevision: r.revision,
  }
}

// ---------------------------------------------------------------- save

const ROW_FIELDS = [
  'name', 'slug', 'type', 'status', 'visibility', 'confidence', 'cityId', 'oblast', 'address', 'geoLat', 'geoLng', 'geoPrecision',
  'summary', 'publicDescription', 'recentNote', 'descriptionInternal', 'ownerQuoteApproved', 'instagram', 'website', 'facebook',
  'phone', 'email', 'b2bMinOrder', 'b2bLeadTime', 'b2bFoodSafe', 'b2bDishwasherSafe', 'b2bWorksWithHoreca', 'b2bWorksWithCorporate',
  'consentPhotos', 'consentRequests', 'consentNotes', 'alternateNames', 'formats', 'services', 'products', 'salesChannels',
  'otherLinks', 'sources', 'instagramPosts', 'b2bLogoMethods',
] as const satisfies readonly (keyof StudioEdit)[]

type RowField = (typeof ROW_FIELDS)[number]

/**
 * Revisions come in two shapes: ours ({row, prices, photos}) and the Payload document shape the migration copied
 * from Payload versions (source 'payload-version'). Both read as ours.
 */
export function normalizeSnapshot(raw: unknown): StudioSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a free-form legacy document, read defensively
  const v = raw as Record<string, any>
  if (v && typeof v === 'object' && 'row' in v) return v as StudioSnapshot
  const texts = (xs: unknown) => (Array.isArray(xs) ? xs.map((x) => (typeof x === 'string' ? x : x?.text ?? x?.url)).filter(Boolean) : [])
  const row = {
    name: v.name ?? null,
    slug: v.slug ?? null,
    type: v.type ?? null,
    status: v.status ?? null,
    visibility: v._status === 'published' ? 'public' : 'hidden',
    confidence: v.confidence ?? null,
    cityId: typeof v.city === 'object' && v.city ? v.city.id : v.city ?? null,
    oblast: v.oblast ?? null,
    address: v.address ?? null,
    geoLat: v.geo?.lat ?? null,
    geoLng: v.geo?.lng ?? null,
    geoPrecision: v.geo?.precision ?? null,
    summary: v.summary ?? null,
    publicDescription: v.publicDescription ?? null,
    recentNote: v.recentNote ?? null,
    descriptionInternal: v.description ?? null,
    ownerQuoteApproved: v.ownerQuoteApproved ?? null,
    instagram: v.instagram ?? null,
    website: v.website ?? null,
    facebook: v.facebook ?? null,
    phone: v.phone ?? null,
    email: v.email ?? null,
    b2bMinOrder: v.b2b?.minOrder ?? null,
    b2bLeadTime: v.b2b?.leadTime ?? null,
    b2bFoodSafe: v.b2b?.foodSafe ?? null,
    b2bDishwasherSafe: v.b2b?.dishwasherSafe ?? null,
    b2bWorksWithHoreca: v.b2b?.worksWithHoreca ?? null,
    b2bWorksWithCorporate: v.b2b?.worksWithCorporate ?? null,
    consentPhotos: v.consent?.photos ?? null,
    consentRequests: v.consent?.requests ?? null,
    consentNotes: v.consent?.notes ?? null,
    alternateNames: texts(v.alternateNames),
    formats: Array.isArray(v.formats) ? v.formats : [],
    services: texts(v.services),
    products: texts(v.products),
    salesChannels: texts(v.salesChannels),
    otherLinks: texts(v.otherLinks),
    sources: texts(v.sources),
    instagramPosts: texts(v.activity?.instagramPosts),
    b2bLogoMethods: texts(v.b2b?.logoMethods),
  } as unknown as StudioSnapshot['row']
  const prices = (Array.isArray(v.prices) ? (v.prices as { text: string; source?: string | null; dateText?: string | null; date?: string | null }[]) : []).map((p) => ({ text: p.text, source: p.source ?? null, dateText: p.dateText ?? p.date ?? null }))
  const photos = (Array.isArray(v.photos) ? (v.photos as unknown[]) : []).map((p) => (typeof p === 'object' && p ? (p as { id?: unknown }).id : p)).filter((p: unknown) => typeof p === 'number')
  return { row, prices, photos }
}

/** What one snapshot has that another doesn't, in editor field names (row fields + prices + photoIds). */
export function snapshotDiff(a: StudioSnapshot, b: StudioSnapshot): Changes {
  const changes = diff(a.row as Record<string, unknown>, b.row as Record<string, unknown>, [...ROW_FIELDS])
  const pa = a.prices.map((p) => ({ text: p.text, source: p.source ?? null, dateText: p.dateText ?? null }))
  const pb = b.prices.map((p) => ({ text: p.text, source: p.source ?? null, dateText: p.dateText ?? null }))
  if (!same(pa, pb)) changes.prices = { from: pa, to: pb }
  if (!same(a.photos, b.photos)) changes.photoIds = { from: a.photos, to: b.photos }
  return changes
}

/**
 * Saves the whole editor form. Refuses (Conflict) when someone saved after `expectedRevision`, reporting what they
 * changed. A no-op save writes nothing. Returns the new revision and what changed.
 */
export async function saveStudio(db: Db, id: number, edit: StudioEdit, actor: Actor, note = 'Збережено в панелі') {
  const result = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(studios).where(eq(studios.id, id)).for('update').limit(1)
    if (!cur) throw new NotFound('Студію не знайдено.')
    if (cur.revision !== edit.expectedRevision) {
      const [base] = await tx
        .select({ snapshot: studioRevisions.snapshot })
        .from(studioRevisions)
        .where(and(eq(studioRevisions.studioId, id), eq(studioRevisions.revision, edit.expectedRevision)))
        .orderBy(desc(studioRevisions.id))
        .limit(1)
      const now = (await snapshotStudio(tx, id))!
      const [last] = await tx
        .select({ name: user.name })
        .from(studioRevisions)
        .leftJoin(user, eq(user.id, studioRevisions.actorId))
        .where(eq(studioRevisions.studioId, id))
        .orderBy(desc(studioRevisions.id))
        .limit(1)
      throw new Conflict(cur.revision, base ? snapshotDiff(normalizeSnapshot(base.snapshot), now) : {}, last?.name ?? null)
    }
    const before = (await snapshotStudio(tx, id))!

    if (edit.slug !== cur.slug) {
      const [taken] = await tx.select({ id: studios.id }).from(studios).where(and(eq(studios.slug, edit.slug), sql`${studios.id} <> ${id}`)).limit(1)
      if (taken) throw new Invalid('Така адреса (slug) вже є в іншої студії.')
      const [historic] = await tx.select({ studioId: studioSlugHistory.studioId }).from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, edit.slug)).limit(1)
      if (historic && historic.studioId !== id) throw new Invalid('Ця адреса раніше належала іншій студії.')
      // the old slug keeps redirecting; taking a slug back removes it from history
      await tx.delete(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, edit.slug))
      await tx.insert(studioSlugHistory).values({ oldSlug: cur.slug, studioId: id }).onConflictDoUpdate({ target: studioSlugHistory.oldSlug, set: { studioId: id, changedAt: sql`now()` } })
    }

    if (edit.photoIds.length) {
      const found = await tx.select({ id: media.id }).from(media).where(inArray(media.id, edit.photoIds))
      if (found.length !== new Set(edit.photoIds).size) throw new Invalid('Деяких фото вже немає в медіатеці.')
    }

    const rowPatch = Object.fromEntries(ROW_FIELDS.map((f) => [f, edit[f]])) as Pick<StudioEdit, RowField>
    const rowChanged = Object.keys(diff(cur as Record<string, unknown>, { ...cur, ...rowPatch } as Record<string, unknown>, [...ROW_FIELDS])).length > 0
    if (rowChanged) await tx.update(studios).set({ ...rowPatch, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(studios.id, id))

    const pricesNow = edit.prices.map((p) => ({ text: p.text, source: p.source ?? null, dateText: p.dateText ?? null }))
    if (!same(before.prices, pricesNow)) {
      await tx.delete(studioPrices).where(eq(studioPrices.studioId, id))
      if (pricesNow.length) await tx.insert(studioPrices).values(pricesNow.map((p, position) => ({ studioId: id, position, ...p })))
    }
    if (!same(before.photos, edit.photoIds)) {
      await tx.delete(studioPhotos).where(eq(studioPhotos.studioId, id))
      if (edit.photoIds.length) await tx.insert(studioPhotos).values(edit.photoIds.map((mediaId, position) => ({ studioId: id, mediaId, position })))
      // a photo placed on a profile is no longer an orphan or waiting
      await tx.update(media).set({ status: 'active' }).where(and(inArray(media.id, edit.photoIds.length ? edit.photoIds : [-1]), sql`${media.status} <> 'active'`))
    }

    const after = (await snapshotStudio(tx, id))!
    const changes = snapshotDiff(before, after)
    if (!Object.keys(changes).length) return { revision: cur.revision, changes, slug: cur.slug, citySlugs: [] as string[] }
    // The state being edited must exist as a revision, so a later conflict can say what changed since then and
    // history can show this save's diff (studios created by import or migration may have none yet).
    const [baseline] = await tx.select({ id: studioRevisions.id }).from(studioRevisions).where(and(eq(studioRevisions.studioId, id), eq(studioRevisions.revision, cur.revision))).limit(1)
    if (!baseline) await tx.insert(studioRevisions).values({ studioId: id, revision: cur.revision, snapshot: before, actorId: null, source: 'baseline', note: 'Стан до першого редагування в панелі' })
    const revision = await recordRevision(tx, id, actor, note)
    await audit(tx, actor, 'studio', id, 'update', changes)
    const cityIds = [...new Set([before.row.cityId, after.row.cityId].filter((c): c is number => Boolean(c)))]
    const citySlugs = cityIds.length ? (await tx.select({ slug: cities.slug }).from(cities).where(inArray(cities.id, cityIds))).map((c) => c.slug) : []
    return { revision, changes, slug: after.row.slug, oldSlug: before.row.slug, citySlugs }
  })
  if (Object.keys(result.changes).length) {
    const paths = [...studioPaths(result.slug), ...('oldSlug' in result && result.oldSlug && result.oldSlug !== result.slug ? [`/vyrobnyky/${result.oldSlug}`] : []), ...result.citySlugs.flatMap((c) => [`/vyrobnyky/misto/${c}`, `/maister-klasy/${c}`])]
    await revalidateCatalog(paths)
  }
  return { revision: result.revision, changes: result.changes }
}

// ---------------------------------------------------------------- revisions

export async function listRevisions(db: Db, id: number, limit = 50) {
  return db
    .select({ id: studioRevisions.id, revision: studioRevisions.revision, source: studioRevisions.source, note: studioRevisions.note, createdAt: studioRevisions.createdAt, actorName: user.name })
    .from(studioRevisions)
    .leftJoin(user, eq(user.id, studioRevisions.actorId))
    .where(eq(studioRevisions.studioId, id))
    .orderBy(desc(studioRevisions.id))
    .limit(limit)
}

/** What a revision changed compared with the revision before it (empty for the first one). */
export async function revisionChanges(db: Db, studioId: number, revisionId: number) {
  const [r] = await db.select().from(studioRevisions).where(and(eq(studioRevisions.id, revisionId), eq(studioRevisions.studioId, studioId))).limit(1)
  if (!r) return null
  const [prev] = await db
    .select({ snapshot: studioRevisions.snapshot })
    .from(studioRevisions)
    .where(and(eq(studioRevisions.studioId, studioId), lt(studioRevisions.id, revisionId)))
    .orderBy(desc(studioRevisions.id))
    .limit(1)
  return { revision: r, changes: prev ? snapshotDiff(normalizeSnapshot(prev.snapshot), normalizeSnapshot(r.snapshot)) : {} }
}

/**
 * Restores a studio to a stored revision. It is a new save (new revision, audit «restored»), never a rewrite of
 * history; it goes through the same version check, so restoring over someone's fresh edit is refused.
 */
export async function restoreRevision(db: Db, studioId: number, revisionId: number, expectedRevision: number, actor: Actor) {
  const [r] = await db.select().from(studioRevisions).where(and(eq(studioRevisions.id, revisionId), eq(studioRevisions.studioId, studioId))).limit(1)
  if (!r) throw new NotFound('Версію не знайдено.')
  const snap = normalizeSnapshot(r.snapshot)
  const photos = snap.photos.length ? (await db.select({ id: media.id }).from(media).where(inArray(media.id, snap.photos))).map((m) => m.id) : []
  const form = toEditForm({
    row: { ...snap.row, revision: expectedRevision },
    prices: snap.prices,
    city: null,
    photos: snap.photos.filter((p) => photos.includes(p)).map((pid) => ({ id: pid, fileName: '', alt: null, width: null, height: null, thumb: null, status: 'active' })),
  })
  const res = await saveStudio(db, studioId, form, actor, `Відновлено версію ${r.revision}`)
  if (Object.keys(res.changes).length) await audit(db, actor, 'studio', studioId, 'restored', { revision: { from: null, to: r.revision } })
  return { ...res, missingPhotos: snap.photos.length - photos.length }
}

