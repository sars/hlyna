// The site chat (src/chat): a turn with the model (faked), tool rounds, the hand-over to a person in Telegram
// (faked transport), the owner's replies and buttons, «Продовжити в Telegram», the HTTP handlers, limits and
// the contact nudge. Real Postgres (CHAT_TEST_DATABASE_URL, default hlyna_apptest).
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { chatHttp } from '../../src/chat/server/http'
import { createChat } from '../../src/chat/server/service'
import { getById, listMessages, setOwnerManual, touchOwner, updateConversation, type ChatDb } from '../../src/chat/server/store'
import { TEXT } from '../../src/chat/server/texts'
import type { LlmParams, LlmResponse, LlmStream, ToolDef, Transport } from '../../src/chat/server/types'
import * as schema from '../../src/server/db/schema'

const url = process.env.CHAT_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as ChatDb

// ---------- a model that follows a script: each call pops the next response
type Scripted = { text?: string; calls?: { name: string; args: Record<string, unknown> }[] }
const script: Scripted[] = []
const seenParams: LlmParams[] = []
const llm = {
  stream(params: LlmParams): LlmStream {
    seenParams.push(params)
    const next = script.shift() ?? { text: 'ок' }
    const events = (next.text ?? '').split(' ').map((w, i) => ({ type: 'response.output_text.delta', delta: (i ? ' ' : '') + w }))
    const res: LlmResponse = {
      output: [
        ...(next.calls ?? []).map((c, i) => ({ type: 'function_call' as const, call_id: `call_${i}`, name: c.name, arguments: JSON.stringify(c.args) })),
        ...(next.text ? [{ type: 'message' as const, role: 'assistant' as const, content: [{ type: 'output_text' as const, text: next.text }] }] : []),
      ],
      output_text: next.text ?? '',
      usage: { input_tokens: 100, output_tokens: 20 },
    }
    return Object.assign(
      (async function* () {
        for (const e of events) yield e
      })(),
      { finalResponse: async () => res },
    )
  },
}

// ---------- Telegram that remembers what it sent
const sent: { to: 'owner' | number; text: string; replyTo?: number; keyboard?: unknown }[] = []
let nextId = 100
const transport: Transport = {
  async sendToOwner(text, opts) {
    sent.push({ to: 'owner', text, replyTo: opts?.replyTo, keyboard: opts?.keyboard })
    return ++nextId
  },
  async sendTo(chatId, text) {
    sent.push({ to: chatId, text })
    return ++nextId
  },
  async editOwnerMessage() {},
  async answerCallback() {},
  async botUsername() {
    return 'hlyna_bot'
  },
  panelUrl: (id) => `https://example.test/panel/chat/${id}`,
}

const echo: ToolDef = {
  name: 'echo_tool',
  description: 'returns its args',
  parameters: { type: 'object', properties: { q: { type: 'string' } } },
  run: async (args) => ({ echoed: args.q }),
}
const limits = new Map<string, number>()
const chat = createChat({
  db,
  llm,
  model: 'fake',
  instructions: 'test instructions',
  context: async (c, x) => `page ${c.lastPage} online ${x.presenceOnline}${x.otherThreads.length ? ` other ${x.otherThreads.map((o) => `${o.page} ${o.first}`).join(' | ')}` : ''}`,
  tools: [echo],
  transport,
  rateLimited: async (key, max) => {
    const n = (limits.get(key) ?? 0) + 1
    limits.set(key, n)
    return n > max
  },
  log: () => {},
})
const OWNER = '777'

beforeEach(async () => {
  await db.execute(sql`truncate chat.events, chat.messages, chat.conversations restart identity cascade`)
  await db.execute(sql`delete from chat.state`)
  script.length = 0
  seenParams.length = 0
  sent.length = 0
  limits.clear()
  nextId = 100
})
afterAll(async () => {
  await pool.end()
})

const open = (visitor = 'v1', page = '/vyrobnyky/yar', threadKey = 'profile:yar') => chat.open(visitor, { threadKey, page, kind: 'profile', context: { studioName: 'Яр' } })

