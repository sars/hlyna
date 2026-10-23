import { and, eq, inArray, sql } from 'drizzle-orm'

import { events } from '../schema'
import { addEvent, addMessage, getPresence, listMessages, setStatus, setTgMessageId, updateConversation, type ChatDb, type Conversation } from './store'
import { TEXT } from './texts'
import type { TgKeyboard, Transport } from './types'

// The hand-over between the assistant, the owner in Telegram and the visitor: head messages, relays, status changes.
// Every status change writes a system line into the thread so the page can show it.

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** The buttons follow the status: closed → only the panel link; a person in → hand back or close; else take or close. */
export const headKeyboard = (c: Pick<Conversation, 'id' | 'status'>, t: Transport): TgKeyboard =>
  c.status === 'closed'
    ? [[{ text: '🔗 В панелі', url: t.panelUrl(c.id) }]]
    : [
        [
          ...(c.status !== 'human' ? [{ text: '🙋 Взяти', callback_data: `ch:t:${c.id}` }] : [{ text: '🤖 Повернути помічнику', callback_data: `ch:a:${c.id}` }]),
          { text: '🗄 Завершити', callback_data: `ch:x:${c.id}` },
        ],
        [{ text: '🔗 В панелі', url: t.panelUrl(c.id) }],
      ]

const STATUS_LINE: Record<string, string> = { ai: 'відповідає помічник', waiting: 'чекає людину', human: 'відповідає людина', closed: 'завершено' }
const stamp = () => new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', dateStyle: 'short', timeStyle: 'short' }).format(new Date())

/** Telegram follows the status: the head gets a status line and the right buttons; earlier notes (hand-over, lead) get the same buttons. */
export async function syncTelegram(db: ChatDb, c: Conversation, t: Transport, who?: string) {
  if (!c.tgHeadMessageId) return
  const first = (await listMessages(db, c.id, { limit: 1 }))[0]?.text ?? ''
  const keyboard = headKeyboard(c, t)
  const line = `— ${STATUS_LINE[c.status] ?? c.status}${who ? ` (${who})` : ''} (${stamp()})`
  await t.editOwnerMessage(c.tgHeadMessageId, `${headText(c, first)}\n${line}`, keyboard).catch(() => {})
  const notes = await db
    .select({ data: events.data })
    .from(events)
    .where(and(eq(events.conversationId, c.id), sql`${events.data} ? 'tgMessageId'`, inArray(events.type, ['handoff', 'business'])))
  for (const n of notes) {
    const id = Number((n.data as { tgMessageId?: number } | null)?.tgMessageId)
    if (id) await t.editOwnerKeyboard(id, keyboard).catch(() => {})
  }
}

const KIND_LABEL: Record<string, string> = { profile: 'профіль студії', business: 'для бізнесу', classes: 'майстер-класи', home: 'головна', other: 'сторінка' }

/** How a thread is named in a list: the studio, «Майстер-класи · Львів», «Для бізнесу», «Головна». */
export function threadLabel(kind: string, context: Record<string, unknown> | null | undefined, page: string) {
  const ctx = (context ?? {}) as { studioName?: string; city?: string }
  if (kind === 'profile' && ctx.studioName) return ctx.studioName
  if (kind === 'classes') return `Майстер-класи${ctx.city ? ` · ${ctx.city}` : ''}`
  if (kind === 'business') return 'Для бізнесу'
  if (kind === 'home') return 'Головна'
  return ctx.city ?? page
}

export function headText(c: Conversation, first: string) {
  const ctx = (c.context ?? {}) as { studioName?: string; city?: string }
  return [
    `💬 Чат #${c.id} · ${KIND_LABEL[c.kind] ?? c.kind}${ctx.studioName ? ` · ${ctx.studioName}` : ''}${ctx.city ? ` · ${ctx.city}` : ''}`,
    `Сторінка: ${c.page}`,
    '',
    `👤 ${clip(first, 1500)}`,
    '',
    'Відповідайте через Reply на це чи будь-яке повідомлення розмови; /done повертає її помічнику.',
  ].join('\n')
}

/** The head message of a conversation in the owner's chat; created once, on the first visitor message. */
export async function ensureHead(db: ChatDb, c: Conversation, t: Transport, first: string): Promise<Conversation> {
  if (c.tgHeadMessageId) return c
  const id = await t.sendToOwner(headText(c, first), { keyboard: headKeyboard(c, t) })
  if (!id) return c
  return updateConversation(db, c.id, { tgHeadMessageId: id })
}

/** A visitor's message copied to the owner under the head (while a person is in, or asked for). */
export async function relayVisitor(db: ChatDb, c: Conversation, messageId: number, text: string, t: Transport, via: 'site' | 'telegram') {
  if (!c.tgHeadMessageId) return
  const id = await t.sendToOwner(`👤${via === 'telegram' ? ' (Telegram)' : ''} ${clip(text, 3500)}`, { replyTo: c.tgHeadMessageId })
  if (id) await setTgMessageId(db, messageId, id)
}

