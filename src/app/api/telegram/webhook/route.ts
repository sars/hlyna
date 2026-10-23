import { timingSafeEqual } from 'node:crypto'

import { tg } from '@/server/telegram/tg'
import { chat, chatEnabled } from '@/server/chatAdapter'
import { site } from '@/content/site'
import { db } from '@/server/db'
import type { Actor } from '@/server/services/audit'
import { handleTap, tapRejectClaim, type TgKeyboard } from '@/server/telegram/actions'
import { linkOwnerTelegram, START_TOKEN_RE } from '@/server/services/ownerTelegram'

// Telegram bot webhook: the buttons under our notifications (claims, owner edits, customer requests). Every action
// runs through the same services as /panel (src/server/telegram/actions.ts → src/server/services/*), so a tap and a
// click do the same thing and both land in the audit log (source «telegram»).
// Accepts only Telegram (secret header set with setWebhook) and only our chat (TELEGRAM_CHAT_ID). Idempotent.
// The site chat (src/chat) sees every update first: its buttons (`ch:`), the owner's Reply to a conversation,
// and visitors who continued a conversation in Telegram (any other chat).

type Msg = { message_id: number; chat: { id: number }; text?: string; reply_to_message?: { message_id: number; text?: string } }
type Update = {
  callback_query?: { id: string; from: { id: number }; data?: string; message?: Msg }
  message?: Msg & { from?: { id: number } }
}

const REJECT_PROMPT = 'Причина відмови для заявки #'
const actor: Actor = { id: null, source: 'telegram' }

function secretOk(req: Request) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
  if (!want || want.length !== got.length) return false
  return timingSafeEqual(Buffer.from(want), Buffer.from(got))
}

const ourChat = (id?: number) => Boolean(id) && String(id) === String(process.env.TELEGRAM_CHAT_ID)
const stamp = () => new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', dateStyle: 'short', timeStyle: 'short' }).format(new Date())

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

export async function POST(req: Request) {
  if (!secretOk(req)) return new Response('forbidden', { status: 403 })
  const update = (await req.json().catch(() => null)) as Update | null
  if (!update) return Response.json({ ok: true })

  try {
    // A studio owner linking their Telegram from the cabinet (`t.me/<bot>?start=k_<token>`): before the site chat, which
    // otherwise treats every unknown chat as a visitor.
    const start = update.message?.text?.trim().match(START_TOKEN_RE)
    if (start && update.message) {
      const linked = await linkOwnerTelegram(db, start[1]!, update.message.chat.id, actor)
      await tg('sendMessage', {
        chat_id: update.message.chat.id,
        text: linked
          ? `Готово, ${linked.name}. Нові замовлення з крамниці «Глина» для ваших студій приходитимуть сюди — з кнопками «Підтвердити» і «Відправлено». Відключити можна в кабінеті.`
          : `Посилання не впізнано. Відкрийте кабінет студії на ${site.url}/kabinet і натисніть «Підключити Telegram» ще раз.`,
        disable_web_page_preview: true,
      })
      return Response.json({ ok: true })
    }
    if (chatEnabled() && (await chat().handleTelegramUpdate(update, String(process.env.TELEGRAM_CHAT_ID ?? ''), site.url))) return Response.json({ ok: true })
    const cq = update.callback_query
    if (cq) {
      const ours = ourChat(cq.from.id) || ourChat(cq.message?.chat.id)
      // Order buttons may be tapped in a studio owner's own chat (tapOrder checks the chat owns the studio); everything else is ours only.
      if (!ours && !(cq.data ?? '').startsWith('o:')) {
        await tg('answerCallbackQuery', { callback_query_id: cq.id })
        return Response.json({ ok: true })
      }
      const r = await handleTap(db, cq.data ?? '', actor, { ourChat: ours, chatId: cq.message?.chat.id ?? cq.from.id })
      if (r.askReason) {
        await say(`${REJECT_PROMPT}${r.askReason}: відповідайте на це повідомлення.`, { reply_markup: { force_reply: true, input_field_placeholder: 'Причина відмови' } })
        await say(`Або відхилити заявку #${r.askReason} без причини:`, { reply_markup: { inline_keyboard: [[{ text: 'Відхилити без причини', callback_data: `c:n:${r.askReason}` }]] } })
      }
      if (r.mark) await markMessage(cq.message, r.mark.line, r.mark.keyboard)
      for (const m of r.say ?? []) await say(m.text, m.keyboard ? { reply_markup: { inline_keyboard: m.keyboard } } : {})
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: r.answer.slice(0, 190) })
      return Response.json({ ok: true })
    }

    // A reply to «Причина відмови для заявки #id» rejects that claim with the reply text as the reason.
    const m = update.message
    if (m && ourChat(m.chat.id) && m.reply_to_message?.text?.startsWith(REJECT_PROMPT)) {
      const id = Number(m.reply_to_message.text.slice(REJECT_PROMPT.length).match(/^\d+/)?.[0])
      if (id) {
        const r = await tapRejectClaim(db, id, (m.text ?? '').trim().slice(0, 500), actor)
        await say(`Заявка #${id}: ${r.answer}.`)
      }
    }
  } catch (err) {
    console.error(`Telegram webhook error: ${String(err).slice(0, 300)}`)
  }
  return Response.json({ ok: true })
}