describe('a turn with the assistant', () => {
  it('streams the answer, stores both messages, tells the owner once', async () => {
    const c = await open()
    script.push({ text: 'Привіт з Яру' })
    const deltas: string[] = []
    const r = await chat.send(c, 'Привіт', { ip: '1.1.1.1', via: 'site', onDelta: (d) => deltas.push(d) })
    expect(deltas.join('')).toBe('Привіт з Яру')
    expect(r.assistant?.text).toBe('Привіт з Яру')
    const rows = await listMessages(db, c.id)
    expect(rows.map((m) => m.role)).toEqual(['visitor', 'assistant'])
    expect(sent.filter((s) => s.to === 'owner')).toHaveLength(1)
    expect(sent[0]!.text).toContain('Чат #1')
    expect(sent[0]!.text).toContain('Привіт')
    const fresh = await getById(db, c.id)
    expect(fresh?.tgHeadMessageId).toBe(101)
    expect(fresh?.turns).toBe(1)
    expect(fresh?.inputTokens).toBe(100)
    // The model saw the context as a developer line and the visitor's text last.
    const input = seenParams[0]!.input as { role?: string; content?: string }[]
    expect(input[0]).toMatchObject({ role: 'developer', content: 'page /vyrobnyky/yar online false' })
    expect(input.at(-1)).toMatchObject({ role: 'user', content: 'Привіт' })
  })

  it('runs a tool round and feeds the result back before answering', async () => {
    const c = await open()
    script.push({ calls: [{ name: 'echo_tool', args: { q: 'ціна' } }] }, { text: 'Відповідь після інструмента' })
    const r = await chat.send(c, 'Скільки?', { ip: '1.1.1.1', via: 'site' })
    expect(r.assistant?.text).toBe('Відповідь після інструмента')
    expect(seenParams).toHaveLength(2)
    const second = seenParams[1]!.input as { type?: string; call_id?: string; output?: string }[]
    expect(second.some((i) => i.type === 'function_call' && i.call_id === 'call_0')).toBe(true)
    expect(second.find((i) => i.type === 'function_call_output')?.output).toBe(JSON.stringify({ echoed: 'ціна' }))
    expect((r.assistant?.meta as { tools: { name: string }[] }).tools[0]!.name).toBe('echo_tool')
  })

  it('keeps history in the next turn, but only the last thirty lines', async () => {
    const c = await open()
    for (let i = 0; i < 20; i++) {
      script.push({ text: `a${i}` })
      await chat.send(c, `q${i}`, { ip: '1.1.1.1', via: 'site' })
    }
    const input = seenParams.at(-1)!.input as { role?: string; content?: string }[]
    // 30 lines of history plus the new question.
    expect(input.filter((i) => i.role === 'user' || i.role === 'assistant')).toHaveLength(31)
    expect(input.at(-1)?.content).toBe('q19')
  })

  it('answers with a fallback line when the model fails', async () => {
    const c = await open()
    const broken = createChat({
      db,
      llm: {
        stream: () => {
          throw new Error('boom')
        },
      },
      model: 'fake',
      instructions: '',
      context: () => '',
      tools: [],
      transport,
      rateLimited: async () => false,
      log: () => {},
    })
    const r = await broken.send(c, 'hi', { ip: '1.1.1.1', via: 'site' })
    expect(r.assistant?.text).toBe(TEXT.modelDown)
  })
})

