// @vitest-environment node
// Better Auth for /panel and /kabinet against a real Postgres (schema `app` from drizzle/).
// Uses AUTH_TEST_DATABASE_URL, default postgres://localhost/hlyna_apptest; every test starts from empty auth tables.
import { createHash, randomBytes, scryptSync } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../src/server/db/schema'
import { account, inviteLinks, session, studioOwner, user } from '../../src/server/db/schema/auth'
import { studios } from '../../src/server/db/schema/catalog'
import { createAuth, type Auth } from '../../src/server/auth'
import { AuthError, currentUser, requireOwnerOf, requireRole } from '../../src/server/auth/access'
import { consumeInvite, createInvite, findInvite, InviteError } from '../../src/server/auth/invites'
import { normalizeLogin } from '../../src/server/auth/login'
import { hashPassword, verifyPassword } from '../../src/server/auth/password'
import { createUser, deactivateUser, grantStudios } from '../../src/server/auth/users'

const url = process.env.AUTH_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' })
const SECRET = 'test-secret-0123456789abcdef0123456789abcdef'
const BASE = 'http://localhost:3000'
let auth: Auth
let studioA: number
let studioB: number

// The pre-Better-Auth /kabinet hash, reproduced exactly (scrypt N=16384, 16-byte salt, 64-byte key).
const legacyHash = (pw: string) => {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('base64')}$${scryptSync(pw, salt, 64).toString('base64')}`
}

const cookieFrom = (res: Response) => {
  const c = res.headers.getSetCookie().find((x) => x.startsWith('hlyna.session_token='))
  return c ? new Headers({ cookie: c.split(';')[0] }) : null
}
// Over HTTP, as a browser would call it, so hook errors come back as status codes.
const post = (path: string, body: object) =>
  auth.handler(new Request(`${BASE}/api/auth${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify(body) }))
const signInPhone = (login: string, password: string) => post('/sign-in/username', { username: login, password })
const signInEmail = (email: string, password: string) => post('/sign-in/email', { email, password })

async function owner(login: string, password: string, hash = hashPassword(password)) {
  const id = await createUser(db, { role: 'owner', name: 'Власниця' })
  await db.update(user).set({ username: normalizeLogin(login), displayUsername: login }).where(eq(user.id, id))
  await db.insert(account).values({ id: crypto.randomUUID(), userId: id, accountId: id, providerId: 'credential', password: hash })
  return id
}
async function staff(role: 'admin' | 'editor', email: string, password: string) {
  const id = await createUser(db, { role, name: role, email })
  await db.insert(account).values({ id: crypto.randomUUID(), userId: id, accountId: id, providerId: 'credential', password: hashPassword(password) })
  return id
}

beforeAll(async () => {
  auth = createAuth({ db, secret: SECRET, baseURL: BASE, rateLimit: false })
})
afterAll(async () => pool.end())
beforeEach(async () => {
  await db.execute(sql`truncate app.invite_links, app.studio_owner, app.session, app.account, app.verification, app.rate_limit, app."user" cascade`)
  await db.execute(sql`truncate app.studios restart identity cascade`)
  const [a, b] = await db.insert(studios).values([{ slug: 'a', name: 'A' }, { slug: 'b', name: 'B' }]).returning({ id: studios.id })
  studioA = a.id
  studioB = b.id
})

describe('passwords', () => {
  it('verifies a hash made by the old /kabinet code (owners keep their passwords)', () => {
    const h = legacyHash('старий-пароль-1')
    expect(verifyPassword('старий-пароль-1', h)).toBe(true)
    expect(verifyPassword('інший', h)).toBe(false)
    expect(verifyPassword('x', 'pbkdf2$whatever')).toBe(false)
  })
  it('signs in a migrated owner whose account carries the old hash', async () => {
    await owner('380671234567', 'старий-пароль-1', legacyHash('старий-пароль-1'))
    const res = await signInPhone('380671234567', 'старий-пароль-1')
    expect(res.status).toBe(200)
    expect(cookieFrom(res)).not.toBeNull()
  })
})

