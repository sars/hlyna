import { and, desc, eq, gte, inArray, sql, lt } from 'drizzle-orm'

import type { Db } from '../db'
import { user } from '../db/schema/auth'
import { cities, media, studioPrices, studios } from '../db/schema/catalog'
import { auditLog, changeSets, importRuns } from '../db/schema/history'
import { claims, requests } from '../db/schema/requests'

// Figures for the Огляд screen: what came in, what waits for us, and where the catalogue is thin.

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString()

export async function overview(db: Db) {
  const count = (q: Promise<{ n: number }[]>) => q.then((r) => r[0]?.n ?? 0)
  const n = sql<number>`count(*)::int`
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const pub = eq(studios.visibility, 'public')

  const [newRequests7, newRequests30, openRequests, dealsMonth, claimsPending, changesPending] = await Promise.all([
    count(db.select({ n }).from(requests).where(and(gte(requests.createdAt, daysAgo(7)), sql`${requests.what} <> 'studio'`))),
    count(db.select({ n }).from(requests).where(and(gte(requests.createdAt, daysAgo(30)), sql`${requests.what} <> 'studio'`))),
    count(db.select({ n }).from(requests).where(sql`${requests.status} in ('new','in_progress','forwarded','replied')`)),
    db
      .select({ n, commission: sql<number>`coalesce(sum(${requests.commissionKop}),0)::bigint` })
      .from(requests)
      .where(and(eq(requests.status, 'deal'), gte(requests.updatedAt, monthStart))),
    count(db.select({ n }).from(claims).where(eq(claims.status, 'pending'))),
    count(db.select({ n }).from(changeSets).where(eq(changeSets.status, 'pending'))),
  ])

  const [publicStudios, hiddenStudios, noPrices, noGeo, noInstagram, staleIg, checked30, ownerVerified] = await Promise.all([
    count(db.select({ n }).from(studios).where(pub)),
    count(db.select({ n }).from(studios).where(eq(studios.visibility, 'hidden'))),
    count(db.select({ n }).from(studios).where(and(pub, sql`not exists (select 1 from ${studioPrices} p where p.studio_id = "app"."studios"."id")`))),
    count(db.select({ n }).from(studios).where(and(pub, sql`(${studios.geoPrecision} is null or ${studios.geoPrecision} = 'settlement')`))),
    count(db.select({ n }).from(studios).where(and(pub, sql`coalesce(${studios.instagram},'') = ''`))),
    count(db.select({ n }).from(studios).where(and(pub, lt(studios.activityLastPostDate, daysAgo(365))))),
    count(db.select({ n }).from(studios).where(and(pub, gte(studios.activityCheckedAt, daysAgo(30))))),
    count(db.select({ n }).from(studios).where(and(pub, eq(studios.ownerVerified, true)))),
  ])

  const lastImport = (await db.select().from(importRuns).orderBy(desc(importRuns.startedAt)).limit(1))[0] ?? null

  return {
    requests: { new7: newRequests7, new30: newRequests30, open: openRequests, dealsMonth: dealsMonth[0]?.n ?? 0, commissionMonthKop: Number(dealsMonth[0]?.commission ?? 0) },
    queues: { claims: claimsPending, changes: changesPending },
    catalog: { public: publicStudios, hidden: hiddenStudios, noPrices, noGeo, noInstagram, staleIg, checked30, ownerVerified },
    lastImport,
  }
}

export const JOURNAL_PAGE = 60

