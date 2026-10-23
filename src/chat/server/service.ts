import { runTurn, type TurnResult } from './engine'
import { closeConversation, ensureHead, handBack, humanReply, linkTelegram, relayVisitor, requestHuman, saveContact, takeOver, threadLabel } from './handoff'
import {
  addMessage,
  bumpUsage,
  createConversation,
  findByTgMessageId,
  findByVisitorTgChat,
  findOpenByVisitor,
  openThreads,
  getById,
  getByPublicId,
  getPresence,
  getTranscript,
  listConversations,
  listMessages,
  setOwnerManual,
  setStatus,
  touchOwner,
  updateConversation,
  type Conversation,
  type Message,
} from './store'
import { MESSAGE_MAX, TEXT } from './texts'
import type { ChatConfig, ToolDef } from './types'

// The module's front door: one object the routes, the Telegram webhook and the panel call. createChat(config) wires
// the engine, the hand-over and the store together; the site passes its tools, prompt and Telegram transport.

export const CONTACT_NUDGE_MS = 5 * 60_000
const CONVERSATION_MAX_MESSAGES = 60

export type SendResult = { visitor: Message; assistant: Message | null; conversation: Conversation; limited?: boolean }

export function createChat(cfg: ChatConfig) {
  const { db, transport } = cfg
  const log = cfg.log ?? ((m: string) => console.error(m))

  // Tools the module provides itself: hand over to a person, keep a contact.
  const builtin = (c: Conversation, first: string): ToolDef[] => [
    {
      name: 'call_human',
      description:
        'Передати розмову людині з Глини. Викликай, коли відвідувач просить людину; хоче домовитися про конкретне замовлення (партія, корпоратив, логотип); питає ціну чи умови, яких немає в даних; скаржиться; або ти двічі не зміг відповісти по суті. Повертає, чи людина онлайн, і текст, який треба передати відвідувачу.',
      parameters: { type: 'object', properties: { reason: { type: 'string', description: 'Коротко, навіщо людина (для неї, не для відвідувача)' } }, required: ['reason'], additionalProperties: false },
      run: async (args, ctx) => {
        const r = await requestHuman(ctx.db, await refresh(ctx.conversation), String(args.reason ?? ''), transport, first)
        return { status: r.status, humanOnline: r.online, tellVisitor: r.say }
      },
    },
    {
      name: 'save_contact',
      description: 'Записати контакт відвідувача, коли він його назвав: телефон, Telegram, Viber, WhatsApp або email. Один виклик на контакт.',
      parameters: {
        type: 'object',
        properties: { type: { type: 'string', enum: ['phone', 'telegram', 'viber', 'whatsapp', 'email', 'other'] }, value: { type: 'string' } },
        required: ['type', 'value'],
        additionalProperties: false,
      },
      run: async (args, ctx) => {
        const value = String(args.value ?? '').trim().slice(0, 200)
        if (value.replace(/[^\p{L}\p{N}]/gu, '').length < 4) return { ok: false, error: 'Контакт надто короткий, перепитай.' }
        await saveContact(ctx.db, await refresh(ctx.conversation), String(args.type ?? 'other'), value, transport)
        return { ok: true, tellVisitor: TEXT.contactSaved }
      },
    },
  ]
  const refresh = async (c: Conversation) => (await getById(db, c.id)) ?? c

  async function telegramLink(c: Conversation) {
    const u = await transport.botUsername()
    return u ? `https://t.me/${u}?start=c_${c.publicId}` : null
  }

  /** The visitor's open thread for this context (a studio, classes in a city, business…), or a new one; `fresh` always starts one. */
  async function open(visitorId: string, page: { threadKey: string; page: string; kind: string; context?: Record<string, unknown>; ipHash?: string | null; fresh?: boolean }) {
    const existing = page.fresh ? null : await findOpenByVisitor(db, visitorId, page.threadKey)
    if (existing) {
      if (existing.lastPage !== page.page) return updateConversation(db, existing.id, { lastPage: page.page, context: { ...(existing.context ?? {}), ...(page.context ?? {}) } })
      return existing
    }
    return createConversation(db, { visitorId, ...page })
  }

  async function current(visitorId: string, threadKey: string) {
    const c = await findOpenByVisitor(db, visitorId, threadKey)
    if (!c) return null
    return { conversation: c, messages: await listMessages(db, c.id) }
  }

  /** The visitor wrote. Relays to the person when one is in; otherwise the assistant answers (streamed through onDelta). */
  async function send(c0: Conversation, text: string, opts: { ip: string; via: 'site' | 'telegram'; page?: string; onDelta?: (t: string) => void; onVisitor?: (m: Message) => void }): Promise<SendResult> {
    const clean = text.trim().slice(0, MESSAGE_MAX)
    let c = c0.status === 'closed' ? await setStatus(db, c0.id, 'ai', { reopened: true }) : c0
    if (opts.page && opts.page !== c.lastPage) c = await updateConversation(db, c.id, { lastPage: opts.page })
    const before = await listMessages(db, c.id, { limit: CONVERSATION_MAX_MESSAGES + 1 })
    const visitor = await addMessage(db, c.id, 'visitor', clean, { meta: { via: opts.via, page: opts.page ?? c.lastPage } })
    opts.onVisitor?.(visitor)
    const first = before.find((m) => m.role === 'visitor')?.text ?? clean
    c = await ensureHead(db, c, transport, first)

    if (before.filter((m) => m.role === 'visitor').length >= CONVERSATION_MAX_MESSAGES) {
      const assistant = await addMessage(db, c.id, 'assistant', TEXT.limit)
      return { visitor, assistant, conversation: c, limited: true }
    }

    if (c.status === 'human' || c.status === 'waiting') {
      await relayVisitor(db, c, visitor.id, clean, transport, opts.via)
      const nudged = await nudge(c)
      return { visitor, assistant: nudged, conversation: c }
    }

    const presence = await getPresence(db)
    const others = (await openThreads(db, c.visitorId)).filter((o) => o.id !== c.id && o.first).slice(0, 3)
    const context = await cfg.context(c, { presenceOnline: presence.online, otherThreads: others.map((o) => ({ page: o.page ?? '', first: o.first ?? '' })) })
    let turn: TurnResult
    try {
      turn = await runTurn(
        { db, llm: cfg.llm, model: cfg.model, instructions: cfg.instructions, context, tools: [...builtin(c, first), ...cfg.tools], ctx: { conversation: c, ip: opts.ip, via: opts.via }, onDelta: opts.onDelta, log },
        before,
        clean,
      )
    } catch (e) {
      log(`chat model error: ${String(e).slice(0, 300)}`)
      const fresh = await refresh(c)
      const assistant = await addMessage(db, c.id, 'assistant', TEXT.modelDown, { meta: { error: true } })
      opts.onDelta?.(TEXT.modelDown)
      return { visitor, assistant, conversation: fresh }
    }
    const fresh = await refresh(c)
    const answer = turn.text || (turn.toolCalls.some((t) => t.name === 'call_human') ? TEXT.waitingOffline : '')
    const assistant = answer
      ? await addMessage(db, c.id, 'assistant', answer, { meta: { tools: turn.toolCalls.map((t) => ({ name: t.name, ms: t.ms, args: t.args })), usage: turn.usage, rounds: turn.rounds } })
      : null
    await bumpUsage(db, c.id, turn.usage)
    if (!turn.text && answer) opts.onDelta?.(answer)
    return { visitor, assistant, conversation: fresh }
  }

  /** Handed over, nobody answered for five minutes, no contact yet: the assistant asks for one, once. */
  async function nudge(c0: Conversation): Promise<Message | null> {
    const c = await refresh(c0)
    if (c.status !== 'waiting' || c.contact || c.contactAskedAt || !c.handoffAt) return null
    const presence = await getPresence(db)
    if (presence.online && Date.now() - new Date(c.handoffAt).getTime() < CONTACT_NUDGE_MS) return null
    await updateConversation(db, c.id, { contactAskedAt: new Date().toISOString() })
    return addMessage(db, c.id, 'assistant', TEXT.askContact, { meta: { nudge: true } })
  }

  async function contact(c: Conversation, type: string, value: string) {
    const v = value.trim().slice(0, 200)
    if (v.replace(/[^\p{L}\p{N}]/gu, '').length < 4) return null
    const conv = await saveContact(db, c, type, v, transport)
    const m = await addMessage(db, conv.id, 'assistant', TEXT.contactSaved, { meta: { contact: true } })
    return { conversation: conv, message: m }
  }

  // ---------- Telegram: the owner's replies and buttons, and visitors who continued in Telegram

  type Msg = { message_id: number; chat: { id: number }; text?: string; reply_to_message?: { message_id: number; text?: string } }
  type Update = { callback_query?: { id: string; from: { id: number }; data?: string; message?: Msg }; message?: Msg & { from?: { id: number } } }

  /** Returns true when the update was about the chat (so the site's webhook stops there). */
  async function handleTelegramUpdate(update: Update, ownerChatId: string, siteUrl: string): Promise<boolean> {
    const cq = update.callback_query
    if (cq?.data?.startsWith('ch:')) {
      const [, action, raw] = cq.data.split(':')
      const c = await getById(db, Number(raw))
      if (!c) {
        await transport.answerCallback(cq.id, 'Розмову не знайдено')
        return true
      }
      if (String(cq.from.id) !== ownerChatId && String(cq.message?.chat.id) !== ownerChatId) {
        await transport.answerCallback(cq.id)
        return true
      }
      await touchOwner(db)
      if (action === 't') {
        await takeOver(db, c, transport)
        await transport.answerCallback(cq.id, 'Ви в розмові. Відповідайте через Reply.')
      } else if (action === 'a') {
        await handBack(db, c, transport)
        await transport.answerCallback(cq.id, 'Повернуто помічнику')
      } else if (action === 'x') {
        await closeConversation(db, c, transport)
        await transport.answerCallback(cq.id, 'Завершено')
      } else await transport.answerCallback(cq.id)
      return true
    }
    const m = update.message
    if (!m?.text) return false
    const text = m.text.trim()

    if (String(m.chat.id) === ownerChatId) {
      await touchOwner(db)
      if (/^\/(online|offline|auto)\b/.test(text)) {
        const mode = text.slice(1).split(/\s/)[0] as 'online' | 'offline' | 'auto'
        await setOwnerManual(db, mode === 'auto' ? null : mode)
        await transport.sendToOwner(mode === 'auto' ? 'Присутність знову за активністю: онлайн 15 хвилин після вашого повідомлення.' : mode === 'online' ? 'Позначено: ви онлайн, доки не напишете /offline або /auto.' : 'Позначено: ви офлайн. Помічник одразу проситиме контакт.')
        return true
      }
      const replyId = m.reply_to_message?.message_id
      if (!replyId) return false
      const c = await findByTgMessageId(db, replyId)
      if (!c) return false
      if (text === '/done') {
        await handBack(db, c, transport)
        await transport.sendToOwner(`Чат #${c.id} повернуто помічнику.`, { replyTo: c.tgHeadMessageId ?? undefined })
        return true
      }
      if (text === '/close') {
        await closeConversation(db, c, transport)
        return true
      }
      await humanReply(db, c, text, transport, m.message_id)
      return true
    }

    // A visitor's own chat with the bot.
    const start = text.match(/^\/start\s+c_([A-Za-z0-9]{16,40})$/)
    if (start) {
      const c = await getByPublicId(db, start[1]!)
      if (!c || c.status === 'closed') {
        await transport.sendTo(m.chat.id, TEXT.tgStranger(siteUrl))
        return true
      }
      await linkTelegram(db, c, m.chat.id, transport, siteUrl)
      return true
    }
    const linked = await findByVisitorTgChat(db, m.chat.id)
    if (!linked) {
      if (!text.startsWith('/')) await transport.sendTo(m.chat.id, TEXT.tgStranger(siteUrl))
      return true
    }
    if (text.length > MESSAGE_MAX) {
      await transport.sendTo(m.chat.id, TEXT.tgTooLong)
      return true
    }
    if (await cfg.rateLimited(`chat:tg:${m.chat.id}`, 20, 10 * 60_000)) {
      await transport.sendTo(m.chat.id, TEXT.limit)
      return true
    }
    const r = await send(linked, text, { ip: `tg:${m.chat.id}`, via: 'telegram' })
    if (r.assistant) await transport.sendTo(m.chat.id, r.assistant.text)
    return true
  }

  return {
    db,
    open,
    current,
    send,
    nudge,
    contact,
    telegramLink,
    /** The visitor's open threads, named for a list (newest first). */
    threads: async (visitorId: string) => (await openThreads(db, visitorId)).map((o) => ({ id: o.publicId, thread: o.threadKey, page: o.page ?? '/', label: threadLabel(o.kind, o.context, o.page ?? '/'), at: o.updatedAt, count: o.count })),
    presence: () => getPresence(db),
    messagesAfter: (c: Conversation, afterId: number) => listMessages(db, c.id, { afterId }),
    get: (id: number) => getById(db, id),
    byPublicId: (publicId: string) => getByPublicId(db, publicId),
    handleTelegramUpdate,
    limit: cfg.rateLimited,
    list: listConversations.bind(null, db),
    transcript: getTranscript.bind(null, db),
  }
}

export type Chat = ReturnType<typeof createChat>
