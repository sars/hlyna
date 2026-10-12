import { bigint, boolean, index, integer, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

import { app, userRole } from './base'
import { studios } from './catalog'

// Better Auth core tables (user, session, account, verification, rate_limit) with the username plugin columns,
// shaped as `@better-auth/cli generate` produces them for the Drizzle adapter, in schema `app`.
// Extra columns below are ours (role, lockout, owner login display).
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const user = app.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  // username plugin: owners may log in with a phone number; email is then a synthetic @owners.hlyna.invalid
  username: text('username').unique(),
  displayUsername: text('display_username'),
  // ours
  role: userRole('role').notNull().default('owner'),
  active: boolean('active').notNull().default(true),
  contact: text('contact'),
  failedLogins: integer('failed_logins').notNull().default(0),
  lockUntil: ts('lock_until'),
  lastLoginAt: ts('last_login_at'),
  legacyId: text('legacy_id').unique(), // 'owner:<id>' / 'admin:<id>' of the account before the 2026-10-12 migration; no longer written
})

export const session = app.table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: ts('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
)

export const account = app.table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenExpiresAt: ts('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'), // owners keep their scrypt$salt$key hash (custom hash/verify in src/server/auth)
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
)

export const verification = app.table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

export const rateLimit = app.table('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(), // epoch milliseconds
})

// Which studios an owner manages.
export const studioOwner = app.table(
  'studio_owner',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    grantedBy: text('granted_by'),
    grantedAt: ts('granted_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.studioId] }), index('studio_owner_studio_idx').on(t.studioId)],
)

// One-time password links shown to the admin (no e-mail is sent). Only the token hash is stored.
export const inviteLinks = app.table('invite_links', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  link: text('link'),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
})