describe('sign-in', () => {
  it('accepts any spelling of the phone login', async () => {
    await owner('380671234567', 'пароль-довгий')
    expect((await signInPhone('067 123-45-67', 'пароль-довгий')).status).toBe(200)
    expect((await signInPhone('+38 (067) 123 45 67', 'пароль-довгий')).status).toBe(200)
  })
  it('lets staff in by email', async () => {
    await staff('admin', 'admin@hlyna.com.ua', 'admin-password')
    expect((await signInEmail('ADMIN@hlyna.com.ua', 'admin-password')).status).toBe(200)
  })
  it('locks the account after 5 wrong passwords, even for the right one, and unlocks after the wait', async () => {
    const id = await owner('owner@studio.ua', 'правильний-пароль')
    for (let i = 0; i < 5; i++) expect((await signInPhone('owner@studio.ua', 'неправильний')).status).toBe(401)
    const locked = await signInPhone('owner@studio.ua', 'правильний-пароль')
    expect(locked.status).toBe(429)
    const [row] = await db.select().from(user).where(eq(user.id, id))
    expect(row.lockUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000)
    await db.update(user).set({ lockUntil: new Date(Date.now() - 1000) }).where(eq(user.id, id))
    expect((await signInPhone('owner@studio.ua', 'правильний-пароль')).status).toBe(200)
    const [after] = await db.select().from(user).where(eq(user.id, id))
    expect(after.failedLogins).toBe(0)
    expect(after.lastLoginAt).not.toBeNull()
  })
  it('a success in between resets the failure count', async () => {
    const id = await owner('owner@studio.ua', 'правильний-пароль')
    for (let i = 0; i < 4; i++) await signInPhone('owner@studio.ua', 'неправильний')
    expect((await signInPhone('owner@studio.ua', 'правильний-пароль')).status).toBe(200)
    expect((await db.select().from(user).where(eq(user.id, id)))[0].failedLogins).toBe(0)
  })
  it('refuses a switched-off account and ends its sessions', async () => {
    const id = await owner('owner@studio.ua', 'правильний-пароль')
    const h = cookieFrom(await signInPhone('owner@studio.ua', 'правильний-пароль'))!
    expect(await currentUser(auth, db, h)).not.toBeNull()
    await deactivateUser(db, id)
    expect(await currentUser(auth, db, h)).toBeNull()
    expect((await signInPhone('owner@studio.ua', 'правильний-пароль')).status).toBe(403)
  })
  it('gives staff a week and owners a month', async () => {
    await staff('editor', 'ed@hlyna.com.ua', 'editor-password')
    await owner('owner@studio.ua', 'правильний-пароль')
    await signInEmail('ed@hlyna.com.ua', 'editor-password')
    await signInPhone('owner@studio.ua', 'правильний-пароль')
    const rows = await db.select({ exp: session.expiresAt, role: user.role }).from(session).innerJoin(user, eq(user.id, session.userId))
    const days = (d: Date) => Math.round((d.getTime() - Date.now()) / 86400000)
    expect(days(rows.find((r) => r.role === 'editor')!.exp)).toBe(7)
    expect(days(rows.find((r) => r.role === 'owner')!.exp)).toBe(30)
  })
})