export async function journal(db: Db, f: { entity?: string; entityId?: string; before?: number } = {}) {
  const where = [
    f.entity ? eq(auditLog.entity, f.entity) : undefined,
    f.entityId ? eq(auditLog.entityId, f.entityId) : undefined,
    f.before ? lt(auditLog.id, f.before) : undefined,
  ].filter(Boolean)
  const rows = await db
    .select({ id: auditLog.id, at: auditLog.at, entity: auditLog.entity, entityId: auditLog.entityId, action: auditLog.action, changes: auditLog.changes, source: auditLog.source, actorName: user.name })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(where.length ? and(...(where as never[])) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(JOURNAL_PAGE + 1)
  const page = rows.slice(0, JOURNAL_PAGE)
  return { rows: await humanize(db, page), next: rows.length > JOURNAL_PAGE ? rows[JOURNAL_PAGE - 1]!.id : null }
}

type Row = { entity: string; entityId: string; changes: unknown }
const USER_KEYS = new Set(['owner', 'ownerId', 'linkToOwnerId', 'author', 'decidedBy'])
const STUDIO_LIST_KEYS = new Set(['studios', 'studioIds'])

/**
 * Journal rows speak in names: «Студія «Яр»» instead of «Студія #882», the owner's name instead of a UUID, studio
 * names instead of «1» for a list of studios. One query per kind of thing, not per row.
 */
async function humanize<T extends Row>(db: Db, rows: T[]) {
  const ids = (e: string) => [...new Set(rows.filter((r) => r.entity === e).map((r) => r.entityId))]
  const num = (xs: string[]) => xs.map(Number).filter(Number.isFinite)
  const userIds = new Set(ids('user'))
  const studioIds = new Set(num(ids('studio')))
  for (const r of rows)
    for (const [k, v] of Object.entries((r.changes ?? {}) as Record<string, { from: unknown; to: unknown }>)) {
      for (const x of [v?.from, v?.to]) {
        if (USER_KEYS.has(k) && typeof x === 'string') userIds.add(x)
        if (STUDIO_LIST_KEYS.has(k) && Array.isArray(x)) for (const n of x) if (typeof n === 'number') studioIds.add(n)
      }
    }
  const csRows = ids('change_set').length ? await db.select({ id: changeSets.id, studioId: changeSets.studioId }).from(changeSets).where(inArray(changeSets.id, num(ids('change_set')))) : []
  for (const c of csRows) studioIds.add(c.studioId)
  const [users, sts, cls, reqs, cts, meds] = await Promise.all([
    userIds.size ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, [...userIds])) : [],
    studioIds.size ? db.select({ id: studios.id, name: studios.name }).from(studios).where(inArray(studios.id, [...studioIds])) : [],
    ids('claim').length ? db.select({ id: claims.id, name: claims.name }).from(claims).where(inArray(claims.id, num(ids('claim')))) : [],
    ids('request').length ? db.select({ id: requests.id, name: requests.contactName }).from(requests).where(inArray(requests.id, num(ids('request')))) : [],
    ids('city').length ? db.select({ id: cities.id, name: cities.name }).from(cities).where(inArray(cities.id, num(ids('city')))) : [],
    ids('media').length ? db.select({ id: media.id, name: media.alt }).from(media).where(inArray(media.id, num(ids('media')))) : [],
  ])
  const userName = new Map(users.map((u) => [u.id, u.name]))
  const studioName = new Map(sts.map((s) => [s.id, s.name]))
  const csStudio = new Map(csRows.map((c) => [String(c.id), studioName.get(c.studioId) ?? null]))
  const label: Record<string, Map<string, string | null>> = {
    user: new Map([...userName].map(([k, v]) => [k, v])),
    studio: new Map([...studioName].map(([k, v]) => [String(k), v])),
    claim: new Map(cls.map((c) => [String(c.id), c.name])),
    request: new Map(reqs.map((r) => [String(r.id), r.name])),
    city: new Map(cts.map((c) => [String(c.id), c.name])),
    media: new Map(meds.map((m) => [String(m.id), m.name])),
    change_set: csStudio,
  }
  // A change set's «studio» is stored as its slug; older owner-change rows carry «newPhotos: 0» noise.
  const slugs = [...new Set(rows.flatMap((r) => Object.entries((r.changes ?? {}) as Record<string, { to: unknown }>).filter(([k, v]) => k === 'studio' && typeof v?.to === 'string').map(([, v]) => v.to as string)))]
  const bySlug = new Map(slugs.length ? (await db.select({ slug: studios.slug, name: studios.name }).from(studios).where(inArray(studios.slug, slugs))).map((x) => [x.slug, x.name]) : [])
  const value = (k: string, x: unknown) =>
    k === 'studio' && typeof x === 'string' ? bySlug.get(x) ?? x :
    USER_KEYS.has(k) && typeof x === 'string' ? userName.get(x) ?? x : STUDIO_LIST_KEYS.has(k) && Array.isArray(x) ? x.map((n) => (typeof n === 'number' ? studioName.get(n) ?? `#${n}` : n)) : x
  return rows.map((r) => ({
    ...r,
    entityLabel: label[r.entity]?.get(r.entityId) ?? null,
    changes: r.changes
      ? Object.fromEntries(
          Object.entries(r.changes as Record<string, { from: unknown; to: unknown }>)
            .filter(([k, v]) => !(k === 'newPhotos' && !v?.to))
            .map(([k, v]) => [k, { from: value(k, v?.from), to: value(k, v?.to) }]),
        )
      : r.changes,
  }))
}
