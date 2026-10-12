import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { STUDIO_FORMATS } from '../../../shared/options'
import {
  app,
  confidence,
  emptyTextArray,
  geoPrecision,
  mediaStatus,
  studioStatus,
  studioType,
  studioVisibility,
  withTracking,
} from './base'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

export const cities = app.table('cities', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  oblast: text('oblast'),
  // «у Києві», «в Одесі»: the locative the site writes in leads; null → «у м. <name>»
  locative: text('locative'),
  population: integer('population'),
  isOver100k: boolean('is_over_100k'),
  ...withTracking(),
})

// Old city slugs, so a rename keeps every old URL working (301 to the new one).
export const citySlugHistory = app.table('city_slug_history', {
  oldSlug: text('old_slug').primaryKey(),
  cityId: integer('city_id')
    .notNull()
    .references(() => cities.id, { onDelete: 'cascade' }),
  changedAt: ts('changed_at').notNull().defaultNow(),
})

// One wide row per studio: every field is 1:1 with the profile. Ordered string lists are text[];
// prices and photos have their own tables (per-line source/date, per-photo order).
export const studios = app.table(
  'studios',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    // How people call the studio, for titles, slugs, cards and the H1 (≤ 40 chars); null when `name` already is.
    shortName: text('short_name'),
    type: studioType('type'),
    status: studioStatus('status'),
    visibility: studioVisibility('visibility').notNull().default('hidden'),
    confidence: confidence('confidence'),
    sourceId: text('source_id'),
    revision: integer('revision').notNull().default(1),

    cityId: integer('city_id').references(() => cities.id, { onDelete: 'set null' }),
    oblast: text('oblast'),
    address: text('address'),
    geoLat: doublePrecision('geo_lat'),
    geoLng: doublePrecision('geo_lng'),
    geoPrecision: geoPrecision('geo_precision'),
    geoGeocodedAt: ts('geo_geocoded_at'),
    geoSource: text('geo_source'),

    summary: text('summary'),
    publicDescription: text('public_description'),
    recentNote: text('recent_note'),
    descriptionInternal: text('description_internal'),
    ownerAbout: text('owner_about'),
    ownerNews: text('owner_news'),
    ownerQuote: text('owner_quote'),
    ownerQuoteApproved: boolean('owner_quote_approved'),

    instagram: text('instagram'),
    website: text('website'),
    facebook: text('facebook'),
    phone: text('phone'),
    email: text('email'),

    b2bMinOrder: text('b2b_min_order'),
    b2bLeadTime: text('b2b_lead_time'),
    b2bFoodSafe: boolean('b2b_food_safe'),
    b2bDishwasherSafe: boolean('b2b_dishwasher_safe'),
    b2bWorksWithHoreca: boolean('b2b_works_with_horeca'),
    b2bWorksWithCorporate: boolean('b2b_works_with_corporate'),

    // Timestamps kept as timestamptz (Payload stores them so); the design's `date` would lose the time part.
    activityLastPostDate: ts('activity_last_post_date'),
    activityPosts90d: integer('activity_posts_90d'),
    activityFollowers: integer('activity_followers'),
    activityWebsiteAlive: boolean('activity_website_alive'),
    activityEtsySales: integer('activity_etsy_sales'),
    activityCheckedAt: ts('activity_checked_at'),

    consentPhotos: boolean('consent_photos'),
    consentRequests: boolean('consent_requests'),
    consentContactedAt: ts('consent_contacted_at'),
    consentNotes: text('consent_notes'),

    ownerVerified: boolean('owner_verified'),

    alternateNames: text('alternate_names').array().notNull().default(emptyTextArray),
    formats: text('formats').array().notNull().default(emptyTextArray),
    services: text('services').array().notNull().default(emptyTextArray),
    products: text('products').array().notNull().default(emptyTextArray),
    salesChannels: text('sales_channels').array().notNull().default(emptyTextArray),
    otherLinks: text('other_links').array().notNull().default(emptyTextArray),
    sources: text('sources').array().notNull().default(emptyTextArray),
    instagramPosts: text('instagram_posts').array().notNull().default(emptyTextArray),
    b2bLogoMethods: text('b2b_logo_methods').array().notNull().default(emptyTextArray),

    ...withTracking(),
  },
  (t) => [
    uniqueIndex('studios_slug_uq').on(t.slug),
    uniqueIndex('studios_source_id_uq').on(t.sourceId),
    index('studios_city_idx').on(t.cityId),
    index('studios_visibility_idx').on(t.visibility),
    index('studios_horeca_idx').on(t.b2bWorksWithHoreca),
    index('studios_consent_requests_idx').on(t.consentRequests),
    index('studios_formats_gin').using('gin', t.formats),
    check(
      'studios_formats_known',
      sql.raw(`${'"formats"'} <@ ARRAY[${STUDIO_FORMATS.map((f) => `'${f}'`).join(',')}]::text[]`),
    ),
    check('studios_instagram_posts_max3', sql.raw('cardinality("instagram_posts") <= 3')),
  ],
)

export const studioPrices = app.table(
  'studio_prices',
  {
    id: serial('id').primaryKey(),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    source: text('source'),
    dateText: text('date_text'),
  },
  (t) => [index('studio_prices_studio_idx').on(t.studioId, t.position)],
)

export const studioPhotos = app.table(
  'studio_photos',
  {
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    mediaId: integer('media_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.studioId, t.mediaId] })],
)

export const studioSlugHistory = app.table('studio_slug_history', {
  oldSlug: text('old_slug').primaryKey(),
  studioId: integer('studio_id')
    .notNull()
    .references(() => studios.id, { onDelete: 'cascade' }),
  changedAt: ts('changed_at').notNull().defaultNow(),
})

export const media = app.table(
  'media',
  {
    id: serial('id').primaryKey(),
    fileName: text('file_name').notNull(),
    mime: text('mime'),
    size: integer('size'),
    width: integer('width'),
    height: integer('height'),
    sha256: text('sha256'),
    alt: text('alt'),
    caption: text('caption'),
    focalX: doublePrecision('focal_x'),
    focalY: doublePrecision('focal_y'),
    // {thumbnail: {file, width, height, size, mime}, square: …, og: …} — Payload's seven image sizes
    variants: jsonb('variants').$type<Record<string, { file: string | null; width: number | null; height: number | null; size: number | null; mime: string | null }>>(),
    status: mediaStatus('status').notNull().default('active'),
    uploadedBy: text('uploaded_by'),
    ...withTracking(),
  },
  (t) => [uniqueIndex('media_file_name_uq').on(t.fileName)],
)
