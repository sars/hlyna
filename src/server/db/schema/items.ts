import { boolean, date, index, integer, jsonb, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import type { ITEM_SEASON_END } from '../../../shared/options'
import {
  app,
  itemAvailability,
  itemCategory,
  itemHiddenReason,
  itemKind,
  itemSignal,
  itemSource,
  studioVisibility,
  withTracking,
} from './base'
import { studios } from './catalog'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })
const day = (name: string) => date(name, { mode: 'string' })

// One piece or series a studio offers, read from its Instagram (every studio) or its shop (partners only).
// Visibility follows the freshness rule in src/server/services/items.ts; only a manual hide is kept by hand.
export const items = app.table(
  'items',
  {
    id: serial('id').primaryKey(),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    source: itemSource('source').notNull(),
    // The post, highlight or shop page the item was read from.
    sourceUrl: text('source_url').notNull(),
    // Stable id within the studio: «<post code>:<title slug>» for Instagram, the shop's product id for a shop. Re-imports update by it.
    sourceKey: text('source_key').notNull(),
    // The post's date (decoded from its code); for a shop, the day we first read the product. Null for a highlight without a date.
    postedAt: day('posted_at'),
    title: text('title').notNull(),
    category: itemCategory('category').notNull(),
    occasion: text('occasion').$type<keyof typeof ITEM_SEASON_END>(),
    // First day a seasonal item is hidden (Halloween → 1 November of the post's year).
    seasonEnds: day('season_ends'),
    kind: itemKind('kind').notNull().default('series'),
    // As the studio wrote it; min/max in whole hryvnias for the price index, null for other currencies.
    priceText: text('price_text'),
    priceMin: integer('price_min'),
    priceMax: integer('price_max'),
    availability: itemAvailability('availability').notNull().default('unknown'),
    availabilityText: text('availability_text'),
    // Latest day the item was confirmed: the post, a dated note of the studio, a shop read that said «in stock».
    confirmedAt: day('confirmed_at'),
    // Our own words (never the studio's text copied): what it is, what the photo shows, how to order.
    description: text('description'),
    photoFact: text('photo_fact'),
    terms: text('terms'),
    embed: text('embed'),
    // The post was deleted or the product left the shop.
    sourceGone: boolean('source_gone').notNull().default(false),
    visibility: studioVisibility('visibility').notNull().default('hidden'),
    hiddenReason: itemHiddenReason('hidden_reason'),
    lastCheckedAt: ts('last_checked_at'),
    // Internal: scan frames, the check note, the scan it came from. Never shown.
    evidence: jsonb('evidence').$type<Record<string, unknown>>(),
    ...withTracking(),
  },
  (t) => [
    uniqueIndex('items_studio_slug_uq').on(t.studioId, t.slug),
    uniqueIndex('items_studio_source_key_uq').on(t.studioId, t.sourceKey),
    index('items_category_visibility_idx').on(t.category, t.visibility),
  ],
)

// Every check of an item: the weekly Instagram pass and the daily shop read.
export const itemChecks = app.table(
  'item_checks',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    checkedAt: ts('checked_at').notNull().defaultNow(),
    by: text('by'),
    postAlive: boolean('post_alive'),
    signal: itemSignal('signal').notNull().default('none'),
    priceSeen: text('price_seen'),
    note: text('note'),
  },
  (t) => [index('item_checks_item_idx').on(t.itemId, t.checkedAt)],
)
