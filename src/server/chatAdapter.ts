import OpenAI from 'openai'

import { site } from '@/content/site'
import { confirmedForCompanies, confirmedForLogo, confirmedForVenues, getAllStudios, getStudioBySlug, giftCertificate, hasFormat, igHandle, offersMasterClasses, pickupTime, runsCorporateWorkshops, TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { facts } from '@/lib/facts'
import { cleanAddress, displayName, publicPrices } from '@/lib/present'
import { acceptsRequests } from '@/lib/profile'
import { createChat, type Chat } from '@/chat/server/service'
import type { Conversation, LlmParams, ToolDef, Transport } from '@/chat/server/types'

import { db } from './db'
import { rateLimited } from './services/limits'
import { submitRequest } from './services/publicForms'
import { tg } from './telegram/tg'
import { CHAT_INSTRUCTIONS } from './chatPrompt'

// The one file that ties the chat module (src/chat) to this site: the model, the Telegram bot, and the tools the
// assistant may call over the catalogue, the price index and the request service. Delete this file and the module
// is gone from the site; copy src/chat elsewhere and write another adapter.

export const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-5.5'
/** The API answers only with a key. */
export const chatEnabled = () => Boolean(process.env.OPENAI_API_KEY) && process.env.CHAT_ENABLED !== '0'
/** Pages show the chat unless it is switched off: they are pre-rendered at build time, where no key is present
 * (the image build only gets the database), so the key must not decide what the HTML holds. Without a key the
 * panel's first send fails with a plain line and the link to the form. */
export const chatShown = () => process.env.CHAT_ENABLED !== '0'

const profileUrl = (slug: string) => `${site.url}/vyrobnyky/${slug}`

type Need = 'master-class' | 'kids' | 'wheel' | 'couples' | 'certificate' | 'corporate-workshop' | 'tableware' | 'logo' | 'corporate-gifts' | 'gift' | 'any'
const NEED_TEST: Record<Need, (s: StudioCard) => boolean> = {
  'master-class': offersMasterClasses,
  kids: (s) => offersMasterClasses(s) && hasFormat(s, 'kids'),
  wheel: (s) => offersMasterClasses(s) && hasFormat(s, 'wheel'),
  couples: (s) => offersMasterClasses(s) && hasFormat(s, 'couples'),
  certificate: (s) => Boolean(giftCertificate(s)) || hasFormat(s, 'certificates'),
  'corporate-workshop': (s) => runsCorporateWorkshops(s) || hasFormat(s, 'corporate-workshop'),
  tableware: confirmedForVenues,
  logo: confirmedForLogo,
  'corporate-gifts': (s) => confirmedForCompanies(s) || hasFormat(s, 'corporate-gifts'),
  gift: (s) => s.type === 'brand' || s.type === 'maker' || hasFormat(s, 'new-year') || hasFormat(s, 'corporate-gifts'),
  any: () => true,
}

const norm = (s: string) => s.toLowerCase().replace(/['’ʼ]/g, '').trim()
const cityMatches = (s: StudioCard, q: string) => {
  const n = norm(q)
  if (!n) return true
  const c = s.cityDoc
  return Boolean(c && (norm(c.name).startsWith(n) || norm(c.slug ?? '').startsWith(n) || norm(c.oblast ?? '').startsWith(n) || norm(s.oblast ?? '').startsWith(n)))
}

function card(s: StudioCard) {
  const prices = publicPrices(s).slice(0, 4).map((p) => p.text)
  const address = cleanAddress(s.address ?? '')
  const pickup = pickupTime(s)
  const cert = giftCertificate(s)
  return {
    name: displayName(s),
    slug: s.slug ?? "",
    url: profileUrl(s.slug ?? ""),
    type: TYPE_LABEL[s.type ?? ''] ?? s.type,
    city: s.cityDoc?.name ?? null,
    address: address || null,
    formats: s.formats ?? [],
    prices,
    ...(s.b2b?.minOrder ? { minOrder: s.b2b.minOrder } : {}),
    ...(s.b2b?.leadTime ? { leadTime: s.b2b.leadTime } : {}),
    ...(pickup ? { pickupAfterClass: pickup.text } : {}),
    ...(cert ? { giftCertificate: cert.valid ?? 'є' } : {}),
    instagram: s.instagram ? `@${igHandle(s.instagram)}` : null,
    website: s.website ?? null,
    acceptsRequests: acceptsRequests(s),
  }
}

const tools: ToolDef[] = [
  {
    name: 'search_studios',
    description: 'Знайти студії, майстрів чи бренди в каталозі за містом (або областю) і потребою. Повертає до limit записів з цінами й посиланнями на профілі. Кличи перед тим, як називати будь-яку студію.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Місто або область українською, напр. «Львів», «Тернопіль». Порожньо — вся Україна.' },
        need: { type: 'string', enum: Object.keys(NEED_TEST), description: 'master-class (разове заняття), kids, wheel (гончарне коло), couples (для двох), certificate, corporate-workshop, tableware (посуд для закладу), logo (чашки з логотипом), corporate-gifts, gift (вироби в подарунок), any' },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
      required: ['need'],
      additionalProperties: false,
    },
    run: async (args) => {
      const need = (String(args.need ?? 'any') in NEED_TEST ? String(args.need) : 'any') as Need
      const city = String(args.city ?? '')
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8)
      const all = (await getAllStudios()).filter(NEED_TEST[need])
      let hit = all.filter((s) => cityMatches(s, city))
      let note: string | undefined
      if (!hit.length && city) {
        note = `У місті «${city}» таких студій у каталозі немає; нижче — з усієї України.`
        hit = all
      }
      // With prices and with a contact first; the catalogue keeps its own order after that.
      hit.sort((a, b) => Number(publicPrices(b).length > 0) - Number(publicPrices(a).length > 0) || Number(acceptsRequests(b)) - Number(acceptsRequests(a)))
      return { total: hit.length, note, studios: hit.slice(0, limit).map(card) }
    },
  },
  {
    name: 'studio_card',
    description: 'Усе, що каталог знає про одну студію за її slug: формати, ціни, умови для бізнесу, контакти, адреса.',
    parameters: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false },
    run: async (args) => {
      const s = await getStudioBySlug(String(args.slug ?? ''))
      if (!s) return { error: 'Такої студії в каталозі немає.' }
      const c = s as StudioCard
      return { ...card(c), summary: c.summary ?? c.publicDescription ?? null, status: c.status, services: (c.services ?? []).slice(0, 8).map((x) => x.text), products: (c.products ?? []).slice(0, 8).map((x) => x.text), b2b: c.b2b ?? null, updatedAt: c.updatedAt ?? null }
    },
  },
  {
    name: 'price_range',
    description: 'Орієнтовні ціни з індексу цін сайту (10–90 % студій, медіана, скільки студій): group (разовий майстер-клас з особи), private, couple (для двох), kids, course, cert (сертифікат), corporate (корпоратив з особи), cup, plate, vase, jewelry.',
    parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['group', 'private', 'couple', 'kids', 'course', 'cert', 'corporate', 'cup', 'plate', 'vase', 'jewelry'] } }, required: ['kind'], additionalProperties: false },
    run: async (args) => {
      const f = await facts()
      const x = f.get(String(args.kind ?? ''))
      if (!x) return { error: 'Для цієї категорії ще мало опублікованих цін.' }
      return { min: x.min, max: x.max, median: x.median, studios: x.n, unit: x.unit, currency: 'UAH', source: `${site.url}/tsiny-2026` }
    },
  },
  {
    name: 'lead_times',
    description: 'Терміни, як їх називають студії: партія посуду, партія з логотипом, один виріб на замовлення, забрати виріб після майстер-класу.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => ({ batch: site.lead.batch, logo: site.lead.logo, logoDetail: site.lead.logoDetail, customItem: site.lead.customItem, pickupAfterClass: site.lead.pickup }),
  },
  {
    name: 'create_request',
    description: 'Створити запит, який Глина передасть кільком студіям. Лише коли відвідувач цього хоче і назвав контакт. Повертає номер запиту.',
    parameters: {
      type: 'object',
      properties: {
        what: { type: 'string', enum: ['tableware', 'logo-mugs', 'corporate-gifts', 'corporate-workshop', 'master-class', 'other'] },
        details: { type: 'string', description: 'Суть запиту одним-трьома реченнями: що саме, стиль, побажання.' },
        quantity: { type: 'string', description: 'Кількість виробів або людей, якщо відомо.' },
        deadline: { type: 'string', description: 'До якої дати, якщо відомо.' },
        city: { type: 'string' },
        logo: { type: 'boolean' },
        contactName: { type: 'string' },
        contact: { type: 'string', description: 'Телефон, Telegram, Viber/WhatsApp або email.' },
      },
      required: ['what', 'details', 'contact'],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const contact = String(args.contact ?? '').trim()
      const isEmail = /@.+\./.test(contact) && !contact.startsWith('@')
      const r = await submitRequest(
        db,
        {
          what: String(args.what ?? 'other'),
          details: `${String(args.details ?? '').trim()}\n\n(із чату #${ctx.conversation.id})`,
          quantity: args.quantity ? String(args.quantity) : undefined,
          deadline: args.deadline ? String(args.deadline) : undefined,
          city: args.city ? String(args.city) : undefined,
          logo: Boolean(args.logo),
          contactName: args.contactName ? String(args.contactName) : undefined,
          contactPhoneOrTelegram: isEmail ? undefined : contact,
          contactEmail: isEmail ? contact : undefined,
          sourcePage: ctx.conversation.lastPage ?? ctx.conversation.page,
        },
        ctx.ip,
      )
      if (!r.ok) return { ok: false, error: r.error }
      const { updateConversation } = await import('@/chat/server/store')
      await updateConversation(ctx.db, ctx.conversation.id, { requestId: r.id, contact: ctx.conversation.contact ?? contact, contactType: ctx.conversation.contactType ?? (isEmail ? 'email' : 'phone_or_messenger') })
      return { ok: true, requestId: r.id, tellVisitor: `Запит №${r.id} створено. Студії відповідатимуть напряму на залишений контакт, зазвичай протягом 1–3 робочих днів.` }
    },
  },
]

