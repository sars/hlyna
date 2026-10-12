import { sql } from 'drizzle-orm'
import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core'

import {
  CHANGE_SET_STATUS,
  CLAIM_STATUS,
  CONFIDENCE,
  GEO_PRECISION,
  MEDIA_STATUS,
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

// Kit convention: who and when on every row. Actor ids are Better Auth user ids (text) or 'script:<name>'.
export const withTracking = () => ({
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
})

export const emptyTextArray = sql`'{}'::text[]`
