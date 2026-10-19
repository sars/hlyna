import { sql } from 'drizzle-orm'
import { bigint, boolean, index, integer, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'

import { app, claimStatus, requestStatus, requestWhat, withTracking } from './base'
import { studios } from './catalog'
import { items } from './items'
import { user } from './auth'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

export const requests = app.table(
  'requests',
  {
    id: serial('id').primaryKey(),
    what: requestWhat('what').notNull(),
    details: text('details'),
    studioName: text('studio_name'),
    studioLinks: text('studio_links'),
    photoConsent: boolean('photo_consent'),
    quantity: text('quantity'),
    deadline: text('deadline'),
    budgetPerItem: text('budget_per_item'),
    city: text('city'),
    logo: boolean('logo'),
    contactName: text('contact_name'),
    contactPhoneOrTelegram: text('contact_phone_or_telegram'),
    contactEmail: text('contact_email'),
    sourcePage: text('source_page'),
    status: requestStatus('status').notNull().default('new'),
    // The item a request is about (an order of one piece from a partner's catalogue); null for every other request.
    itemId: integer('item_id').references(() => items.id, { onDelete: 'set null' }),
    // Deal amount in kopecks; the 10 % commission (site.model) is derived by Postgres: round to the kopeck,
    // null when there is no positive amount.
    dealAmountKop: bigint('deal_amount_kop', { mode: 'number' }),
    commissionKop: bigint('commission_kop', { mode: 'number' }).generatedAlwaysAs(
      sql`CASE WHEN deal_amount_kop > 0 THEN round(deal_amount_kop * 10 / 100.0)::bigint ELSE NULL END`,
    ),
    notes: text('notes'),
    ipHash: text('ip_hash'),
    ...withTracking(),
  },
  (t) => [index('requests_status_idx').on(t.status), index('requests_created_idx').on(t.createdAt)],
)

// Studios a request was forwarded to (Payload: requests_rels path studiosSent).
export const requestStudios = app.table(
  'request_studios',
  {
    requestId: integer('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    sentAt: ts('sent_at'),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.studioId] })],
)

export const claims = app.table(
  'claims',
  {
    id: serial('id').primaryKey(),
    status: claimStatus('status').notNull().default('pending'),
    name: text('name').notNull(),
    contact: text('contact').notNull(),
    represents: boolean('represents'),
    rejectReason: text('reject_reason'),
    linkToOwnerId: text('link_to_owner_id').references(() => user.id, { onDelete: 'set null' }),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    decidedBy: text('decided_by'),
    decidedAt: ts('decided_at'),
    notes: text('notes'),
    ...withTracking(),
  },
  (t) => [index('claims_status_idx').on(t.status)],
)

export const claimStudios = app.table(
  'claim_studios',
  {
    claimId: integer('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    isMain: boolean('is_main').notNull().default(false),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.claimId, t.studioId] })],
)
