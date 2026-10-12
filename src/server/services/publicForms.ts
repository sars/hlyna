import { and, eq, inArray } from 'drizzle-orm'

import type { Db } from '../db'
import { studios } from '../db/schema/catalog'
import { claimStudios, claims, requests } from '../db/schema/requests'
import { claimKeyboard, requestKeyboard } from '../telegram/actions'
import { tg } from '../telegram/tg'
import { REQUEST_WHAT_LABEL } from '../../shared/options'
import { claimCreate, requestCreate } from '../../shared/schemas'
import { audit, type Actor } from './audit'
import { rateLimited } from './limits'

// Public forms on the new stack: the request form (incl. «Додати студію»), and «Це ваша студія?» claims.
// Same fields, messages, honeypot and limits as the Payload versions; responses are {ok, id} or {ok:false, error, field?}.

export type FormResult = { ok: true; id: number | null } | { ok: false; status: number; error: string; field?: string }

const PUBLIC: Actor = { id: null, source: 'kabinet' }

function firstIssue(err: { issues: { path: PropertyKey[]; message: string }[] }) {
  const i = err.issues[0]
  return { error: i?.message ?? 'Перевірте форму.', field: i?.path?.[0] !== undefined ? String(i.path[0]) : undefined }
}

async function notifyChat(text: string, keyboard?: unknown) {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return
  await tg('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true, ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) })
}

const line = (label: string, value: unknown) => (value === undefined || value === null || value === '' ? null : `${label}: ${String(value)}`)

/** The message the owner gets in Telegram for a new request; identical wording to the Payload hook. */
export function requestMessage(id: number, r: Partial<typeof requests.$inferInsert> & { what: keyof typeof REQUEST_WHAT_LABEL }) {
  return [
    r.what === 'studio' ? `Студія #${id}: додати / оновити профіль` : `Новий запит #${id}: ${REQUEST_WHAT_LABEL[r.what] ?? r.what}`,
    line('Студія', r.studioName),
    line('Instagram / сайт', r.studioLinks),
    line('Згода на фото', r.what === 'studio' ? (r.photoConsent ? 'так' : 'ні') : null),
    line('Деталі', r.details),
    line('Кількість', r.quantity),
    line('Термін', r.deadline),
    line('Місто', r.city),
    line('Бюджет за одиницю', r.budgetPerItem),
    line('Логотип', r.logo ? 'так' : null),
    line("Ім'я", r.contactName),
    line('Телефон/Telegram', r.contactPhoneOrTelegram),
    line('Email', r.contactEmail),
    line('Сторінка', r.sourcePage),
  ]
    .filter((l): l is string => l !== null)
    .join('\n')
}

export async function submitRequest(db: Db, raw: unknown, ip: string): Promise<FormResult> {
  if (await rateLimited(db, `request:${ip}`, 10, 3600_000)) return { ok: false, status: 429, error: 'Забагато запитів. Спробуйте пізніше.' }
  const parsed = requestCreate.safeParse(raw)
  if (!parsed.success) {
    const f = firstIssue(parsed.error)
    return { ok: false, status: 400, ...f }
  }
  const { website2: _honeypot, ...d } = parsed.data
  const [row] = await db.insert(requests).values({ ...d, status: 'new' }).returning({ id: requests.id })
  const id = row!.id
  await audit(db, PUBLIC, 'request', id, 'create', null)
  try {
    await notifyChat(requestMessage(id, d), requestKeyboard(id))
  } catch (e) {
    console.error('Telegram notification error', String(e).slice(0, 200)) // never lose the request
  }
  return { ok: true, id }
}

export async function submitClaim(db: Db, raw: unknown, ip: string): Promise<FormResult> {
  if (await rateLimited(db, `claim:${ip}`, 5, 3600_000)) return { ok: false, status: 429, error: 'Забагато заявок. Спробуйте пізніше.' }
  const body = (raw ?? {}) as Record<string, unknown>
  if (typeof body.website2 === 'string' && body.website2) return { ok: true, id: null } // honeypot: pretend success
  const parsed = claimCreate.safeParse(body)
  if (!parsed.success) return { ok: false, status: 400, ...firstIssue(parsed.error) }
  const c = parsed.data
  const slugs = [c.studio, ...c.otherStudios]
  const found = await db
    .select({ id: studios.id, name: studios.name, slug: studios.slug })
    .from(studios)
    .where(and(inArray(studios.slug, slugs), eq(studios.visibility, 'public')))
  const main = found.find((s) => s.slug === c.studio)
  if (!main) return { ok: false, status: 404, error: 'Студію не знайдено.' }
  const others = found.filter((s) => s.slug !== c.studio)

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(claims).values({ name: c.name, contact: c.contact, represents: true, status: 'pending' }).returning({ id: claims.id })
    await tx.insert(claimStudios).values([main, ...others].map((s, position) => ({ claimId: row!.id, studioId: s.id, isMain: s.id === main.id, position })))
    await audit(tx, PUBLIC, 'claim', row!.id, 'create', { studios: { from: null, to: [main, ...others].map((s) => s.slug) } })
    return row!.id
  })
  try {
    await notifyChat([`Заявка на профіль #${id}: ${[main.name, ...others.map((s) => s.name)].join(', ')}`, `Від: ${c.name}, ${c.contact}`].join('\n'), claimKeyboard(id))
  } catch (e) {
    console.error('Telegram notification error', String(e).slice(0, 200))
  }
  return { ok: true, id }
}
