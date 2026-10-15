import { asc, eq, ilike, or, sql } from 'drizzle-orm'

import { cities, studioPhotos, studioPrices, studios } from '../db/schema/catalog'
import { studioRevisions } from '../db/schema/history'
import type { Db } from '../db'
import { audit, diff, type Actor, type Changes, type Exec } from './audit'

// Studio rows, snapshots for history, and the small writes other services need (owner-verified flag,
// owner change sets). The full panel editor builds on top of these.

export type StudioSnapshot = {
  row: typeof studios.$inferSelect
  prices: { text: string; source: string | null; dateText: string | null }[]
  photos: number[]
}

export async function snapshotStudio(ex: Exec, id: number): Promise<StudioSnapshot | null> {
  const [row] = await ex.select().from(studios).where(eq(studios.id, id)).limit(1)
  if (!row) return null
  const prices = await ex
    .select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText })
    .from(studioPrices)
    .where(eq(studioPrices.studioId, id))
    .orderBy(asc(studioPrices.position))
  const photos = (await ex.select({ m: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, id)).orderBy(asc(studioPhotos.position))).map((p) => p.m)
  return { row, prices, photos }
}

/** Bumps studios.revision and stores the full new state as a revision (history + restore). */
export async function recordRevision(ex: Exec, id: number, actor: Actor, note: string) {
  const [r] = await ex
    .update(studios)
    .set({ revision: sql`${studios.revision} + 1`, updatedAt: sql`now()`, updatedBy: actor.id })
    .where(eq(studios.id, id))
    .returning({ revision: studios.revision })
  const snap = await snapshotStudio(ex, id)
  await ex.insert(studioRevisions).values({ studioId: id, revision: r!.revision, snapshot: snap, actorId: actor.id, source: actor.source, note })
  return r!.revision
}

/** Sets plain columns on a studio, with audit and a revision. No-op (and no revision) when nothing changes. */
export async function patchStudio(ex: Exec, id: number, patch: Partial<typeof studios.$inferInsert>, actor: Actor, note: string): Promise<Changes> {
  const [cur] = await ex.select().from(studios).where(eq(studios.id, id)).for('update').limit(1)
  if (!cur) return {}
  const changes = diff(cur as Record<string, unknown>, { ...cur, ...patch } as Record<string, unknown>, Object.keys(patch))
  if (!Object.keys(changes).length) return {}
  await ex.update(studios).set({ ...patch, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(studios.id, id))
  await recordRevision(ex, id, actor, note)
  await audit(ex, actor, 'studio', id, 'update', changes)
  return changes
}

export type NewStudio = Omit<typeof studios.$inferInsert, 'id' | 'revision' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
  prices?: { text: string; source?: string | null; dateText?: string | null }[]
}

/** Adds a studio (research or panel): the row and its prices, a first revision and an audit «create». */
export async function createStudio(ex: Exec, input: NewStudio, actor: Actor, note: string) {
  const { prices = [], ...row } = input
  const [r] = await ex.insert(studios).values({ ...row, createdBy: actor.id, updatedBy: actor.id }).returning({ id: studios.id })
  const id = r!.id
  if (prices.length) await ex.insert(studioPrices).values(prices.map((p, position) => ({ studioId: id, position, text: p.text, source: p.source ?? null, dateText: p.dateText ?? null })))
  const snap = await snapshotStudio(ex, id)
  await ex.insert(studioRevisions).values({ studioId: id, revision: 1, snapshot: snap, actorId: actor.id, source: actor.source, note })
  await audit(ex, actor, 'studio', id, 'create', { slug: { from: null, to: row.slug }, name: { from: null, to: row.name } })
  return id
}

/** Small studio search for pickers (assign a request, link an owner): name, alternate names, slug, Instagram. */
export async function searchStudios(db: Db, q: string, limit = 12) {
  const term = q.trim()
  if (term.length < 2) return []
  const like = `%${term.replace(/[%_]/g, '\\$&')}%`
  return db
    .select({ id: studios.id, name: studios.name, slug: studios.slug, city: cities.name, visibility: studios.visibility, instagram: studios.instagram })
    .from(studios)
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(
      or(
        ilike(studios.name, like),
        ilike(studios.slug, like),
        ilike(studios.instagram, like),
        sql`exists (select 1 from unnest(${studios.alternateNames}) a where a ilike ${like})`,
      ),
    )
    .orderBy(sql`${studios.visibility} = 'public' desc`, asc(studios.name))
    .limit(limit)
}
