import { sql } from 'drizzle-orm'
import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core'

import {
  CHANGE_SET_STATUS,
  CLAIM_STATUS,
  CONFIDENCE,
  DELIVERY_METHODS,
  GEO_PRECISION,
  ITEM_AVAILABILITY,
  ITEM_CATEGORIES,
  ITEM_FULFILLMENT,
  ITEM_HIDDEN_REASONS,
  ITEM_KINDS,
  ITEM_SIGNALS,
  ITEM_SOURCES,
  MEDIA_STATUS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  REQUEST_STATUS,
  REQUEST_WHAT,
  STUDIO_STATUSES,
  STUDIO_TYPES,
  STUDIO_VISIBILITY,
  USER_ROLES,
} from '../../../shared/options'

// Every table of our own data model lives in the Postgres schema `app` (drizzle-kit: schemaFilter ['app']).
export const app = pgSchema('app')

export const studioType = app.enum('studio_type', STUDIO_TYPES)
export const studioStatus = app.enum('studio_status', STUDIO_STATUSES)
export const studioVisibility = app.enum('studio_visibility', STUDIO_VISIBILITY)
export const confidence = app.enum('confidence', CONFIDENCE)
export const geoPrecision = app.enum('geo_precision', GEO_PRECISION)
export const requestWhat = app.enum('request_what', REQUEST_WHAT)
export const requestStatus = app.enum('request_status', REQUEST_STATUS)
export const claimStatus = app.enum('claim_status', CLAIM_STATUS)
export const changeSetStatus = app.enum('change_set_status', CHANGE_SET_STATUS)
export const userRole = app.enum('user_role', USER_ROLES)
export const mediaStatus = app.enum('media_status', MEDIA_STATUS)
export const itemCategory = app.enum('item_category', ITEM_CATEGORIES)
export const itemSource = app.enum('item_source', ITEM_SOURCES)
export const itemKind = app.enum('item_kind', ITEM_KINDS)
export const itemAvailability = app.enum('item_availability', ITEM_AVAILABILITY)
export const itemHiddenReason = app.enum('item_hidden_reason', ITEM_HIDDEN_REASONS)
export const itemSignal = app.enum('item_signal', ITEM_SIGNALS)
export const itemFulfillment = app.enum('item_fulfillment', ITEM_FULFILLMENT)
export const orderStatus = app.enum('order_status', ORDER_STATUS)
export const deliveryMethod = app.enum('delivery_method', DELIVERY_METHODS)
export const paymentMethod = app.enum('payment_method', PAYMENT_METHODS)
export const paymentStatus = app.enum('payment_status', PAYMENT_STATUS)

// Kit convention: who and when on every row. Actor ids are Better Auth user ids (text) or 'script:<name>'.
export const withTracking = () => ({
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
})

export const emptyTextArray = sql`'{}'::text[]`
