import { bigint, boolean, index, integer, jsonb, pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core'

// The chat module's own tables, in their own Postgres schema `chat`, so the module can be dropped or moved as a whole.
// It knows nothing about the catalogue: the site connects through src/server/chatAdapter.ts.
export const chat = pgSchema('chat')

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

/** ai: the assistant answers · human: a person has joined · waiting: handed over, nobody has answered yet · closed. */
export const CHAT_STATUS = ['ai', 'waiting', 'human', 'closed'] as const
export type ChatStatus = (typeof CHAT_STATUS)[number]
export const chatStatus = chat.enum('chat_status', CHAT_STATUS)

/** visitor: the person on the site · assistant: the model · human: a person answering from Telegram · system: status lines shown in the thread. */
export const CHAT_ROLE = ['visitor', 'assistant', 'human', 'system'] as const
export type ChatRole = (typeof CHAT_ROLE)[number]
export const chatRole = chat.enum('chat_role', CHAT_ROLE)

export const conversations = chat.table(
  'conversations',
  {
    id: serial('id').primaryKey(),
    /** Unguessable id the browser and the Telegram deep link use (never the serial). */
    publicId: text('public_id').notNull().unique(),
    /** Cookie id of the visitor; one open conversation per visitor and thread. */
    visitorId: text('visitor_id').notNull(),
    /** What the thread is about: a studio (profile:<slug>), classes in a city, business, home… (set by the host). */
    threadKey: text('thread_key').notNull().default(''),
    status: chatStatus('status').notNull().default('ai'),
    /** Page the conversation started on, and the kind of opener it got (profile, business, classes, home…). */
    page: text('page').notNull(),
    kind: text('kind').notNull(),
    /** Last page the visitor wrote from (the assistant is told where the visitor is). */
    lastPage: text('last_page'),
    context: jsonb('context').$type<Record<string, unknown>>(),
    contactType: text('contact_type'),
    contact: text('contact'),
    /** The request created from this conversation (app.requests.id), if any. */
    requestId: integer('request_id'),
    /** Telegram message ids in the owner's chat: the head message of the thread. */
    tgHeadMessageId: bigint('tg_head_message_id', { mode: 'number' }),
    /** The visitor's own Telegram chat after «Продовжити в Telegram». */
    visitorTgChatId: bigint('visitor_tg_chat_id', { mode: 'number' }),
    humanJoinedAt: ts('human_joined_at'),
    handoffAt: ts('handoff_at'),
    contactAskedAt: ts('contact_asked_at'),
    lastVisitorAt: ts('last_visitor_at'),
    lastHumanAt: ts('last_human_at'),
    closedAt: ts('closed_at'),
    ipHash: text('ip_hash'),
    turns: integer('turns').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('chat_conversations_visitor_idx').on(t.visitorId, t.threadKey, t.status), index('chat_conversations_created_idx').on(t.createdAt), index('chat_conversations_head_idx').on(t.tgHeadMessageId)],
)

export const messages = chat.table(
  'messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: chatRole('role').notNull(),
    text: text('text').notNull(),
    /** Tool calls the assistant made for this answer, token counts, where a human message came from. */
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    /** Telegram message id of the copy in the owner's chat (a Reply to it addresses this conversation). */
    tgMessageId: bigint('tg_message_id', { mode: 'number' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('chat_messages_conversation_idx').on(t.conversationId, t.id), index('chat_messages_tg_idx').on(t.tgMessageId)],
)

export const events = chat.table(
  'events',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('chat_events_conversation_idx').on(t.conversationId, t.id)],
)

/** Module state that is not a conversation: the owner's presence (`owner`). */
export const state = chat.table('state', {
  key: text('key').primaryKey(),
  online: boolean('online'),
  /** 'online' | 'offline' set by hand in Telegram; null = derived from activity. */
  manual: text('manual'),
  lastActiveAt: ts('last_active_at'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})