describe('handing over to a person', () => {
  it('call_human puts the conversation on hold and asks the owner, with the contact nudge when offline', async () => {
    const c = await open()
    script.push({ calls: [{ name: 'call_human', args: { reason: 'хоче партію' } }] }, { text: 'Передаю людині' })
    const r = await chat.send(c, 'Мені 200 тарілок', { ip: '1.1.1.1', via: 'site' })
    expect(r.conversation.status).toBe('waiting')
    const ask = sent.find((s) => s.text.includes('просить людину'))
    expect(ask?.text).toContain('хоче партію')
    expect(ask?.replyTo).toBe(101)
    const second = seenParams[1]!.input as { type?: string; output?: string }[]
    const out = JSON.parse(second.find((i) => i.type === 'function_call_output')!.output!) as { humanOnline: boolean; tellVisitor: string }
    expect(out.humanOnline).toBe(false)
    expect(out.tellVisitor).toContain(TEXT.askContact)
    // While waiting, the visitor's lines go to the owner and the model is not called.
    sent.length = 0
    seenParams.length = 0
    const r2 = await chat.send(r.conversation, 'Ще питання', { ip: '1.1.1.1', via: 'site' })
    expect(seenParams).toHaveLength(0)
    expect(sent[0]).toMatchObject({ to: 'owner', text: '👤 Ще питання', replyTo: 101 })
    expect(r2.assistant).toBeNull()
  })

  it('tells the visitor the person is online when the owner was active recently', async () => {
    await touchOwner(db)
    const c = await open()
    script.push({ calls: [{ name: 'call_human', args: { reason: 'x' } }] }, { text: 'ок' })
    await chat.send(c, 'людину', { ip: '1.1.1.1', via: 'site' })
    const second = seenParams[1]!.input as { type?: string; output?: string }[]
    const out = JSON.parse(second.find((i) => i.type === 'function_call_output')!.output!) as { humanOnline: boolean; tellVisitor: string }
    expect(out.humanOnline).toBe(true)
    expect(out.tellVisitor).toBe(TEXT.waitingOnline)
  })

  it("the owner's Reply joins the conversation; /done hands it back; «Завершити» closes it", async () => {
    const c = await open()
    script.push({ text: 'ок' })
    await chat.send(c, 'Привіт', { ip: '1.1.1.1', via: 'site' })
    const head = (await getById(db, c.id))!.tgHeadMessageId!
    const handled = await chat.handleTelegramUpdate({ message: { message_id: 500, chat: { id: Number(OWNER) }, text: 'Вітаю, я з Глини', reply_to_message: { message_id: head } } }, OWNER, 'https://example.test')
    expect(handled).toBe(true)
    let rows = await listMessages(db, c.id)
    expect(rows.map((m) => m.role)).toEqual(['visitor', 'assistant', 'system', 'human'])
    expect(rows[2]!.text).toBe(TEXT.humanJoined)
    expect(rows[3]).toMatchObject({ text: 'Вітаю, я з Глини', tgMessageId: 500 })
    expect((await getById(db, c.id))?.status).toBe('human')
    // A Reply to the owner's own message also addresses the conversation.
    await chat.handleTelegramUpdate({ message: { message_id: 501, chat: { id: Number(OWNER) }, text: 'Ще рядок', reply_to_message: { message_id: 500 } } }, OWNER, 'https://example.test')
    expect((await listMessages(db, c.id)).at(-1)?.text).toBe('Ще рядок')
    // The visitor writes: relayed, no model.
    seenParams.length = 0
    await chat.send((await getById(db, c.id))!, 'Дякую', { ip: '1.1.1.1', via: 'site' })
    expect(seenParams).toHaveLength(0)
    expect(sent.at(-1)).toMatchObject({ to: 'owner', text: '👤 Дякую', replyTo: head })
    // /done
    await chat.handleTelegramUpdate({ message: { message_id: 502, chat: { id: Number(OWNER) }, text: '/done', reply_to_message: { message_id: head } } }, OWNER, 'https://example.test')
    expect((await getById(db, c.id))?.status).toBe('ai')
    rows = await listMessages(db, c.id)
    expect(rows.at(-1)?.text).toBe(TEXT.humanLeft)
    // «Завершити»
    await chat.handleTelegramUpdate({ callback_query: { id: 'cq1', from: { id: Number(OWNER) }, data: `ch:x:${c.id}` } }, OWNER, 'https://example.test')
    expect((await getById(db, c.id))?.status).toBe('closed')
    // Writing again reopens for the assistant.
    script.push({ text: 'знову тут' })
    const r = await chat.send((await getById(db, c.id))!, 'ще', { ip: '1.1.1.1', via: 'site' })
    expect(r.conversation.status).toBe('ai')
    expect(r.assistant?.text).toBe('знову тут')
  })

  it('ignores Telegram messages from the owner that are not about a conversation', async () => {
    expect(await chat.handleTelegramUpdate({ message: { message_id: 1, chat: { id: Number(OWNER) }, text: 'hello' } }, OWNER, 'https://example.test')).toBe(false)
    expect(await chat.handleTelegramUpdate({ message: { message_id: 2, chat: { id: Number(OWNER) }, text: 'x', reply_to_message: { message_id: 99999 } } }, OWNER, 'https://example.test')).toBe(false)
    expect(await chat.handleTelegramUpdate({ callback_query: { id: 'c', from: { id: 1 }, data: 'c:a:1' } }, OWNER, 'https://example.test')).toBe(false)
  })

  it('/online and /offline set presence by hand', async () => {
    await chat.handleTelegramUpdate({ message: { message_id: 1, chat: { id: Number(OWNER) }, text: '/offline' } }, OWNER, 'https://example.test')
    expect((await chat.presence()).online).toBe(false)
    await chat.handleTelegramUpdate({ message: { message_id: 2, chat: { id: Number(OWNER) }, text: '/online' } }, OWNER, 'https://example.test')
    expect((await chat.presence()).online).toBe(true)
    await chat.handleTelegramUpdate({ message: { message_id: 3, chat: { id: Number(OWNER) }, text: '/auto' } }, OWNER, 'https://example.test')
    expect((await chat.presence()).manual).toBeNull()
  })
})