/** The visitor asked for a person (or the assistant decided so). Returns what the assistant should tell them. */
export async function requestHuman(db: ChatDb, c: Conversation, reason: string, t: Transport, first: string) {
  const presence = await getPresence(db)
  if (c.status === 'human') return { status: c.status, online: presence.online, say: TEXT.waitingOnline }
  let conv = await ensureHead(db, c, t, first)
  if (conv.status !== 'waiting') conv = await setStatus(db, conv.id, 'waiting', { reason })
  const recent = await listMessages(db, conv.id, { limit: 6 })
  const lines = recent.filter((m) => m.role !== 'system').map((m) => `${m.role === 'visitor' ? '👤' : m.role === 'human' ? '🧑' : '🤖'} ${clip(m.text, 400)}`)
  const text = [`🙋 Чат #${conv.id}: просить людину${reason ? ` — ${clip(reason, 300)}` : ''}`, '', ...lines].join('\n')
  const id = await t.sendToOwner(text, { replyTo: conv.tgHeadMessageId ?? undefined, keyboard: headKeyboard(conv, t) })
  await addEvent(db, conv.id, 'handoff', { reason, tgMessageId: id, online: presence.online })
  // Offline: the contact is asked for right here, once (the nudge in service.ts then stays quiet).
  if (!presence.online && !conv.contact && !conv.contactAskedAt) await updateConversation(db, conv.id, { contactAskedAt: new Date().toISOString() })
  const say = presence.online ? TEXT.waitingOnline : `${TEXT.waitingOffline} ${conv.contact ? '' : TEXT.askContact}`.trim()
  return { status: 'waiting' as const, online: presence.online, say }
}

/** «Взяти» in Telegram, or the first human reply: the person is in. */
export async function takeOver(db: ChatDb, c: Conversation, t: Transport, who?: string) {
  if (c.status === 'human') return c
  const conv = await setStatus(db, c.id, 'human', who ? { who } : undefined)
  await addMessage(db, conv.id, 'system', TEXT.humanJoined)
  if (conv.visitorTgChatId) await t.sendTo(conv.visitorTgChatId, TEXT.humanJoined)
  await syncTelegram(db, conv, t, who)
  return conv
}

/** A person's reply from Telegram lands in the thread (and in the visitor's Telegram, if linked). */
export async function humanReply(db: ChatDb, c: Conversation, text: string, t: Transport, tgMessageId?: number, who?: string) {
  const conv = c.status === 'human' ? c : await takeOver(db, c, t, who)
  const m = await addMessage(db, conv.id, 'human', text, { tgMessageId: tgMessageId ?? null, meta: { via: 'telegram', ...(who ? { who } : {}) } })
  if (conv.visitorTgChatId) await t.sendTo(conv.visitorTgChatId, text)
  return m
}

/** /done or «Повернути помічнику»: the assistant answers again. */
export async function handBack(db: ChatDb, c: Conversation, t: Transport) {
  if (c.status === 'ai') return c
  const conv = await setStatus(db, c.id, 'ai')
  await addMessage(db, conv.id, 'system', TEXT.humanLeft)
  if (conv.visitorTgChatId) await t.sendTo(conv.visitorTgChatId, TEXT.humanLeft)
  await syncTelegram(db, conv, t)
  return conv
}

export async function closeConversation(db: ChatDb, c: Conversation, t: Transport) {
  if (c.status === 'closed') return c
  const conv = await setStatus(db, c.id, 'closed')
  await addMessage(db, conv.id, 'system', TEXT.closed)
  if (conv.visitorTgChatId) await t.sendTo(conv.visitorTgChatId, TEXT.closed)
  await syncTelegram(db, conv, t)
  return conv
}

/** «Продовжити в Telegram»: the visitor opened the bot with the conversation's id. */
export async function linkTelegram(db: ChatDb, c: Conversation, chatId: number, t: Transport, siteUrl: string) {
  const conv = await updateConversation(db, c.id, { visitorTgChatId: chatId, contactType: c.contactType ?? 'telegram', contact: c.contact ?? `tg:${chatId}` })
  await addMessage(db, conv.id, 'system', TEXT.telegramLinked)
  await addEvent(db, conv.id, 'telegram_linked', { chatId })
  await t.sendTo(chatId, TEXT.tgWelcome(siteUrl))
  const withHead = await ensureHead(db, conv, t, (await listMessages(db, conv.id, { limit: 1 }))[0]?.text ?? '')
  if (withHead.tgHeadMessageId) {
    const id = await t.sendToOwner(`📱 Чат #${conv.id}: відвідувач продовжує в Telegram. Reply сюди дійде йому в Telegram.`, { replyTo: withHead.tgHeadMessageId })
    if (id) await addEvent(db, conv.id, 'note', { tgMessageId: id })
  }
  return withHead
}

/** A business lead: one loud note to the owner under the head, once per conversation. */
export async function flagBusiness(db: ChatDb, c: Conversation, text: string, t: Transport) {
  if ((c.context as { business?: boolean } | null)?.business) return c
  const conv = await updateConversation(db, c.id, { context: { ...(c.context ?? {}), business: true } })
  const presence = await getPresence(db)
  const id = await t.sendToOwner(`🏢 Чат #${conv.id}: схоже на бізнес-клієнта${presence.online ? '' : ' (ви офлайн)'}\n\n👤 ${clip(text, 600)}\n\n«Взяти» — і ви в розмові; помічник тим часом відповідає сам.`, { replyTo: conv.tgHeadMessageId ?? undefined, keyboard: headKeyboard(conv, t) })
  await addEvent(db, conv.id, 'business', { tgMessageId: id })
  return conv
}

export async function saveContact(db: ChatDb, c: Conversation, type: string, value: string, t: Transport) {
  const conv = await updateConversation(db, c.id, { contactType: type, contact: value })
  await addEvent(db, conv.id, 'contact', { type })
  if (conv.tgHeadMessageId) {
    const id = await t.sendToOwner(`📇 Чат #${conv.id}: контакт — ${type}: ${clip(value, 200)}`, { replyTo: conv.tgHeadMessageId })
    if (id) await addEvent(db, conv.id, 'note', { tgMessageId: id })
  }
  return conv
}
