import { createHash, randomBytes } from 'node:crypto'

import { and, eq, gt, isNull, ne, or } from 'drizzle-orm'

import type { UserRole } from '../../shared/options'
import type { Db } from '../db'
import { account, inviteLinks, session, user } from '../db/schema/auth'
import { isEmailLogin, normalizeLogin } from './login'
import { hashPassword, MAX_PASSWORD, MIN_PASSWORD } from './password'

// One-time "set your password" links. No e-mail is sent: the link is shown in /panel and in the Telegram bot,
// and we forward it ourselves. Only the SHA-256 of the token is stored; a link works once and for 7 days.
// Links issued by the old /kabinet carry over unchanged (same token hash), so nobody needs a new one.

export const INVITE_DAYS = 7
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const invitePath = (role: UserRole) => (role === 'owner' ? '/kabinet/parol' : '/panel/parol')

export async function createInvite(db: Db, opts: { userId: string; createdBy?: string | null; baseUrl: string }) {
  const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, opts.userId)).limit(1)
  if (!u) throw new InviteError('no-user', 'Користувача не знайдено.')
  const token = randomBytes(24).toString('base64url')
  const link = `${opts.baseUrl.replace(/\/$/, '')}${invitePath(u.role)}?token=${token}`
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400 * 1000)
  // A new link replaces any older unused one.
  await db.update(inviteLinks).set({ usedAt: new Date() }).where(and(eq(inviteLinks.userId, opts.userId), isNull(inviteLinks.usedAt)))
  await db.insert(inviteLinks).values({ id: crypto.randomUUID(), userId: opts.userId, tokenHash: hashToken(token), link, expiresAt, createdBy: opts.createdBy ?? null })
  return { token, link, expiresAt }
}

export class InviteError extends Error {
  constructor(
    public code: 'invalid' | 'login' | 'login-taken' | 'password' | 'no-user',
    message: string,
  ) {
    super(message)
  }
}

/** Looks a token up without using it (for the "set password" page). */
export async function findInvite(db: Db, token: string) {
  const [row] = await db
    .select({ userId: inviteLinks.userId, expiresAt: inviteLinks.expiresAt, name: user.name, role: user.role, username: user.username, email: user.email })
    .from(inviteLinks)
    .innerJoin(user, eq(user.id, inviteLinks.userId))
    .where(and(eq(inviteLinks.tokenHash, hashToken(token)), isNull(inviteLinks.usedAt), gt(inviteLinks.expiresAt, new Date()), eq(user.active, true)))
    .limit(1)
  return row ?? null
}

/**
 * Uses a link: sets the login (email or phone) and password, ends the user's other sessions.
 * The caller then signs the person in with Better Auth (signInUsername / signInEmail) using the same credentials.
 */
export async function consumeInvite(db: Db, opts: { token: string; login: string; password: string }) {
  if (opts.password.length < MIN_PASSWORD || opts.password.length > MAX_PASSWORD)
    throw new InviteError('password', `Пароль має бути від ${MIN_PASSWORD} до ${MAX_PASSWORD} символів.`)
  const login = normalizeLogin(opts.login)
  if (!login) throw new InviteError('login', 'Вкажіть email або номер телефону.')

  return db.transaction(async (tx) => {
    // Lock the link row so a double submit can't use it twice.
    const [invite] = await tx
      .select({ id: inviteLinks.id, userId: inviteLinks.userId })
      .from(inviteLinks)
      .where(and(eq(inviteLinks.tokenHash, hashToken(opts.token)), isNull(inviteLinks.usedAt), gt(inviteLinks.expiresAt, new Date())))
      .for('update')
      .limit(1)
    if (!invite) throw new InviteError('invalid', 'Посилання недійсне або вже використане. Попросіть нове.')
    const [u] = await tx.select().from(user).where(eq(user.id, invite.userId)).limit(1)
    if (!u?.active) throw new InviteError('invalid', 'Посилання недійсне або вже використане. Попросіть нове.')

    const taken = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(ne(user.id, u.id), or(eq(user.username, login), eq(user.email, login))))
      .limit(1)
    if (taken.length) throw new InviteError('login-taken', 'Цей логін уже використовується. Вкажіть інший email або телефон.')

    const now = new Date()
    await tx
      .update(user)
      .set({
        username: login,
        displayUsername: opts.login.trim(),
        // Email logins become the account email; phone logins keep the synthetic …@owners.hlyna.invalid one.
        ...(isEmailLogin(login) ? { email: login } : {}),
        failedLogins: 0,
        lockUntil: null,
        updatedAt: now,
      })
      .where(eq(user.id, u.id))

    const hash = hashPassword(opts.password)
    const [cred] = await tx.select({ id: account.id }).from(account).where(and(eq(account.userId, u.id), eq(account.providerId, 'credential'))).limit(1)
    if (cred) await tx.update(account).set({ password: hash, updatedAt: now }).where(eq(account.id, cred.id))
    else await tx.insert(account).values({ id: crypto.randomUUID(), userId: u.id, accountId: u.id, providerId: 'credential', password: hash })

    await tx.update(inviteLinks).set({ usedAt: now }).where(eq(inviteLinks.id, invite.id))
    await tx.delete(session).where(eq(session.userId, u.id)) // a new password ends every old session
    return { userId: u.id, login, role: u.role }
  })
}
