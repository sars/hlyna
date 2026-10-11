import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm'

import type { UserRole } from '../../shared/options'
import type { Db } from '../db'
import { inviteLinks, session, studioOwner, user } from '../db/schema/auth'
import { cities, studios } from '../db/schema/catalog'
import { createInvite } from '../auth/invites'
import { activateUser, createUser, deactivateUser, grantStudios, revokeStudios } from '../auth/users'
import { audit, type Actor } from './audit'
import { NotFound } from './requests'
import { Invalid } from './studioEditor'

// People: our team (admin, editor) and studio owners. Nobody signs up; we create accounts and hand out one-time
// links (no e-mail is sent — the panel shows the link and a ready message to forward).

export type UserKind = 'staff' | 'owner'

export async function listUsers(db: Db, f: { kind?: UserKind; q?: string; active?: boolean }) {
  const like = f.q?.trim() ? `%${f.q.trim().replace(/[%_]/g, '\\$&')}%` : null
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      login: user.displayUsername,
      role: user.role,
      active: user.active,
      contact: user.contact,
      lastLoginAt: user.lastLoginAt,
      lockUntil: user.lockUntil,
      createdAt: user.createdAt,
      studios: sql<string[]>`coalesce((select array_agg(s.name order by so.position) from ${studioOwner} so join ${studios} s on s.id = so.studio_id where so.user_id = "app"."user"."id"), '{}')`,
      sessions: sql<number>`(select count(*)::int from ${session} x where x.user_id = "app"."user"."id" and x.expires_at > now())`,
    })
    .from(user)
    .where(
      and(
        f.kind === 'staff' ? sql`${user.role} in ('admin', 'editor')` : f.kind === 'owner' ? eq(user.role, 'owner') : undefined,
        f.active === undefined ? undefined : eq(user.active, f.active),
        like ? or(ilike(user.name, like), ilike(user.email, like), ilike(user.displayUsername, like), ilike(user.contact, like)) : undefined,
      ),
    )
    .orderBy(desc(user.active), asc(user.name))
    .limit(300)
}

export async function getUser(db: Db, id: string) {
  const [u] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!u) return null
  const owned = await db
    .select({ id: studios.id, name: studios.name, slug: studios.slug, city: cities.name, grantedAt: studioOwner.grantedAt })
    .from(studioOwner)
    .innerJoin(studios, eq(studios.id, studioOwner.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(eq(studioOwner.userId, id))
    .orderBy(asc(studioOwner.position))
  const sessions = await db
    .select({ id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt, ip: session.ipAddress, userAgent: session.userAgent })
    .from(session)
    .where(and(eq(session.userId, id), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt))
  const [invite] = await db
    .select({ createdAt: inviteLinks.createdAt, expiresAt: inviteLinks.expiresAt, usedAt: inviteLinks.usedAt })
    .from(inviteLinks)
    .where(eq(inviteLinks.userId, id))
    .orderBy(desc(inviteLinks.createdAt))
    .limit(1)
  const { email, ...rest } = u
  return { ...rest, email: email.endsWith('.invalid') ? null : email, owned, sessions, lastInvite: invite ?? null }
}

/** The message we forward with a link (Ukrainian, ready to paste into Instagram or Telegram). */
export function inviteMessage(role: UserRole, name: string, link: string, studioNames: string[], baseUrl = 'https://hlyna.com.ua') {
  const site = baseUrl.replace(/\/$/, '')
  if (role === 'owner')
    return [
      `Вітаємо${name ? `, ${name}` : ''}!`,
      `Це посилання, щоб задати пароль до кабінету «Глини»${studioNames.length ? ` для ${studioNames.join(', ')}` : ''}:`,
      link,
      'У кабінеті можна додати фото, ціни, послуги й умови для бізнесу; зміни ми переглядаємо й публікуємо.',
      `Посилання одноразове й діє 7 днів. Входити потім тут: ${site}/kabinet/vhid`,
    ].join('\n')
  return [`Вітаю${name ? `, ${name}` : ''}!`, 'Посилання, щоб задати пароль до панелі «Глини» (діє 7 днів, одноразове):', link, `Вхід потім: ${site}/panel/vhid`].join('\n')
}

export async function issueInvite(db: Db, id: string, actor: Actor, baseUrl: string) {
  const u = await getUser(db, id)
  if (!u) throw new NotFound('Користувача не знайдено.')
  if (!u.active) throw new Invalid('Спершу увімкніть доступ.')
  const { link, expiresAt } = await createInvite(db, { userId: id, createdBy: actor.id, baseUrl })
  await audit(db, actor, 'user', id, 'invite', { invite: { from: null, to: expiresAt.toISOString() } })
  return { link, expiresAt, message: inviteMessage(u.role, u.name, link, u.owned.map((s) => s.name), baseUrl) }
}

export async function createStaff(db: Db, input: { name: string; email: string; role: 'admin' | 'editor' }, actor: Actor, baseUrl: string) {
  const id = await createUser(db, { role: input.role, name: input.name.trim(), email: input.email })
  await audit(db, actor, 'user', id, 'create', { role: { from: null, to: input.role }, name: { from: null, to: input.name } })
  return { id, ...(await issueInvite(db, id, actor, baseUrl)) }
}

export async function createOwner(db: Db, input: { name: string; contact: string | null; studioIds: number[] }, actor: Actor, baseUrl: string) {
  const id = await createUser(db, { role: 'owner', name: input.name.trim(), contact: input.contact })
  await grantStudios(db, id, input.studioIds, actor.id)
  if (input.studioIds.length) await db.update(studios).set({ ownerVerified: true }).where(inArray(studios.id, input.studioIds))
  await audit(db, actor, 'user', id, 'create', { role: { from: null, to: 'owner' }, studios: { from: null, to: input.studioIds } })
  return { id, ...(await issueInvite(db, id, actor, baseUrl)) }
}

/** Role change between admin and editor; owners stay owners (a different kind of account). */
export async function setRole(db: Db, id: string, role: 'admin' | 'editor', actor: Actor) {
  const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1)
  if (!u) throw new NotFound('Користувача не знайдено.')
  if (u.role === 'owner') throw new Invalid('Власника студії не можна зробити членом команди. Створіть окремий акаунт.')
  if (id === actor.id && role !== 'admin') throw new Invalid('Не можна зняти права адміністратора із себе.')
  if (u.role === role) return { changed: false }
  if (u.role === 'admin') {
    const [{ admins }] = await db.select({ admins: sql<number>`count(*)::int` }).from(user).where(and(eq(user.role, 'admin'), eq(user.active, true)))
    if (admins! <= 1) throw new Invalid('Має лишитися хоча б один адміністратор.')
  }
  await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, id))
  await audit(db, actor, 'user', id, 'update', { role: { from: u.role, to: role } })
  return { changed: true }
}