const KIND_LINE: Record<string, string> = {
  profile: 'Це сторінка профілю однієї студії: відвідувач бачить на ній опис, формати, ціни, контакти (Instagram, сайт, телефон, адресу) і фото; найімовірніше, хоче щось саме від неї: запис, виріб, партію.',
  business: 'Це сторінка для бізнесу: на ній орієнтовні ціни, терміни і список студій, які роблять партії, логотипи чи корпоративи. Тут доречно запропонувати один запит кільком студіям.',
  classes: 'Це сторінка майстер-класів міста: на ній список студій міста з цінами разового заняття. Людина обирає, куди піти; дай 2–3 варіанти з цінами.',
  home: 'Це головна сторінка каталогу: спочатку зрозумій, що шукають: майстер-клас, подарунок чи посуд для закладу.',
  other: 'Це одна зі сторінок каталогу (добірка, місто, виріб).',
}

async function context(c: Conversation, extra: { presenceOnline: boolean; otherThreads: { page: string; first: string }[] }) {
  const ctx = (c.context ?? {}) as { studioSlug?: string; studioName?: string; city?: string }
  const lines = [
    `Сьогодні ${new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeZone: 'Europe/Kyiv' }).format(new Date())}.`,
    `Ти вбудований у сторінку ${site.url}${c.lastPage ?? c.page}${c.lastPage && c.lastPage !== c.page ? ` (розмова почалась на ${site.url}${c.page})` : ''}. ${KIND_LINE[c.kind] ?? ''}`.trim(),
  ]
  if (ctx.city) lines.push(`Місто сторінки: ${ctx.city}.`)
  if (ctx.studioSlug) {
    const s = await getStudioBySlug(ctx.studioSlug)
    if (s) {
      const k = card(s as StudioCard)
      lines.push(`Студія цієї сторінки (її контакти відвідувач бачить вище на сторінці): ${JSON.stringify(k)}. ${k.acceptsRequests ? 'Вона приймає запити.' : 'Запити їй не надсилаємо (не працює, не підтверджена або це не студія).'}`)
    }
  }
  if (extra.otherThreads.length) lines.push(`Відвідувач має ще розмови на інших сторінках (для розуміння, не переказуй): ${extra.otherThreads.map((o) => `${o.page}: «${o.first.slice(0, 120)}»`).join('; ')}.`)
  lines.push(`Людина з Глини зараз ${extra.presenceOnline ? 'онлайн' : 'офлайн'}.`)
  if (c.status === 'waiting') lines.push('Розмову вже передано людині з Глини, вона ще не відповіла. Відповідай на нові питання сам, коротко; не обіцяй нічого за людину і не викликай call_human знову.')
  lines.push(`Стан розмови: ${c.status}; контакт ${c.contact ? 'є' : 'ще не збережено'}; запит ${c.requestId ? `№${c.requestId} уже створено` : 'не створено'}${c.visitorTgChatId ? '; відвідувач також у Telegram' : ''}.`)
  return lines.join('\n')
}

