import type { CollectionAfterChangeHook } from 'payload'

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
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) {
      req.payload.logger.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set; skipping request notification')
      return doc
    }

    const what = REQUEST_WHAT_OPTIONS.find((o) => o.value === doc.what)?.label || doc.what
    const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')

    const text = [
      `Новий запит #${doc.id}: ${what}`,
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
      '',
      `${serverUrl}/admin/collections/requests/${doc.id}`,
    ]
      .filter((l): l is string => l !== null)
      .join('\n')
      .slice(0, 4000)

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      req.payload.logger.error(`Telegram sendMessage failed: ${res.status} ${body.slice(0, 300)}`)
    }
  } catch (err) {
    req.payload.logger.error({ err, msg: 'Telegram notification error' })
  }

  return doc
}
