import { randomBytes } from 'node:crypto'

import type { Chat } from './service'
import type { Conversation, Message } from './store'
import { MESSAGE_MAX, TEXT } from './texts'

// The module's HTTP surface on web Request/Response, so the host's routes are one line each. Everything the
// browser sees goes through `pub` and `pubMsg`: public ids only, never serial ids or the visitor cookie.

export const COOKIE = 'hl_chat'
const COOKIE_MAX_AGE = 180 * 24 * 3600
const EVENTS_TICK_MS = 1500
const EVENTS_MAX_MS = 10 * 60_000
const DAILY_TURNS = Number(process.env.CHAT_DAILY_TURNS ?? 300)

export type PublicConversation = {
  id: string
  status: Conversation['status']
  kind: string
  hasContact: boolean
  requestId: number | null
  telegram: boolean
  telegramLink: string | null
  humanOnline: boolean
  /** The thread's context key and where the visitor last wrote from. */
  thread: string
  lastPage: string
  /** The visitor's open threads, this one included, newest first. */
  threads: PublicThread[]
}
export type PublicThread = { id: string; thread: string; page: string; label: string; first: string | null; at: string; count: number }
export type PublicMessage = { id: number; role: Message['role']; text: string; at: string }

export const pubMsg = (m: Message): PublicMessage => ({ id: m.id, role: m.role, text: m.text, at: m.createdAt })

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(init.headers ?? {}) } })