const ownerChat = () => process.env.TELEGRAM_CHAT_ID ?? ''
let botName: string | null | undefined
const transport: Transport = {
  async sendToOwner(text, opts) {
    if (!ownerChat()) return null
    const r = await tg<{ message_id: number }>('sendMessage', { chat_id: ownerChat(), text: text.slice(0, 4000), disable_web_page_preview: true, ...(opts?.replyTo ? { reply_parameters: { message_id: opts.replyTo, allow_sending_without_reply: true } } : {}), ...(opts?.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}) })
    return r?.message_id ?? null
  },
  async sendTo(chatId, text, opts) {
    const r = await tg<{ message_id: number }>('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true, ...(opts?.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}) })
    return r?.message_id ?? null
  },
  async editOwnerMessage(messageId, text, keyboard) {
    await tg('editMessageText', { chat_id: ownerChat(), message_id: messageId, text: text.slice(0, 4000), disable_web_page_preview: true, ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) })
  },
  async editOwnerKeyboard(messageId, keyboard) {
    await tg('editMessageReplyMarkup', { chat_id: ownerChat(), message_id: messageId, reply_markup: { inline_keyboard: keyboard } })
  },
  async answerCallback(id, text) {
    await tg('answerCallbackQuery', { callback_query_id: id, ...(text ? { text: text.slice(0, 190) } : {}) })
  },
  async botUsername() {
    if (botName !== undefined) return botName
    if (process.env.TELEGRAM_BOT_USERNAME) return (botName = process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, ''))
    if (!process.env.TELEGRAM_BOT_TOKEN) return (botName = null)
    const me = await tg<{ username?: string }>('getMe', {})
    botName = me?.username ?? null
    return botName
  },
  panelUrl: (id) => `${site.url}/panel/chat/${id}`,
}

