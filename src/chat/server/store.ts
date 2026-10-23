import { randomBytes } from 'node:crypto'

import { and, desc, eq, gt, lt, ne, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { conversations, events, messages, state, type ChatRole, type ChatStatus } from '../schema'

// Reads and writes of the chat module's tables. Everything the engine, the routes, the Telegram relay and the panel
// know about the database goes through here.

/** Any drizzle node-postgres database: the module does not depend on the site's schema type. */
export type ChatDb = NodePgDatabase<Record<string, unknown>>

export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newPublicId(len = 24) {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length]
  return out
}

export async function createConversation(db: ChatDb, data: { visitorId: string; page: string; kind: string; context?: Record<string, unknown>; ipHash?: string | null }) {
  const [row] = await db
    .insert(conversations)
    .values({ publicId: newPublicId(), visitorId: data.visitorId, page: data.page, lastPage: data.page, kind: data.kind, context: data.context ?? null, ipHash: data.ipHash ?? null })
    .returning()
  return row!
}

export async function findOpenByVisitor(db: ChatDb, visitorId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.visitorId, visitorId), ne(conversations.status, 'closed')))
    .orderBy(desc(conversations.id))
    .limit(1)
  return row ?? null
}

export async function getByPublicId(db: ChatDb, publicId: string) {
  const [row] = await db.select().from(conversations).where(eq(conversations.publicId, publicId)).limit(1)
  return row ?? null
}

export async function getById(db: ChatDb, id: number) {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
  return row ?? null
}

/** The conversation a Telegram message in the owner's chat belongs to: its head message or any relayed message. */
export async function findByTgMessageId(db: ChatDb, tgMessageId: number) {
  const [head] = await db.select().from(conversations).where(eq(conversations.tgHeadMessageId, tgMessageId)).limit(1)
  if (head) return head
  const [m] = await db.select({ conversationId: messages.conversationId }).from(messages).where(eq(messages.tgMessageId, tgMessageId)).limit(1)
  if (m) return getById(db, m.conversationId)
  // Service messages (the handoff note, the Telegram link note) keep their ids in their event.
  const [e] = await db
    .select({ conversationId: events.conversationId })
    .from(events)
    .where(sql`${events.data}->>'tgMessageId' = ${String(tgMessageId)}`)
    .limit(1)
  return e ? getById(db, e.conversationId) : null
}

/** The open conversation of a visitor who continued in Telegram. */
export async function findByVisitorTgChat(db: ChatDb, chatId: number) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.visitorTgChatId, chatId), ne(conversations.status, 'closed')))
    .orderBy(desc(conversations.id))
    .limit(1)
  return row ?? null
}

export async function listMessages(db: ChatDb, conversationId: number, opts: { afterId?: number; limit?: number } = {}) {
  const where = opts.afterId ? and(eq(messages.conversationId, conversationId), gt(messages.id, opts.afterId)) : eq(messages.conversationId, conversationId)
  const rows = await db.select().from(messages).where(where).orderBy(desc(messages.id)).limit(opts.limit ?? 200)
  return rows.reverse()
}

export async function addMessage(db: ChatDb, conversationId: number, role: ChatRole, text: string, extra: { meta?: Record<string, unknown>; tgMessageId?: number | null } = {}) {
  const [row] = await db.insert(messages).values({ conversationId, role, text, meta: extra.meta ?? null, tgMessageId: extra.tgMessageId ?? null }).returning()
  const stamp = role === 'visitor' ? { lastVisitorAt: sql`now()` } : role === 'human' ? { lastHumanAt: sql`now()` } : {}
  await db.update(conversations).set({ updatedAt: sql`now()`, ...stamp }).where(eq(conversations.id, conversationId))
  return row!
}

export async function setTgMessageId(db: ChatDb, messageId: number, tgMessageId: number) {
  await db.update(messages).set({ tgMessageId }).where(eq(messages.id, messageId))
}

export async function addEvent(db: ChatDb, conversationId: number, type: string, data?: Record<string, unknown>) {
  const [row] = await db.insert(events).values({ conversationId, type, data: data ?? null }).returning()
  return row!
}