export function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
const SSE_HEADERS = { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' }

export type HttpDeps = {
  chat: () => Chat
  enabled: () => boolean
  clientIp: (headers: Headers) => string
  /** Hash for the stored ip (never the ip itself). */
  ipHash: (ip: string) => string
}

export function chatHttp(deps: HttpDeps) {
  const visitorOf = (req: Request) => readCookie(req, COOKIE)
  const newVisitor = () => randomBytes(18).toString('base64url')
  const cookieHeader = (req: Request, id: string) =>
    `${COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${req.url.startsWith('https://') ? '; Secure' : ''}`

  async function pub(c: Conversation): Promise<PublicConversation> {
    const chat = deps.chat()
    const [link, presence, threads] = await Promise.all([chat.telegramLink(c), chat.presence(), chat.threads(c.visitorId)])
    return { id: c.publicId, status: c.status, kind: c.kind, hasContact: Boolean(c.contact), requestId: c.requestId, telegram: Boolean(c.visitorTgChatId), telegramLink: link, humanOnline: presence.online, thread: c.threadKey, lastPage: c.lastPage ?? c.page, threads }
  }

  /** The conversation a request may touch: by public id, and only the visitor whose cookie opened it. */
  async function own(req: Request, publicId: string) {
    const visitor = visitorOf(req)
    if (!visitor) return null
    const c = await deps.chat().byPublicId(publicId)
    return c && c.visitorId === visitor ? c : null
  }

  return {
    /** POST {page, kind, context}: the visitor's open conversation (or a fresh one); sets the visitor cookie. */
    async open(req: Request) {
      if (!deps.enabled()) return json({ error: 'off' }, { status: 503 })
      const body = (await req.json().catch(() => null)) as { page?: string; kind?: string; thread?: string; fresh?: boolean; context?: Record<string, unknown> } | null
      const page = typeof body?.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 300) : '/'
      const kind = typeof body?.kind === 'string' ? body.kind.slice(0, 20) : 'other'
      const threadKey = typeof body?.thread === 'string' ? body.thread.slice(0, 200) : page
      const context = body?.context && typeof body.context === 'object' ? Object.fromEntries(Object.entries(body.context).filter(([k, v]) => /^[a-zA-Z]+$/.test(k) && typeof v === 'string').map(([k, v]) => [k, String(v).slice(0, 200)])) : {}
      const ip = deps.clientIp(req.headers)
      let visitor = visitorOf(req)
      const headers: Record<string, string> = {}
      if (!visitor) {
        visitor = newVisitor()
        headers['set-cookie'] = cookieHeader(req, visitor)
      }
      const c = await deps.chat().open(visitor, { threadKey, page, kind, context, ipHash: deps.ipHash(ip), fresh: body?.fresh === true })
      const messages = await deps.chat().messagesAfter(c, 0)
      return json({ conversation: await pub(c), messages: messages.map(pubMsg) }, { headers })
    },

    /** GET ?thread=<key>: the visitor's open thread for this context, if any (no cookie is set here). */
    async current(req: Request) {
      if (!deps.enabled()) return json({ conversation: null })
      const visitor = visitorOf(req)
      if (!visitor) return json({ conversation: null })
      const threadKey = new URL(req.url).searchParams.get('thread') ?? ''
      const cur = await deps.chat().current(visitor, threadKey)
      // No thread for this page yet: the visitor's other threads still come along, so the panel can list them.
      if (!cur) return json({ conversation: null, threads: await deps.chat().threads(visitor) })
      return json({ conversation: await pub(cur.conversation), messages: cur.messages.map(pubMsg) })
    },

    /** POST {text, page}: streams the assistant's answer as SSE (visitor → delta* → done). */
    async message(req: Request, publicId: string) {
      if (!deps.enabled()) return json({ error: 'off' }, { status: 503 })
      const c = await own(req, publicId)
      if (!c) return json({ error: 'Розмову не знайдено.' }, { status: 404 })
      const body = (await req.json().catch(() => null)) as { text?: string; page?: string } | null
      const text = typeof body?.text === 'string' ? body.text.trim() : ''
      if (!text) return json({ error: 'Порожнє повідомлення.' }, { status: 400 })
      if (text.length > MESSAGE_MAX) return json({ error: TEXT.tgTooLong }, { status: 400 })
      const page = typeof body?.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 300) : undefined
      const ip = deps.clientIp(req.headers)
      const chat = deps.chat()
      const day = new Date().toISOString().slice(0, 10)
      if (await chat.limit(`chat:ip:${ip}`, 20, 10 * 60_000)) return json({ error: TEXT.limit }, { status: 429 })
      if (c.status === 'ai' && (await chat.limit(`chat:day:${day}`, DAILY_TURNS, 24 * 3600_000))) return json({ error: TEXT.modelDown }, { status: 503 })

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const push = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)))
          try {
            const r = await chat.send(c, text, { ip, via: 'site', page, onVisitor: (m) => push('visitor', pubMsg(m)), onDelta: (d) => push('delta', { text: d }) })
            push('done', { assistant: r.assistant ? pubMsg(r.assistant) : null, conversation: await pub(r.conversation) })
          } catch (e) {
            console.error(`chat message error: ${String(e).slice(0, 300)}`)
            push('error', { error: TEXT.modelDown })
          } finally {
            controller.close()
          }
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    },

    /** GET ?after=<message id>: SSE with new messages, status changes and presence; ends after ten minutes. */
    async events(req: Request, publicId: string) {
      if (!deps.enabled()) return json({ error: 'off' }, { status: 503 })
      const c0 = await own(req, publicId)
      if (!c0) return json({ error: 'Розмову не знайдено.' }, { status: 404 })
      const url = new URL(req.url)
      let after = Number(url.searchParams.get('after') ?? 0) || 0
      const chat = deps.chat()
      const encoder = new TextEncoder()
      const started = Date.now()
      let closed = false
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const push = (event: string, data: unknown) => {
            if (!closed) controller.enqueue(encoder.encode(sse(event, data)))
          }
          const stop = () => {
            if (closed) return
            closed = true
            try {
              controller.close()
            } catch {}
          }
          req.signal.addEventListener('abort', stop)
          let last = await pub(c0)
          push('state', last)
          let tick = 0
          while (!closed && Date.now() - started < EVENTS_MAX_MS) {
            await new Promise((r) => setTimeout(r, EVENTS_TICK_MS))
            if (closed) break
            try {
              const c = await chat.get(c0.id)
              if (!c) break
              if (tick++ % 4 === 0) await chat.nudge(c)
              const fresh = await chat.messagesAfter(c, after)
              for (const m of fresh) {
                after = m.id
                push('message', pubMsg(m))
              }
              const now = await pub(c)
              if (JSON.stringify(now) !== JSON.stringify(last)) {
                last = now
                push('state', now)
              }
              if (tick % 10 === 0) controller.enqueue(encoder.encode(': ping\n\n'))
            } catch (e) {
              console.error(`chat events error: ${String(e).slice(0, 200)}`)
              break
            }
          }
          stop()
        },
        cancel() {
          closed = true
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    },

    /** GET: one of the visitor's threads with its messages (switching threads in place). */
    async get(req: Request, publicId: string) {
      if (!deps.enabled()) return json({ error: 'off' }, { status: 503 })
      const c = await own(req, publicId)
      if (!c) return json({ error: 'Розмову не знайдено.' }, { status: 404 })
      const messages = await deps.chat().messagesAfter(c, 0)
      return json({ conversation: await pub(c), messages: messages.map(pubMsg) })
    },

    /** POST {type, value}: a contact typed into the panel's own field (outside the model). */
    async contact(req: Request, publicId: string) {
      if (!deps.enabled()) return json({ error: 'off' }, { status: 503 })
      const c = await own(req, publicId)
      if (!c) return json({ error: 'Розмову не знайдено.' }, { status: 404 })
      const body = (await req.json().catch(() => null)) as { type?: string; value?: string } | null
      const type = ['phone', 'telegram', 'viber', 'whatsapp', 'email', 'other'].includes(String(body?.type)) ? String(body?.type) : 'other'
      const r = await deps.chat().contact(c, type, String(body?.value ?? ''))
      if (!r) return json({ error: 'Перевірте контакт.' }, { status: 400 })
      return json({ conversation: await pub(r.conversation), message: pubMsg(r.message) })
    },
  }
}