export async function setActive(db: Db, id: string, active: boolean, actor: Actor) {
  const [u] = await db.select({ role: user.role, active: user.active }).from(user).where(eq(user.id, id)).limit(1)
  if (!u) throw new NotFound('Користувача не знайдено.')
  if (!active && id === actor.id) throw new Invalid('Не можна вимкнути доступ собі.')
  if (u.active === active) return { changed: false }
  if (!active && u.role === 'admin') {
    const [{ admins }] = await db.select({ admins: sql<number>`count(*)::int` }).from(user).where(and(eq(user.role, 'admin'), eq(user.active, true)))
    if (admins! <= 1) throw new Invalid('Має лишитися хоча б один активний адміністратор.')
  }
  if (active) await activateUser(db, id)
  else await deactivateUser(db, id)
  await audit(db, actor, 'user', id, active ? 'activated' : 'deactivated', { active: { from: u.active, to: active } })
  return { changed: true }
}

/** Sets exactly which studios an owner manages (adds and removes; verified flags follow). */
export async function setOwnerStudios(db: Db, id: string, studioIds: number[], actor: Actor) {
  const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1)
  if (!u) throw new NotFound('Користувача не знайдено.')
  if (u.role !== 'owner') throw new Invalid('Студії призначаються лише власникам.')
  const have = (await db.select({ id: studioOwner.studioId }).from(studioOwner).where(eq(studioOwner.userId, id))).map((r) => r.id)
  const add = studioIds.filter((s) => !have.includes(s))
  const remove = have.filter((s) => !studioIds.includes(s))
  if (!add.length && !remove.length) return { changed: false }
  await grantStudios(db, id, add, actor.id)
  await revokeStudios(db, id, remove)
  if (add.length) await db.update(studios).set({ ownerVerified: true }).where(inArray(studios.id, add))
  // a studio nobody manages any more is no longer «підтверджено студією»
  if (remove.length)
    await db
      .update(studios)
      .set({ ownerVerified: false })
      .where(and(inArray(studios.id, remove), sql`not exists (select 1 from ${studioOwner} so where so.studio_id = "app"."studios"."id")`))
  await audit(db, actor, 'user', id, 'update', { studios: { from: have, to: studioIds } })
  return { changed: true }
}

export async function revokeSession(db: Db, userId: string, sessionId: string, actor: Actor) {
  const res = await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, userId))).returning({ id: session.id })
  if (!res.length) throw new NotFound('Сесію не знайдено.')
  await audit(db, actor, 'user', userId, 'session-revoked', { session: { from: sessionId, to: null } })
  return { revoked: true }
}

export async function revokeAllSessions(db: Db, userId: string, actor: Actor) {
  const res = await db.delete(session).where(eq(session.userId, userId)).returning({ id: session.id })
  if (res.length) await audit(db, actor, 'user', userId, 'session-revoked', { sessions: { from: res.length, to: 0 } })
  return { revoked: res.length }
}
