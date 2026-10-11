import { and, eq, inArray } from 'drizzle-orm'

import type { UserRole } from '../../shared/options'
import type { Db } from '../db'
import { session, studioOwner, user } from '../db/schema/auth'
import { normalizeLogin, syntheticEmail } from './login'

// Accounts are created only by us: an owner when a claim is approved, staff by an admin. Nobody signs up.

export async function createUser(
  db: Db,
  opts: { role: UserRole; name: string; email?: string | null; contact?: string | null; legacyId?: string | null },
) {
  const id = crypto.randomUUID()
  const email = opts.email ? normalizeLogin(opts.email) : null
  if (opts.email && (!email || !email.includes('@'))) throw new Error('Некоректний email.')
  await db.insert(user).values({
    id,
    name: opts.name,
    email: email ?? syntheticEmail(id),
    role: opts.role,
    contact: opts.contact ?? null,
    legacyId: opts.legacyId ?? null,
  })
  return id
}

/** Give an owner more studios (idempotent). */
export async function grantStudios(db: Db, userId: string, studioIds: number[], grantedBy?: string | null) {
  if (!studioIds.length) return
  const have = await db.select({ studioId: studioOwner.studioId }).from(studioOwner).where(eq(studioOwner.userId, userId))
  const known = new Set(have.map((h) => h.studioId))
  const add = studioIds.filter((id) => !known.has(id))
  if (add.length)
    await db.insert(studioOwner).values(add.map((studioId, i) => ({ userId, studioId, position: have.length + i, grantedBy: grantedBy ?? null })))
}

export async function revokeStudios(db: Db, userId: string, studioIds: number[]) {
  if (studioIds.length) await db.delete(studioOwner).where(and(eq(studioOwner.userId, userId), inArray(studioOwner.studioId, studioIds)))
}

/** Switch an account off: its sessions end now and sign-in is refused. */
export async function deactivateUser(db: Db, userId: string) {
  await db.update(user).set({ active: false, updatedAt: new Date() }).where(eq(user.id, userId))
  await db.delete(session).where(eq(session.userId, userId))
}

export async function activateUser(db: Db, userId: string) {
  await db.update(user).set({ active: true, failedLogins: 0, lockUntil: null, updatedAt: new Date() }).where(eq(user.id, userId))
}