describe('the visitor continues in Telegram', () => {
  it('links the chat by the deep link, answers there, and relays the person both ways', async () => {
    const c = await open()
    script.push({ text: 'ок' })
    await chat.send(c, 'Привіт', { ip: '1.1.1.1', via: 'site' })
    expect(await chat.telegramLink(c)).toBe(`https://t.me/hlyna_bot?start=c_${c.publicId}`)
    await chat.handleTelegramUpdate({ message: { message_id: 1, chat: { id: 4242 }, text: `/start c_${c.publicId}` } }, OWNER, 'https://example.test')
    const linked = (await getById(db, c.id))!
    expect(linked.visitorTgChatId).toBe(4242)
    expect(sent.find((s) => s.to === 4242)?.text).toBe(TEXT.tgWelcome('https://example.test'))
    // The visitor writes from Telegram: the assistant answers into Telegram.
    script.push({ text: 'з Telegram' })
    await chat.handleTelegramUpdate({ message: { message_id: 2, chat: { id: 4242 }, text: 'Ціна?' } }, OWNER, 'https://example.test')
    expect(sent.at(-1)).toMatchObject({ to: 4242, text: 'з Telegram' })
    // The owner replies: the visitor gets it in Telegram too.
    const head = linked.tgHeadMessageId!
    await chat.handleTelegramUpdate({ message: { message_id: 3, chat: { id: Number(OWNER) }, text: 'Людина тут', reply_to_message: { message_id: head } } }, OWNER, 'https://example.test')
    expect(sent.filter((s) => s.to === 4242).map((s) => s.text)).toContain('Людина тут')
  })

  it('a stranger gets one pointer to the site', async () => {
    await chat.handleTelegramUpdate({ message: { message_id: 1, chat: { id: 5 }, text: 'hi' } }, OWNER, 'https://example.test')
    expect(sent).toEqual([{ to: 5, text: TEXT.tgStranger('https://example.test') }])
    sent.length = 0
    await chat.handleTelegramUpdate({ message: { message_id: 2, chat: { id: 5 }, text: '/start c_abcdefghijklmnopqrst' } }, OWNER, 'https://example.test')
    expect(sent).toHaveLength(1)
  })
})