const BUSINESS_WORDS = /парті[яії]|логотип|корпоратив|ресторан|кафе|кав['’]ярн|готел|заклад|оптом|тираж|компані[яії]|для команди|співробітник|персонал|бренд(ован|инг)|\b\d{2,}\s*(шт|чаш|круж|тарі|горн|мис|піал|набор|комплект)/iu
const BUSINESS_NEEDS = new Set(['tableware', 'logo', 'corporate-gifts', 'corporate-workshop'])
const BUSINESS_WHAT = new Set(['tableware', 'logo-mugs', 'corporate-gifts', 'corporate-workshop'])

const globalForChat = globalThis as unknown as { hlynaChat?: Chat; hlynaOpenAI?: OpenAI }

function openai() {
  return (globalForChat.hlynaOpenAI ??= new OpenAI({ timeout: 60_000, maxRetries: 1 }))
}

/** The site's chat, built once per process (in development on every call, so a hot reload never serves a stale object). */
export function chat(): Chat {
  if (process.env.NODE_ENV !== 'production') return build()
  return (globalForChat.hlynaChat ??= build())
}

function build(): Chat {
  return createChat({
    db,
    llm: { stream: (p: LlmParams) => openai().responses.stream(p as unknown as Parameters<OpenAI['responses']['stream']>[0]) },
    model: CHAT_MODEL,
    instructions: CHAT_INSTRUCTIONS,
    context,
    tools,
    transport,
    rateLimited: (key, max, windowMs) => rateLimited(db, key, max, windowMs),
    business: {
      detect: (text, c) => c.kind === 'business' || BUSINESS_WORDS.test(text),
      detectTools: (calls) => calls.some((t) => (t.name === 'search_studios' && BUSINESS_NEEDS.has(String(t.args.need))) || (t.name === 'create_request' && BUSINESS_WHAT.has(String(t.args.what)))),
    },
  })
}
