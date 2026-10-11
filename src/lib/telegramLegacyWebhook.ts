// Payload-era Telegram webhook (copy of main before the move), used while DATA_BACKEND is not «app». Removed at cutover.
import configPromise from '@payload-config'
import { timingSafeEqual } from 'node:crypto'
import { getPayload } from 'payload'

import { REQUEST_STATUS_OPTIONS } from '@/collections/Requests/options'
import { adminUrl, siteUrl, tg, type TgKeyboard } from '@/lib/telegram'
import type { Claim, Studio } from '@/payload-types'

// Telegram bot webhook: the buttons under our own notifications (claims, owner edits, customer requests).
// Accepts only Telegram (secret header set with setWebhook) and only our chat (TELEGRAM_CHAT_ID).
// Every action is idempotent: a second tap answers with the current state instead of acting again.

type Msg = { message_id: number; chat: { id: number }; text?: string; reply_to_message?: { text?: string } }
type Update = {
  callback_query?: { id: string; from: { id: number }; data?: string; message?: Msg }
  message?: Msg & { from?: { id: number } }
}

const REJECT_PROMPT = 'Причина відмови для заявки #'

function secretOk(req: Request) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
  if (!want || want.length !== got.length) return false
  return timingSafeEqual(Buffer.from(want), Buffer.from(got))
}

const ourChat = (id?: number) => Boolean(id) && String(id) === String(process.env.TELEGRAM_CHAT_ID)
const stamp = () => new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', dateStyle: 'short', timeStyle: 'short' }).format(new Date())

/** Appends a status line to the original notification and replaces its buttons. */
async function markMessage(msg: Msg | undefined, line: string, keyboard: TgKeyboard = []) {
  if (!msg) return
  const base = (msg.text ?? '').split('\n— ')[0]
  await tg('editMessageText', {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: `${base}\n— ${line} (${stamp()})`.slice(0, 4000),
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: keyboard },
  })
}

const say = (text: string, extra: Record<string, unknown> = {}) =>
  tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true, ...extra })

const studioMessage = (claim: Claim, link: string) =>
  [
    'Вітаємо! Ваш профіль на «Глині» (hlyna.com.ua) підтверджено.',
    '',
    `Посилання, щоб задати пароль (діє 7 днів і спрацьовує один раз): ${link}`,
    '',
    'У кабінеті можна додати фото, оновити ціни, послуги, адресу й контакти, умови для бізнесу (мінімальна партія, терміни, логотип) і розповісти про студію своїми словами. Ми переглянемо зміни й опублікуємо їх на сайті.',
    `Вхід потім: ${siteUrl()}/kabinet/vhid`,
  ].join('\n')

async function approveClaim(id: number, msg?: Msg) {
  const payload = await getPayload({ config: configPromise })
  let claim = (await payload.findByID({ collection: 'claims', id, depth: 0, overrideAccess: true }).catch(() => null)) as Claim | null
  if (!claim) return 'Заявку не знайдено'
  if (claim.status === 'rejected') return 'Заявку вже відхилено'
  if (claim.status !== 'approved') {
    await payload.update({ collection: 'claims', id, data: { status: 'approved' }, overrideAccess: true, depth: 0 })
    claim = (await payload.findByID({ collection: 'claims', id, depth: 0, overrideAccess: true })) as Claim
  }
  await markMessage(msg, 'Схвалено', [[{ text: '🔗 Відкрити в адмінці', url: adminUrl('claims', id) }]])
  const link = claim.inviteLink ?? ''
  if (/^https?:\/\//.test(link)) {
    await say(`Заявка #${id} схвалена. Надішліть студії це повідомлення:`)
    await say(studioMessage(claim, link))
  } else {
    await say(`Заявка #${id} схвалена. ${link || 'Посилання для пароля — у заявці в адмінці.'}`)
  }
  return 'Схвалено'
}

async function rejectClaim(id: number, reason: string, msg?: Msg) {
  const payload = await getPayload({ config: configPromise })
  const claim = (await payload.findByID({ collection: 'claims', id, depth: 0, overrideAccess: true }).catch(() => null)) as Claim | null
  if (!claim) return 'Заявку не знайдено'
  if (claim.status === 'approved') return 'Заявку вже схвалено — відхилити можна лише в адмінці'
  if (claim.status !== 'rejected') await payload.update({ collection: 'claims', id, data: { status: 'rejected', rejectReason: reason }, overrideAccess: true, depth: 0 })
  await markMessage(msg, `Відхилено${reason ? `: ${reason}` : ''}`, [[{ text: '🔗 Відкрити в адмінці', url: adminUrl('claims', id) }]])
  return 'Відхилено'
}