describe('closed endpoints', () => {
  it.each(['/sign-up/email', '/request-password-reset', '/reset-password', '/update-user', '/is-username-available'])('%s is not exposed', async (p) => {
    const res = await auth.handler(new Request(`${BASE}/api/auth${p}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: '{}' }))
    expect(res.status).toBe(404)
  })
})

describe('invite links', () => {
  it('sets login and password once, then signs in; the link cannot be reused', async () => {
    const id = await createUser(db, { role: 'owner', name: 'Осоння' })
    const { token, link } = await createInvite(db, { userId: id, baseUrl: BASE })
    expect(link).toBe(`${BASE}/kabinet/parol?token=${token}`)
    expect(await findInvite(db, token)).not.toBeNull()
    await consumeInvite(db, { token, login: '+380 50 111 22 33', password: 'новий-пароль-1' })
    expect((await signInPhone('0501112233', 'новий-пароль-1')).status).toBe(200)
    await expect(consumeInvite(db, { token, login: '0501112233', password: 'інший-пароль-2' })).rejects.toBeInstanceOf(InviteError)
    expect(await findInvite(db, token)).toBeNull()
  })
  it('an email login becomes the account email', async () => {
    const id = await createUser(db, { role: 'owner', name: 'X' })
    const { token } = await createInvite(db, { userId: id, baseUrl: BASE })
    await consumeInvite(db, { token, login: 'Studio@Example.UA', password: 'новий-пароль-1' })
    expect((await db.select().from(user).where(eq(user.id, id)))[0].email).toBe('studio@example.ua')
  })
  it('an expired link does nothing', async () => {
    const id = await createUser(db, { role: 'owner', name: 'X' })
    const { token } = await createInvite(db, { userId: id, baseUrl: BASE })
    await db.update(inviteLinks).set({ expiresAt: new Date(Date.now() - 1000) })
    await expect(consumeInvite(db, { token, login: 'x@y.ua', password: 'новий-пароль-1' })).rejects.toMatchObject({ code: 'invalid' })
  })
  it('a newer link replaces the older one', async () => {
    const id = await createUser(db, { role: 'owner', name: 'X' })
    const first = await createInvite(db, { userId: id, baseUrl: BASE })
    await createInvite(db, { userId: id, baseUrl: BASE })
    await expect(consumeInvite(db, { token: first.token, login: 'x@y.ua', password: 'новий-пароль-1' })).rejects.toMatchObject({ code: 'invalid' })
  })
  it('refuses a login that belongs to someone else', async () => {
    await owner('0501112233', 'чийсь-пароль')
    const id = await createUser(db, { role: 'owner', name: 'X' })
    const { token } = await createInvite(db, { userId: id, baseUrl: BASE })
    await expect(consumeInvite(db, { token, login: '050 111 22 33', password: 'новий-пароль-1' })).rejects.toMatchObject({ code: 'login-taken' })
  })
  it('keeps working for links issued by the old /kabinet (same token hash)', async () => {
    const id = await createUser(db, { role: 'owner', name: 'X', legacyId: 'owner:1' })
    const token = randomBytes(24).toString('base64url')
    await db.insert(inviteLinks).values({
      id: crypto.randomUUID(),
      userId: id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 86400000),
    })
    await consumeInvite(db, { token, login: 'x@y.ua', password: 'новий-пароль-1' })
    expect((await signInPhone('x@y.ua', 'новий-пароль-1')).status).toBe(200)
  })
  it('a new password ends old sessions', async () => {
    const id = await owner('x@y.ua', 'старий-пароль')
    const h = cookieFrom(await signInPhone('x@y.ua', 'старий-пароль'))!
    const { token } = await createInvite(db, { userId: id, baseUrl: BASE })
    await consumeInvite(db, { token, login: 'x@y.ua', password: 'новий-пароль-1' })
    expect(await currentUser(auth, db, h)).toBeNull()
  })
  it('staff links point at the panel', async () => {
    const id = await createUser(db, { role: 'editor', name: 'E', email: 'e@hlyna.com.ua' })
    expect((await createInvite(db, { userId: id, baseUrl: BASE })).link).toContain('/panel/parol?token=')
  })
})

describe('guards', () => {
  const statusOf = async (p: Promise<unknown>) => p.then(() => 200, (e) => (e instanceof AuthError ? e.status : 500))

  it('roles for /panel', async () => {
    await staff('admin', 'a@hlyna.com.ua', 'admin-password')
    await staff('editor', 'e@hlyna.com.ua', 'editor-password')
    await owner('o@studio.ua', 'owner-password')
    const admin = cookieFrom(await signInEmail('a@hlyna.com.ua', 'admin-password'))!
    const editor = cookieFrom(await signInEmail('e@hlyna.com.ua', 'editor-password'))!
    const own = cookieFrom(await signInPhone('o@studio.ua', 'owner-password'))!
    expect(await statusOf(requireRole(auth, db, admin, 'admin'))).toBe(200)
    expect(await statusOf(requireRole(auth, db, editor, 'editor'))).toBe(200)
    expect(await statusOf(requireRole(auth, db, editor, 'admin'))).toBe(403)
    expect(await statusOf(requireRole(auth, db, own, 'editor'))).toBe(403)
    expect(await statusOf(requireRole(auth, db, new Headers(), 'editor'))).toBe(401)
    expect(await statusOf(requireRole(auth, db, new Headers({ cookie: 'hlyna.session_token=forged' }), 'editor'))).toBe(401)
  })
  it('owners reach only their own studios', async () => {
    const id = await owner('o@studio.ua', 'owner-password')
    await grantStudios(db, id, [studioA])
    await staff('editor', 'e@hlyna.com.ua', 'editor-password')
    const own = cookieFrom(await signInPhone('o@studio.ua', 'owner-password'))!
    const editor = cookieFrom(await signInEmail('e@hlyna.com.ua', 'editor-password'))!
    expect(await statusOf(requireOwnerOf(auth, db, own, studioA))).toBe(200)
    expect(await statusOf(requireOwnerOf(auth, db, own, studioB))).toBe(403)
    expect(await statusOf(requireOwnerOf(auth, db, editor, studioB))).toBe(200)
    expect(await statusOf(requireOwnerOf(auth, db, new Headers(), studioA))).toBe(401)
    expect((await db.select().from(studioOwner)).length).toBe(1)
  })
  it('a role change counts at once, without a new sign-in', async () => {
    const id = await staff('admin', 'a@hlyna.com.ua', 'admin-password')
    const h = cookieFrom(await signInEmail('a@hlyna.com.ua', 'admin-password'))!
    await db.update(user).set({ role: 'editor' }).where(eq(user.id, id))
    expect(await statusOf(requireRole(auth, db, h, 'admin'))).toBe(403)
  })
})

describe('rate limit', () => {
  it('allows 3 sign-in attempts per 10 s per address, stored in the database', async () => {
    const limited = createAuth({ db, secret: SECRET, baseURL: BASE, rateLimit: true })
    await owner('o@studio.ua', 'owner-password')
    const hit = () =>
      limited.handler(
        new Request(`${BASE}/api/auth/sign-in/username`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '203.0.113.7' },
          body: JSON.stringify({ username: 'o@studio.ua', password: 'wrong-password' }),
        }),
      )
    const codes = [await hit(), await hit(), await hit(), await hit()].map((r) => r.status)
    expect(codes.slice(0, 3)).toEqual([401, 401, 401])
    expect(codes[3]).toBe(429)
    expect((await db.execute(sql`select count(*)::int n from app.rate_limit`)).rows[0].n).toBeGreaterThan(0)
  })
})