describe('contact and the nudge', () => {
  it('asks for a contact once: offline at the hand-over it is in the answer, online it comes after five silent minutes', async () => {
    await setOwnerManual(db, 'offline')
    const c = await open()
    script.push({ calls: [{ name: 'call_human', args: { reason: 'r' } }] }, { text: 'чекайте' })
    const r = await chat.send(c, 'людину', { ip: '1.1.1.1', via: 'site' })
    expect(await chat.nudge(r.conversation)).toBeNull()
    expect((await getById(db, c.id))?.contactAskedAt).not.toBeNull()

    await setOwnerManual(db, 'online')
    const c2 = await open('v2')
    script.push({ calls: [{ name: 'call_human', args: { reason: 'r' } }] }, { text: 'чекайте' })
    const r2 = await chat.send(c2, 'людину', { ip: '1.1.1.1', via: 'site' })
    expect(await chat.nudge(r2.conversation)).toBeNull()
    await updateConversation(db, c2.id, { handoffAt: new Date(Date.now() - 6 * 60_000).toISOString() })
    const nudged = await chat.nudge((await getById(db, c2.id))!)
    expect(nudged?.text).toBe(TEXT.askContact)
    expect(await chat.nudge((await getById(db, c2.id))!)).toBeNull()
  })

  it('save_contact from the model and the panel field both record it and tell the owner', async () => {
    const c = await open()
    script.push({ calls: [{ name: 'save_contact', args: { type: 'telegram', value: '@someone' } }] }, { text: 'записав' })
    await chat.send(c, '@someone', { ip: '1.1.1.1', via: 'site' })
    expect((await getById(db, c.id))).toMatchObject({ contactType: 'telegram', contact: '@someone' })
    expect(sent.some((s) => s.text.includes('📇') && s.text.includes('@someone'))).toBe(true)
    const r = await chat.contact((await getById(db, c.id))!, 'phone', '+380 67 000 00 00')
    expect(r?.conversation.contact).toBe('+380 67 000 00 00')
    expect(await chat.contact(c, 'phone', '12')).toBeNull()
  })
})

describe('http', () => {
  const http = chatHttp({ chat: () => chat, enabled: () => true, clientIp: () => '9.9.9.9', ipHash: (ip) => `h:${ip}` })
  const json = (body: unknown, cookie?: string) => new Request('http://localhost/api/chat/x', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })
  const readSse = async (res: Response) => {
    const text = await res.text()
    return text
      .split('\n\n')
      .filter((b) => b.includes('data:'))
      .map((b) => ({ event: b.match(/event: (\S+)/)?.[1], data: JSON.parse(b.split('data: ')[1]!) as Record<string, unknown> }))
  }

  it('opens with a cookie, restores, streams an answer, saves a contact', async () => {
    const r1 = await http.open(json({ page: '/dlya-biznesu', kind: 'business', context: { city: 'Київ', bad: { x: 1 } } }))
    expect(r1.status).toBe(200)
    const cookie = r1.headers.get('set-cookie')!
    expect(cookie).toMatch(/^hl_chat=.+HttpOnly; SameSite=Lax$/)
    const d1 = (await r1.json()) as { conversation: { id: string; status: string }; messages: unknown[] }
    expect(d1.conversation.status).toBe('ai')
    expect(d1.messages).toEqual([])
    const stored = await getById(db, 1)
    expect(stored?.context).toEqual({ city: 'Київ' })
    expect(stored?.ipHash).toBe('h:9.9.9.9')
    const cookieHeader = cookie.split(';')[0]!

    const cur = await http.current(new Request('http://localhost/api/chat/current?thread=%2Fdlya-biznesu', { headers: { cookie: cookieHeader } }))
    expect(((await cur.json()) as { conversation: { id: string } }).conversation.id).toBe(d1.conversation.id)
    expect(((await (await http.current(new Request('http://localhost/api/chat/current'))).json()) as { conversation: null }).conversation).toBeNull()

    script.push({ text: 'Партія 3–8 тижнів' })
    const r2 = await http.message(json({ text: '50 тарілок', page: '/dlya-biznesu/posud' }, cookieHeader), d1.conversation.id)
    expect(r2.headers.get('content-type')).toContain('text/event-stream')
    const evs = await readSse(r2)
    expect(evs.map((e) => e.event)).toEqual(['visitor', 'delta', 'delta', 'delta', 'done'])
    expect((evs.at(-1)!.data as { assistant: { text: string } }).assistant.text).toBe('Партія 3–8 тижнів')
    expect((await getById(db, 1))?.lastPage).toBe('/dlya-biznesu/posud')

    // Another visitor cannot touch it.
    expect((await http.message(json({ text: 'x' }, 'hl_chat=other'), d1.conversation.id)).status).toBe(404)
    expect((await http.message(json({ text: '' }, cookieHeader), d1.conversation.id)).status).toBe(400)

    const r3 = await http.contact(json({ type: 'email', value: 'a@b.cc' }, cookieHeader), d1.conversation.id)
    expect(((await r3.json()) as { conversation: { hasContact: boolean } }).conversation.hasContact).toBe(true)
  })

  it('events: the first frame is the state; the stream ends when the client leaves', async () => {
    const r1 = await http.open(json({ page: '/', kind: 'home' }))
    const cookieHeader = r1.headers.get('set-cookie')!.split(';')[0]!
    const id = ((await r1.json()) as { conversation: { id: string } }).conversation.id
    const ac = new AbortController()
    const res = await http.events(new Request(`http://localhost/api/chat/${id}/events?after=0`, { headers: { cookie: cookieHeader }, signal: ac.signal }), id)
    const reader = res.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    expect(first).toContain('event: state')
    expect(first).toContain('"telegramLink":"https://t.me/hlyna_bot?start=c_')
    ac.abort()
    await reader.cancel()
  })

  it('limits by ip and by day', async () => {
    const r1 = await http.open(json({ page: '/', kind: 'home' }))
    const cookieHeader = r1.headers.get('set-cookie')!.split(';')[0]!
    const id = ((await r1.json()) as { conversation: { id: string } }).conversation.id
    limits.set('chat:ip:9.9.9.9', 20)
    expect((await http.message(json({ text: 'x' }, cookieHeader), id)).status).toBe(429)
    limits.clear()
    limits.set(`chat:day:${new Date().toISOString().slice(0, 10)}`, 300)
    expect((await http.message(json({ text: 'x' }, cookieHeader), id)).status).toBe(503)
  })

  it('is off without a key', async () => {
    const off = chatHttp({ chat: () => chat, enabled: () => false, clientIp: () => '1', ipHash: (x) => x })
    expect((await off.open(json({}))).status).toBe(503)
    expect(((await (await off.current(new Request('http://localhost/x'))).json()) as { conversation: null }).conversation).toBeNull()
  })
})

