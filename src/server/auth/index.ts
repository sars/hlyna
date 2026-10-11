import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { username } from 'better-auth/plugins'
import { eq, sql } from 'drizzle-orm'

import type { UserRole } from '../../shared/options'
import { db as defaultDb, type Db } from '../db'
import { account, rateLimit, session, user, verification } from '../db/schema/auth'
import { normalizeLogin } from './login'
import { hashPassword, MAX_PASSWORD, MIN_PASSWORD, verifyPassword } from './password'
import { LOCK_AFTER_FAILURES, LOCK_MINUTES, SESSION_SECONDS } from './roles'

// One Better Auth for everybody who signs in: admins and editors (/panel) and studio owners (/kabinet).
// There is no public sign-up and no e-mail: accounts are created by us (claim approval, user invite) and people
// set their password through a one-time link we send by hand or via the Telegram bot (see invites.ts).
//
// Only the server talks to Better Auth. Public pages import nothing from here and no `better-auth/react`
// (an ESLint rule enforces it), so the catalogue ships no auth JavaScript.

export const AUTH_BASE_PATH = '/api/auth'
export const SIGN_IN_PATHS = ['/sign-in/username', '/sign-in/email'] as const

// Endpoints we never expose. Passwords are set only through our invite links (invites.ts); profile fields are
// edited through our own routes with our own checks; usernames are not enumerable.
export const DISABLED_PATHS = [
  '/sign-up/email',
  '/request-password-reset',
  '/forget-password',
  '/reset-password',
  '/verify-email',
  '/send-verification-email',
  '/change-email',
  '/update-user',
  '/delete-user',
  '/is-username-available',
  '/link-social',
  '/unlink-account',
  '/list-accounts',
]

type LoginTarget = { id: string; active: boolean; lockUntil: Date | null; failedLogins: number }

async function findLoginTarget(db: Db, path: string, body: Record<string, unknown>): Promise<LoginTarget | null> {
  const cols = { id: user.id, active: user.active, lockUntil: user.lockUntil, failedLogins: user.failedLogins }
  if (path === '/sign-in/username') {
    const login = normalizeLogin(String(body.username ?? ''))
    if (!login) return null
    return (await db.select(cols).from(user).where(eq(user.username, login)).limit(1))[0] ?? null
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email) return null
  return (await db.select(cols).from(user).where(eq(user.email, email)).limit(1))[0] ?? null
}

export type AuthOptions = {
  db?: Db
  secret?: string
  baseURL?: string
  /** Better Auth turns its rate limiter off outside production unless told otherwise. */
  rateLimit?: boolean
}

export function createAuth(opts: AuthOptions = {}) {
  const db = opts.db ?? defaultDb
  const production = process.env.NODE_ENV === 'production'

  const options = {
    appName: 'Глина',
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
    basePath: AUTH_BASE_PATH,
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification, rateLimit } }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      minPasswordLength: MIN_PASSWORD,
      maxPasswordLength: MAX_PASSWORD,
      password: { hash: async (p: string) => hashPassword(p), verify: async ({ hash, password }: { hash: string; password: string }) => verifyPassword(password, hash) },
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        // input: false — nobody can set these through Better Auth endpoints.
        role: { type: 'string', required: false, defaultValue: 'owner', input: false },
        active: { type: 'boolean', required: false, defaultValue: true, input: false },
      },
    },
    session: {
      expiresIn: SESSION_SECONDS.owner,
      updateAge: 86400,
      cookieCache: { enabled: false }, // every request re-reads the session row, so revocation is immediate
    },
    disabledPaths: DISABLED_PATHS,
    advanced: {
      cookiePrefix: 'hlyna',
      useSecureCookies: production,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: production },
      // Behind Caddy every connection comes from Caddy; Caddy sets a single-value X-Forwarded-For with the client
      // address and the app port is not published. trustedProxies stays unset, so a forged chain resolves to nothing.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
      database: { generateId: () => crypto.randomUUID() },
    },
    rateLimit: {
      enabled: opts.rateLimit ?? production,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/username': { window: 10, max: 3 },
        '/sign-in/email': { window: 10, max: 3 },
      },
    },
    plugins: [
      username({
        minUsernameLength: 5,
        maxUsernameLength: 254,
        // Logins are emails or phone numbers, not handles: normalise any phone spelling to 380…, emails to lower case.
        usernameNormalization: (u) => normalizeLogin(u) ?? u.trim().toLowerCase(),
        // Any spelling that normalises to an email or phone is valid (the plugin's validation order differs
        // between sign-in and other endpoints, so the validator must not depend on it).
        usernameValidator: (u) => normalizeLogin(u) !== null,
      }),
    ],
    databaseHooks: {
      session: {
        create: {
          // Staff sessions last a week, owners' a month.
          before: async (s) => {
            const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, s.userId)).limit(1)
            const seconds = SESSION_SECONDS[(u?.role ?? 'owner') as UserRole]
            return { data: { ...s, expiresAt: new Date(Date.now() + seconds * 1000) } }
          },
        },
      },
    },
    hooks: {
      // Account lockout: 5 wrong passwords lock the account for 15 minutes; inactive accounts can't sign in.
      before: createAuthMiddleware(async (ctx) => {
        if (!(SIGN_IN_PATHS as readonly string[]).includes(ctx.path)) return
        const target = await findLoginTarget(db, ctx.path, (ctx.body ?? {}) as Record<string, unknown>)
        if (!target) return
        if (!target.active) throw new APIError('FORBIDDEN', { message: 'Доступ вимкнено. Напишіть нам, якщо це помилка.' })
        if (target.lockUntil && target.lockUntil > new Date())
          throw new APIError('TOO_MANY_REQUESTS', { message: `Забагато спроб. Спробуйте за ${LOCK_MINUTES} хвилин.` })
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (!(SIGN_IN_PATHS as readonly string[]).includes(ctx.path)) return
        const signedIn = ctx.context.newSession?.user?.id
        if (signedIn) {
          await db.update(user).set({ failedLogins: 0, lockUntil: null, lastLoginAt: new Date() }).where(eq(user.id, signedIn))
          return
        }
        const returned = ctx.context.returned
        if (!(returned instanceof APIError) || returned.status !== 'UNAUTHORIZED') return
        const target = await findLoginTarget(db, ctx.path, (ctx.body ?? {}) as Record<string, unknown>)
        if (!target) return
        await db
          .update(user)
          .set({
            failedLogins: sql`case when ${user.failedLogins} + 1 >= ${LOCK_AFTER_FAILURES} then 0 else ${user.failedLogins} + 1 end`,
            lockUntil: sql`case when ${user.failedLogins} + 1 >= ${LOCK_AFTER_FAILURES} then now() + make_interval(mins => ${LOCK_MINUTES}) else ${user.lockUntil} end`,
          })
          .where(eq(user.id, target.id))
      }),
    },
  } satisfies BetterAuthOptions

  return betterAuth(options)
}

export type Auth = ReturnType<typeof createAuth>

// Created on first use, so importing this module (e.g. in a build step without secrets) costs nothing.
const globalForAuth = globalThis as unknown as { hlynaAuth?: Auth }
export function getAuth(): Auth {
  if (!globalForAuth.hlynaAuth) {
    if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set')
    globalForAuth.hlynaAuth = createAuth()
  }
  return globalForAuth.hlynaAuth
}
