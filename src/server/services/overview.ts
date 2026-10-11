import { and, desc, eq, gte, sql, lt } from 'drizzle-orm'

import type { Db } from '../db'
import { user } from '../db/schema/auth'
import { studioPrices, studios } from '../db/schema/catalog'
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
    count(db.select({ n }).from(studios).where(and(pub, sql`not exists (select 1 from ${studioPrices} p where p.studio_id = ${studios.id})`))),
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
  return { rows: rows.slice(0, JOURNAL_PAGE), next: rows.length > JOURNAL_PAGE ? rows[JOURNAL_PAGE - 1]!.id : null }
}
