import type { Db } from '../db'
import { auditLog } from '../db/schema/history'

// Who did what, on every write: the panel's Журнал and every record's history read from here.

/** A database handle or an open transaction: services accept either. */
export type Exec = Db | Parameters<Parameters<Db['transaction']>[0]>[0]

/** Who acts: a signed-in user (Better Auth id) and through which door. */
export type Actor = { id: string | null; source: 'panel' | 'telegram' | 'kabinet' | `script:${string}` }

export type Changes = Record<string, { from: unknown; to: unknown }>

const canon = (v: unknown): unknown => {
  if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
  return v
}
export const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b))

/** Field-by-field difference of two plain records, limited to `fields`. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): Changes {
  const out: Changes = {}
  for (const f of fields) if (!same(before[f], after[f])) out[f] = { from: before[f] ?? null, to: after[f] ?? null }
  return out
}

export async function audit(
  ex: Exec,
  actor: Actor,
  entity: string,
  entityId: string | number,
  action: string,
  changes?: Changes | Record<string, unknown> | null,
) {
  await ex.insert(auditLog).values({
    actorId: actor.id,
    entity,
    entityId: String(entityId),
    action,
    changes: changes && Object.keys(changes).length ? changes : null,
    source: actor.source,
  })
}
