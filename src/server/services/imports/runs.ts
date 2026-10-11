import { and, eq, inArray, sql } from 'drizzle-orm'

import type { Db } from '../../db'
import { studioPrices, studios } from '../../db/schema/catalog'
import { changeSets, importRuns } from '../../db/schema/history'
import { audit, diff, type Actor, type Exec } from '../audit'
import { recordRevision } from '../studios'

// Shared pieces of the import scripts on the new stack: run bookkeeping (app.import_runs, shown in the panel),
// «don't touch studios with an owner's pending changes», and one studio write = one revision + audit entry.

export async function startRun(db: Db, script: string, note?: string) {
  const [r] = await db.insert(importRuns).values({ script, note: note ?? null }).returning({ id: importRuns.id })
  return r!.id
}

export async function finishRun(db: Db, id: number, counts: Record<string, unknown>, note?: string) {
  await db.update(importRuns).set({ finishedAt: sql`now()`, counts, ...(note ? { note } : {}) }).where(eq(importRuns.id, id))
}

/** Studio ids that have an owner's change set waiting for review: imports leave them alone until it's decided. */
export async function studiosWithPendingOwnerChanges(db: Db, ids?: number[]): Promise<Set<number>> {
  const rows = await db
    .select({ id: changeSets.studioId })
    .from(changeSets)
    .where(ids?.length ? and(eq(changeSets.status, 'pending'), inArray(changeSets.studioId, ids)) : eq(changeSets.status, 'pending'))
  return new Set(rows.map((r) => r.id))
}

export type PriceRow = { text: string; source: string | null; dateText: string | null }

/**
 * Writes plain columns and (optionally) the whole price list of one studio in one revision.
 * Returns the changes; nothing is written (and no revision made) when nothing differs.
 */
export async function writeStudio(
  ex: Exec,
  id: number,
  patch: Partial<typeof studios.$inferInsert>,
  prices: PriceRow[] | undefined,
  actor: Actor,
  note: string,
) {
  const [cur] = await ex.select().from(studios).where(eq(studios.id, id)).for('update').limit(1)
  if (!cur) return {}
  const changes = diff(cur as Record<string, unknown>, { ...cur, ...patch } as Record<string, unknown>, Object.keys(patch))
  if (prices) {
    const old = await ex.select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText }).from(studioPrices).where(eq(studioPrices.studioId, id)).orderBy(studioPrices.position)
    if (JSON.stringify(old) !== JSON.stringify(prices)) {
      changes.prices = { from: old, to: prices }
      await ex.delete(studioPrices).where(eq(studioPrices.studioId, id))
      if (prices.length) await ex.insert(studioPrices).values(prices.map((p, position) => ({ studioId: id, position, ...p })))
    }
  }
  if (!Object.keys(changes).length) return {}
  if (Object.keys(patch).length) await ex.update(studios).set({ ...patch, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(studios.id, id))
  await recordRevision(ex, id, actor, note)
  await audit(ex, actor, 'studio', id, 'update', changes)
  return changes
}

export const scriptActor = (name: string): Actor => ({ id: null, source: `script:${name}` })
