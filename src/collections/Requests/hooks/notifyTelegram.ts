import type { CollectionAfterChangeHook } from 'payload'

import { requestKeyboard, tg } from '../../../lib/telegram'
import { REQUEST_WHAT_OPTIONS } from '../options'

const line = (label: string, value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null
  return `${label}: ${String(value)}`
}

/**
 * Sends a plain-text Telegram message about every new request.
 * Never throws: a failed notification must not lose the request.
 */
export const notifyTelegram: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  try {
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
      req.payload.logger.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set; skipping request notification')
      return doc
    }

    const what = REQUEST_WHAT_OPTIONS.find((o) => o.value === doc.what)?.label || doc.what

    const text = [
      doc.what === 'studio' ? `Студія #${doc.id}: додати / оновити профіль` : `Новий запит #${doc.id}: ${what}`,
      line('Студія', doc.studioName),
      line('Instagram / сайт', doc.studioLinks),
      line('Згода на фото', doc.what === 'studio' ? (doc.photoConsent ? 'так' : 'ні') : null),
      line('Деталі', doc.details),
      line('Кількість', doc.quantity),
      line('Термін', doc.deadline),
      line('Місто', doc.city),
      line('Бюджет за одиницю', doc.budgetPerItem),
      line('Логотип', doc.logo ? 'так' : null),
      line("Ім'я", doc.contactName),
      line('Телефон/Telegram', doc.contactPhoneOrTelegram),
      line('Email', doc.contactEmail),
      line('Сторінка', doc.sourcePage),
    ]
      .filter((l): l is string => l !== null)
      .join('\n')
      .slice(0, 4000)

    await tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, reply_markup: { inline_keyboard: requestKeyboard(doc.id) } })
  } catch (err) {
    req.payload.logger.error({ err, msg: 'Telegram notification error' })
  }

  return doc
}
