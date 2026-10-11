import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { account, studioOwner, user } from '../db/schema/auth'
import { cities, studios } from '../db/schema/catalog'
import { claims, claimStudios } from '../db/schema/requests'
import { createInvite } from '../auth/invites'
import { createUser, grantStudios } from '../auth/users'
import { audit, type Actor } from './audit'
import { NotFound } from './requests'
import { patchStudio } from './studios'

// Profile claims: a person says «це моя студія». Approving creates (or extends) the owner's account, marks the
// studios as confirmed and issues a one-time set-password link that we forward by hand. Panel and Telegram share this.

export async function listClaims(db: Db, status?: 'pending' | 'approved' | 'rejected') {
  const rows = await db
    .select({
      id: claims.id,
      status: claims.status,
      name: claims.name,
      contact: claims.contact,
      createdAt: claims.createdAt,
      studios: sql<string[]>`coalesce((select array_agg(s.name order by cs.is_main desc, cs.position) from ${claimStudios} cs join ${studios} s on s.id = cs.studio_id where cs.claim_id = "app"."claims"."id"), '{}')`,
    })
    .from(claims)
    .where(status ? eq(claims.status, status) : undefined)
    .orderBy(sql`${claims.status} = 'pending' desc`, desc(claims.id))
    .limit(200)
  return rows
}

export async function getClaim(db: Db, id: number) {
  const [c] = await db.select().from(claims).where(eq(claims.id, id)).limit(1)
  if (!c) return null
  const st = await db
    .select({
      id: studios.id,
      name: studios.name,
      slug: studios.slug,
      city: cities.name,
      instagram: studios.instagram,
      website: studios.website,
      phone: studios.phone,
      email: studios.email,
      ownerVerified: studios.ownerVerified,
      isMain: claimStudios.isMain,
    })
    .from(claimStudios)
    .innerJoin(studios, eq(studios.id, claimStudios.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(eq(claimStudios.claimId, id))
    .orderBy(desc(claimStudios.isMain), asc(claimStudios.position))
  // Owners who already manage any of these studios: approving should usually attach to them.
  const owners = st.length
    ? await db
        .selectDistinct({ id: user.id, name: user.name, login: user.displayUsername, contact: user.contact })
        .from(studioOwner)
        .innerJoin(user, eq(user.id, studioOwner.userId))
        .where(inArray(studioOwner.studioId, st.map((s) => s.id)))
    : []
  const owner = c.ownerId ? (await db.select({ id: user.id, name: user.name, login: user.displayUsername }).from(user).where(eq(user.id, c.ownerId)).limit(1))[0] ?? null : null
  return { ...c, studios: st, existingOwners: owners, owner }
}

const SITE = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua').replace(/\/$/, '')

/** The message we forward to the studio after approval (same text in the panel and in Telegram). */
export function studioWelcomeMessage(link: string) {
  return [
    'Вітаємо! Ваш профіль на «Глині» (hlyna.com.ua) підтверджено.',
    '',
    `Посилання, щоб задати пароль (діє 7 днів і спрацьовує один раз): ${link}`,
    '',
    'У кабінеті можна додати фото, оновити ціни, послуги, адресу й контакти, умови для бізнесу (мінімальна партія, терміни, логотип) і розповісти про студію своїми словами. Ми переглянемо зміни й опублікуємо їх на сайті.',
    `Вхід потім: ${SITE()}/kabinet/vhid`,
  ].join('\n')
}

export type ApproveResult =
  | { status: 'approved'; ownerId: string; link: string | null; message: string | null; already: boolean }
  | { status: 'rejected' }

/**
 * Idempotent. A pending claim is approved once; approving an approved claim returns its owner (and issues no
 * new link: use «Новий лінк» on the user). A rejected claim stays rejected.
 */
export async function approveClaim(db: Db, id: number, actor: Actor, opts: { linkToOwnerId?: string | null } = {}): Promise<ApproveResult> {
  const result = await db.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, id)).for('update').limit(1)
    if (!c) throw new NotFound(`Заявку #${id} не знайдено`)
    if (c.status === 'rejected') return { status: 'rejected' as const }
    if (c.status === 'approved') return { status: 'approved' as const, ownerId: c.ownerId!, link: null, message: null, already: true }

    const studioIds = (await tx.select({ s: claimStudios.studioId }).from(claimStudios).where(eq(claimStudios.claimId, id)).orderBy(desc(claimStudios.isMain), asc(claimStudios.position))).map((r) => r.s)
    const exec = tx as unknown as Db
    const linkTo = opts.linkToOwnerId ?? c.linkToOwnerId
    let ownerId: string
    if (linkTo) {
      const [u] = await tx.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, linkTo)).limit(1)
      if (!u || u.role !== 'owner') throw new Error('Обраний власник не знайдений.')
      ownerId = u.id
    } else {
      ownerId = await createUser(exec, { role: 'owner', name: c.name, contact: c.contact })
    }
    await grantStudios(exec, ownerId, studioIds, actor.id)
    for (const sid of studioIds) await patchStudio(tx, sid, { ownerVerified: true }, actor, `заявка #${id} схвалена`)
    await tx
      .update(claims)
      .set({ status: 'approved', ownerId, linkToOwnerId: linkTo ?? null, decidedBy: actor.id, decidedAt: sql`now()`, updatedAt: sql`now()`, updatedBy: actor.id })
      .where(eq(claims.id, id))
    await audit(tx, actor, 'claim', id, 'approve', { status: { from: 'pending', to: 'approved' }, owner: { from: null, to: ownerId } })

    // A link only when the owner has no password yet (a new account, or one that never set it).
    const [cred] = await tx.select({ id: account.id }).from(account).where(and(eq(account.userId, ownerId), eq(account.providerId, 'credential'))).limit(1)
    let link: string | null = null
    if (!cred) link = (await createInvite(exec, { userId: ownerId, createdBy: actor.id, baseUrl: SITE() })).link
    return { status: 'approved' as const, ownerId, link, message: link ? studioWelcomeMessage(link) : null, already: false }
  })
  return result
}

/** Idempotent. An approved claim can't be rejected here (undo the owner in Користувачі instead). */
export async function rejectClaim(db: Db, id: number, reason: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select({ status: claims.status }).from(claims).where(eq(claims.id, id)).for('update').limit(1)
    if (!c) throw new NotFound(`Заявку #${id} не знайдено`)
    if (c.status === 'approved') return { status: 'approved' as const }
    if (c.status === 'rejected') return { status: 'rejected' as const, already: true }
    const r = reason.trim().slice(0, 1000) || null
    await tx.update(claims).set({ status: 'rejected', rejectReason: r, decidedBy: actor.id, decidedAt: sql`now()`, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(claims.id, id))
    await audit(tx, actor, 'claim', id, 'reject', { status: { from: 'pending', to: 'rejected' }, ...(r ? { reason: { from: null, to: r } } : {}) })
    return { status: 'rejected' as const, already: false }
  })
}
