import { and, asc, eq, ilike, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { cities, citySlugHistory, studios } from '../db/schema/catalog'
import { revalidateCatalog } from '../revalidate'
import { audit, diff, type Actor } from './audit'
import { NotFound } from './requests'
import { Invalid } from './studioEditor'

// Cities: name, slug, oblast, the locative the site writes in leads («у Києві»), population. A slug change keeps the
// old URL working through city_slug_history (the site answers it with a 301).

export type CityInput = { name: string; slug: string; oblast: string | null; locative: string | null; population: number | null; isOver100k: boolean | null }

const FIELDS = ['name', 'slug', 'oblast', 'locative', 'population', 'isOver100k'] as const

export async function listCities(db: Db, q?: string) {
  const like = q?.trim() ? `%${q.trim().replace(/[%_]/g, '\\$&')}%` : null
  return db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      oblast: cities.oblast,
      locative: cities.locative,
      population: cities.population,
      isOver100k: cities.isOver100k,
      studios: sql<number>`(select count(*)::int from ${studios} s where s.city_id = "app"."cities"."id")`,
      publicStudios: sql<number>`(select count(*)::int from ${studios} s where s.city_id = "app"."cities"."id" and s.visibility = 'public')`,
    })
    .from(cities)
    .where(like ? ilike(cities.name, like) : undefined)
    .orderBy(sql`(select count(*) from ${studios} s where s.city_id = "app"."cities"."id" and s.visibility = 'public') desc`, asc(cities.name))
}

export async function getCity(db: Db, id: number) {
  const [c] = await db.select().from(cities).where(eq(cities.id, id)).limit(1)
  if (!c) return null
  const oldSlugs = await db.select({ slug: citySlugHistory.oldSlug, changedAt: citySlugHistory.changedAt }).from(citySlugHistory).where(eq(citySlugHistory.cityId, id))
  return { ...c, oldSlugs }
}

async function checkSlug(ex: Db | Parameters<Parameters<Db['transaction']>[0]>[0], slug: string, id: number | null) {
  const [taken] = await ex.select({ id: cities.id }).from(cities).where(id ? and(eq(cities.slug, slug), sql`${cities.id} <> ${id}`) : eq(cities.slug, slug)).limit(1)
  if (taken) throw new Invalid('Таке місто (slug) вже є.')
  const [historic] = await ex.select({ cityId: citySlugHistory.cityId }).from(citySlugHistory).where(eq(citySlugHistory.oldSlug, slug)).limit(1)
  if (historic && historic.cityId !== id) throw new Invalid('Ця адреса раніше належала іншому місту.')
}

export async function createCity(db: Db, input: CityInput, actor: Actor) {
  return db.transaction(async (tx) => {
    await checkSlug(tx, input.slug, null)
    const [c] = await tx.insert(cities).values({ ...input, createdBy: actor.id, updatedBy: actor.id }).returning({ id: cities.id })
    await audit(tx, actor, 'city', c!.id, 'create', Object.fromEntries(FIELDS.map((f) => [f, { from: null, to: input[f] }])))
    return { id: c!.id }
  })
}

/** Saves a city. Renaming the slug records the old one, so links and search results keep working. */
export async function saveCity(db: Db, id: number, input: CityInput, actor: Actor) {
  const res = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cities).where(eq(cities.id, id)).for('update').limit(1)
    if (!cur) throw new NotFound('Місто не знайдено.')
    const changes = diff(cur as Record<string, unknown>, { ...cur, ...input } as Record<string, unknown>, [...FIELDS])
    if (!Object.keys(changes).length) return { changes, oldSlug: cur.slug, slug: cur.slug }
    if (input.slug !== cur.slug) {
      await checkSlug(tx, input.slug, id)
      await tx.delete(citySlugHistory).where(eq(citySlugHistory.oldSlug, input.slug))
      await tx.insert(citySlugHistory).values({ oldSlug: cur.slug, cityId: id }).onConflictDoUpdate({ target: citySlugHistory.oldSlug, set: { cityId: id, changedAt: sql`now()` } })
    }
    await tx.update(cities).set({ ...input, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(cities.id, id))
    await audit(tx, actor, 'city', id, 'update', changes)
    return { changes, oldSlug: cur.slug, slug: input.slug }
  })
  if (Object.keys(res.changes).length) {
    const slugs = [...new Set([res.oldSlug, res.slug])]
    await revalidateCatalog(slugs.flatMap((s) => [`/vyrobnyky/misto/${s}`, `/maister-klasy/${s}`, `/sertyfikaty/${s}`]))
  }
  return res
}

/** The current slug for an old one (the public router answers with a 301). */
export async function resolveCitySlug(db: Db, slug: string) {
  const [h] = await db.select({ slug: cities.slug }).from(citySlugHistory).innerJoin(cities, eq(cities.id, citySlugHistory.cityId)).where(eq(citySlugHistory.oldSlug, slug)).limit(1)
  return h?.slug ?? null
}