describe('one open thread per visitor and context', () => {
  it('open() returns the same thread for the same context, another for another, and a new one after closing', async () => {
    const a = await open('v9', '/a')
    const b = await chat.open('v9', { threadKey: 'profile:yar', page: '/b', kind: 'home', context: { city: 'Львів' } })
    expect(b.id).toBe(a.id)
    expect(b.lastPage).toBe('/b')
    expect(b.context).toEqual({ studioName: 'Яр', city: 'Львів' })
    const biz = await chat.open('v9', { threadKey: 'business', page: '/dlya-biznesu', kind: 'business' })
    expect(biz.id).not.toBe(a.id)
    expect((await chat.current('v9', 'business'))?.conversation.id).toBe(biz.id)
    expect((await chat.current('v9', 'profile:yar'))?.conversation.id).toBe(a.id)
    await updateConversation(db, a.id, { status: 'closed' })
    const c = await open('v9', '/c')
    expect(c.id).not.toBe(a.id)
  })

  it('the assistant is told about the visitor\'s other open threads', async () => {
    const a = await open('v9', '/vyrobnyky/yar')
    script.push({ text: 'ок' })
    await chat.send(a, 'Хочу 30 чашок', { ip: '1.1.1.1', via: 'site' })
    const biz = await chat.open('v9', { threadKey: 'business', page: '/dlya-biznesu', kind: 'business' })
    script.push({ text: 'ок' })
    await chat.send(biz, 'Терміни?', { ip: '1.1.1.1', via: 'site' })
    const input = seenParams.at(-1)!.input as { role?: string; content?: string }[]
    expect(input[0]!.content).toContain('/vyrobnyky/yar')
    expect(input[0]!.content).toContain('Хочу 30 чашок')
  })
})
