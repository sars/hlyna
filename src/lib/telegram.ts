// Plain-text Telegram message to the site owner (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).
// Never throws: a failed notification must not break the action that triggered it.
export async function notifyOwnerTelegram(lines: (string | null | undefined | false)[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  const text = lines.filter((l): l is string => typeof l === 'string').join('\n').slice(0, 4000)
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    /* ignore */
  }
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua').replace(/\/$/, '')