export async function updateConversation(db: ChatDb, id: number, patch: Partial<typeof conversations.$inferInsert>) {
  const [row] = await db
    .update(conversations)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(conversations.id, id))
    .returning()
  return row!
}

export async function setStatus(db: ChatDb, id: number, status: ChatStatus, data?: Record<string, unknown>) {
  const stamp: Partial<typeof conversations.$inferInsert> =
    status === 'closed' ? { closedAt: sql`now()` as unknown as string } : status === 'human' ? { humanJoinedAt: sql`now()` as unknown as string } : status === 'waiting' ? { handoffAt: sql`now()` as unknown as string } : {}
  const row = await updateConversation(db, id, { status, ...stamp })
  await addEvent(db, id, `status:${status}`, data)
  return row
}

export async function bumpUsage(db: ChatDb, id: number, usage: { input: number; output: number }) {
  await db
    .update(conversations)
    .set({ turns: sql`${conversations.turns} + 1`, inputTokens: sql`${conversations.inputTokens} + ${usage.input}`, outputTokens: sql`${conversations.outputTokens} + ${usage.output}` })
    .where(eq(conversations.id, id))
}

// ---------- the owner's presence

export const PRESENCE_WINDOW_MS = 15 * 60_000

export type Presence = { online: boolean; manual: 'online' | 'offline' | null; lastActiveAt: string | null }

export async function getPresence(db: ChatDb): Promise<Presence> {
  const [row] = await db.select().from(state).where(eq(state.key, 'owner')).limit(1)
  const manual = row?.manual === 'online' || row?.manual === 'offline' ? row.manual : null
  const recent = Boolean(row?.lastActiveAt && Date.now() - new Date(row.lastActiveAt).getTime() < PRESENCE_WINDOW_MS)
  return { online: manual ? manual === 'online' : recent, manual, lastActiveAt: row?.lastActiveAt ?? null }
}

/** Any sign of life from the owner in Telegram counts as presence for the next 15 minutes. */
export async function touchOwner(db: ChatDb) {
  await db
    .insert(state)
    .values({ key: 'owner', lastActiveAt: sql`now()` as unknown as string })
    .onConflictDoUpdate({ target: state.key, set: { lastActiveAt: sql`now()`, updatedAt: sql`now()` } })
}

export async function setOwnerManual(db: ChatDb, manual: 'online' | 'offline' | null) {
  await db
    .insert(state)
    .values({ key: 'owner', manual })
    .onConflictDoUpdate({ target: state.key, set: { manual, updatedAt: sql`now()` } })
}

// ---------- the panel's read-only views

export const PAGE = 50

export async function listConversations(db: ChatDb, f: { status?: ChatStatus | 'open'; before?: number } = {}) {
  const where = [
    f.status === 'open' ? or(eq(conversations.status, 'ai'), eq(conversations.status, 'waiting'), eq(conversations.status, 'human')) : f.status ? eq(conversations.status, f.status) : undefined,
    f.before ? lt(conversations.id, f.before) : undefined,
  ].filter(Boolean)
  const rows = await db
    .select({
      id: conversations.id,
      publicId: conversations.publicId,
      status: conversations.status,
      page: conversations.page,
      kind: conversations.kind,
      contact: conversations.contact,
      requestId: conversations.requestId,
      turns: conversations.turns,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      first: sql<string | null>`(select m.text from chat.messages m where m.conversation_id = ${conversations.id} and m.role = 'visitor' order by m.id limit 1)`,
      count: sql<number>`(select count(*)::int from chat.messages m where m.conversation_id = ${conversations.id})`,
    })
    .from(conversations)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(conversations.id))
    .limit(PAGE + 1)
  return { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE, next: rows.length > PAGE ? rows[PAGE - 1]!.id : null }
}

export async function getTranscript(db: ChatDb, id: number) {
  const conversation = await getById(db, id)
  if (!conversation) return null
  const [msgs, evs] = await Promise.all([listMessages(db, id, { limit: 500 }), db.select().from(events).where(eq(events.conversationId, id)).orderBy(events.id)])
  return { conversation, messages: msgs, events: evs }
}
