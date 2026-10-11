import { bigserial, index, integer, jsonb, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { app, changeSetStatus } from './base'
import { studios } from './catalog'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

// Full snapshots of a studio (row + prices + photos) for history and restore. Payload versions migrate here
// with source 'payload-version'.
export const studioRevisions = app.table(
  'studio_revisions',
  {
    id: serial('id').primaryKey(),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    actorId: text('actor_id'),
    source: text('source').notNull(),
    note: text('note'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('studio_revisions_studio_idx').on(t.studioId, t.createdAt)],
)

// Kit-style audit log: who changed what on any entity.
export const auditLog = app.table(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: ts('at').notNull().defaultNow(),
    actorId: text('actor_id'),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    changes: jsonb('changes'),
    source: text('source'),
    requestId: text('request_id'),
  },
  (t) => [index('audit_log_entity_idx').on(t.entity, t.entityId, t.at), index('audit_log_at_idx').on(t.at)],
)

// Owner edits waiting for review (replaces Payload drafts): whitelisted fields only, applied per field.
export const changeSets = app.table(
  'change_sets',
  {
    id: serial('id').primaryKey(),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    authorId: text('author_id'),
    status: changeSetStatus('status').notNull().default('pending'),
    baseRevision: integer('base_revision'),
    proposed: jsonb('proposed').notNull(),
    newMediaIds: integer('new_media_ids').array().notNull().default(sql`'{}'::integer[]`),
    appliedFields: text('applied_fields').array().notNull().default(sql`'{}'::text[]`),
    decidedBy: text('decided_by'),
    decidedAt: ts('decided_at'),
    decisionNote: text('decision_note'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('change_sets_status_idx').on(t.status),
    // one open change set per studio
    uniqueIndex('change_sets_one_pending_uq').on(t.studioId).where(sql`status = 'pending'`),
  ],
)

// Background jobs (kit pattern: SELECT … FOR UPDATE SKIP LOCKED).
export const jobs = app.table(
  'jobs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    kind: text('kind').notNull(),
    payload: jsonb('payload'),
    status: text('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    runAfter: ts('run_after').notNull().defaultNow(),
    lockedAt: ts('locked_at'),
    lastError: text('last_error'),
    createdAt: ts('created_at').notNull().defaultNow(),
    finishedAt: ts('finished_at'),
  },
  (t) => [index('jobs_queue_idx').on(t.status, t.runAfter)],
)

// Runs of import scripts (Instagram, geocoding, tagging) for the panel's status screen.
export const importRuns = app.table('import_runs', {
  id: serial('id').primaryKey(),
  script: text('script').notNull(),
  startedAt: ts('started_at').notNull().defaultNow(),
  finishedAt: ts('finished_at'),
  counts: jsonb('counts'),
  note: text('note'),
})
