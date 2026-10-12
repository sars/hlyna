import { and, eq } from 'drizzle-orm'

import type { UserRole } from '../../shared/options'
import type { Db } from '../db'
import { studioOwner, user } from '../db/schema/auth'
import type { Auth } from './index'
import { hasStaffRole, isStaff, type StaffRole } from './roles'

// Who is signed in, and may they do this? Framework-free: route handlers, server components, Hono middleware
// and tests all call these with request headers. guards.ts binds them to the app's auth and db.

export type SignedInUser = {
  id: string
  name: string
  email: string
  login: string | null
  role: UserRole
  sessionId: string
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message)
  }
}

export async function currentUser(auth: Auth, db: Db, headers: Headers): Promise<SignedInUser | null> {
  const s = await auth.api.getSession({ headers })
  if (!s) return null
  // The session row alone isn't enough: an account switched off or a role changed must count immediately.
  const [u] = await db
    .select({ id: user.id, name: user.name, email: user.email, login: user.displayUsername, role: user.role, active: user.active })
    .from(user)
    .where(eq(user.id, s.user.id))
    .limit(1)
  if (!u?.active) return null
  return { id: u.id, name: u.name, email: u.email, login: u.login, role: u.role, sessionId: s.session.id }
}

/** Staff only (/panel). `editor` lets editors and admins in; `admin` only admins. Owners get 403. */
export async function requireRole(auth: Auth, db: Db, headers: Headers, required: StaffRole): Promise<SignedInUser> {
  const u = await currentUser(auth, db, headers)
  if (!u) throw new AuthError(401, 'Увійдіть, щоб продовжити.')
  if (!isStaff(u.role)) throw new AuthError(403, 'Ця сторінка лише для команди «Глини». Ваш кабінет — /kabinet.')
  if (!hasStaffRole(u.role, required)) throw new AuthError(403, 'Недостатньо прав.')
  return u
}

export async function ownsStudio(db: Db, userId: string, studioId: number): Promise<boolean> {
  const rows = await db
    .select({ s: studioOwner.studioId })
    .from(studioOwner)
    .where(and(eq(studioOwner.userId, userId), eq(studioOwner.studioId, studioId)))
    .limit(1)
  return rows.length > 0
}


/**
 * The cabinet: the signed-in owner must manage this studio. Staff (editor/admin) pass too, so we can see a
 * cabinet page as the owner sees it; their edits still go through /panel.
 */
export async function requireOwnerOf(auth: Auth, db: Db, headers: Headers, studioId: number): Promise<SignedInUser> {
  const u = await currentUser(auth, db, headers)
  if (!u) throw new AuthError(401, 'Увійдіть у кабінет.')
  if (isStaff(u.role)) return u
  if (!(await ownsStudio(db, u.id, studioId))) throw new AuthError(403, 'Цей профіль не прив’язаний до вашого кабінету.')
  return u
}