/** Publishes the owner's latest draft as it is. Owner free text stays internal (never rendered) until we rewrite it. */
async function publishOwnerDraft(studioId: number, force: boolean, msg?: Msg) {
  const payload = await getPayload({ config: configPromise })
  const draft = (await payload.findByID({ collection: 'studios', id: studioId, depth: 0, draft: true, overrideAccess: true }).catch(() => null)) as Studio | null
  if (!draft) return 'Студію не знайдено'
  if (!draft.pendingOwnerChanges) {
    await markMessage(msg, 'Вже опубліковано', [[{ text: '👀 Переглянути', url: adminUrl('studios', studioId) }]])
    return 'Нових змін немає'
  }
  const hasText = Boolean((draft.ownerAbout ?? '').trim() || (draft.ownerNews ?? '').trim())
  if (hasText && !force) {
    await say(
      `${draft.name}: власник додав текст «своїми словами» — його треба переписати голосом сайту в адмінці. Можна опублікувати решту змін (ціни, умови, фото) вже зараз — текст лишиться внутрішнім.`,
      { reply_markup: { inline_keyboard: [[{ text: '✅ Опублікувати без тексту', callback_data: `s:n:${studioId}` }, { text: '👀 Переглянути', url: adminUrl('studios', studioId) }]] } },
    )
    return 'Спершу перепишіть текст або опублікуйте без нього'
  }
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = draft as Studio & Record<string, unknown>
  await payload.update({
    collection: 'studios',
    id: studioId,
    data: { ...data, _status: 'published', pendingOwnerChanges: false } as Partial<Studio>,
    overrideAccess: true,
    depth: 0,
  })
  await markMessage(msg, 'Опубліковано', [[{ text: '👀 Профіль', url: `${siteUrl()}/vyrobnyky/${draft.slug}` }]])
  return 'Опубліковано'
}

const REQUEST_ACTIONS: Record<string, string> = { w: 'in_progress', f: 'forwarded', x: 'closed' }

async function setRequestStatus(id: number, action: string, msg?: Msg) {
  const status = REQUEST_ACTIONS[action]
  if (!status) return 'Невідома дія'
  const payload = await getPayload({ config: configPromise })
  const doc = await payload.findByID({ collection: 'requests', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!doc) return 'Запит не знайдено'
  if (doc.status !== status) await payload.update({ collection: 'requests', id, data: { status: status as typeof doc.status }, overrideAccess: true, depth: 0 })
  const label = REQUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  const next: TgKeyboard =
    status === 'closed'
      ? [[{ text: '🔗 В адмінці', url: adminUrl('requests', id) }]]
      : [
          [
            ...(status !== 'forwarded' ? [{ text: '✅ Передано студіям', callback_data: `r:f:${id}` }] : []),
            { text: '🗄 Закрити', callback_data: `r:x:${id}` },
          ],
          [{ text: '🔗 В адмінці', url: adminUrl('requests', id) }],
        ]
  await markMessage(msg, `Статус: ${label}`, next)
  return label
}

export async function legacyTelegramPOST(req: Request) {
  if (!secretOk(req)) return new Response('forbidden', { status: 403 })
  const update = (await req.json().catch(() => null)) as Update | null
  if (!update) return Response.json({ ok: true })

  try {
    const cq = update.callback_query
    if (cq) {
      if (!ourChat(cq.from.id) && !ourChat(cq.message?.chat.id)) {
        await tg('answerCallbackQuery', { callback_query_id: cq.id })
        return Response.json({ ok: true })
      }
      const [kind, action, raw] = (cq.data ?? '').split(':')
      const id = Number(raw)
      let answer = ''
      if (!Number.isInteger(id) || id <= 0) answer = 'Невідома дія'
      else if (kind === 'c' && action === 'a') answer = await approveClaim(id, cq.message)
      else if (kind === 'c' && action === 'r') {
        await say(`${REJECT_PROMPT}${id}: відповідайте на це повідомлення.`, {
          reply_markup: { force_reply: true, input_field_placeholder: 'Причина відмови' },
        })
        await say(`Або відхилити заявку #${id} без причини:`, { reply_markup: { inline_keyboard: [[{ text: 'Відхилити без причини', callback_data: `c:n:${id}` }]] } })
        answer = 'Напишіть причину'
      } else if (kind === 'c' && action === 'n') answer = await rejectClaim(id, '', cq.message)
      else if (kind === 's' && action === 'p') answer = await publishOwnerDraft(id, false, cq.message)
      else if (kind === 's' && action === 'n') answer = await publishOwnerDraft(id, true, cq.message)
      else if (kind === 'r') answer = await setRequestStatus(id, action, cq.message)
      else answer = 'Невідома дія'
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: answer.slice(0, 190) })
      return Response.json({ ok: true })
    }

    // A reply to «Причина відмови для заявки #id» rejects that claim with the reply text as the reason.
    const m = update.message
    if (m && ourChat(m.chat.id) && m.reply_to_message?.text?.startsWith(REJECT_PROMPT)) {
      const id = Number(m.reply_to_message.text.slice(REJECT_PROMPT.length).match(/^\d+/)?.[0])
      if (id) {
        const result = await rejectClaim(id, (m.text ?? '').trim().slice(0, 500))
        await say(`Заявка #${id}: ${result}.`)
      }
    }
  } catch (err) {
    console.error(`Telegram webhook error: ${String(err).slice(0, 300)}`)
  }
  return Response.json({ ok: true })
}
