// Telegram messages to the site owner (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID), optionally with inline buttons
// that the webhook in app/(payload)/api/telegram/webhook handles. Never throws: a failed notification must not
// break the action that triggered it.

export type TgButton = { text: string; callback_data?: string; url?: string }
export type TgKeyboard = TgButton[][]

export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua').replace(/\/$/, '')
export const adminUrl = (collection: string, id: number | string) => `${siteUrl()}/admin/collections/${collection}/${id}`

/** Calls a Bot API method; returns the parsed `result` or null. Logs failures without the token. */
export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null
    if (!json?.ok) {
      console.error(`Telegram ${method} failed: ${res.status} ${json?.description ?? ''}`.slice(0, 300))
      return null
    }
    return json.result ?? null
  } catch (err) {
    console.error(`Telegram ${method} error: ${String(err).slice(0, 200)}`)
    return null
  }
}

/** Sends a plain-text message (with optional inline keyboard) to the site owner's chat. */
export async function notifyOwnerTelegram(lines: (string | null | undefined | false)[], keyboard?: TgKeyboard): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return
  const text = lines.filter((l): l is string => typeof l === 'string').join('\n').slice(0, 4000)
  await tg('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  })
}

// Inline keyboards. callback_data stays short (Telegram limit: 64 bytes): <kind>:<action>:<id>.
export const claimKeyboard = (id: number): TgKeyboard => [
  [
    { text: '✅ Схвалити', callback_data: `c:a:${id}` },
    { text: '❌ Відхилити', callback_data: `c:r:${id}` },
  ],
  [{ text: '🔗 Відкрити в адмінці', url: adminUrl('claims', id) }],
]

export const ownerEditKeyboard = (studioId: number): TgKeyboard => [
  [
    { text: '👀 Переглянути', url: adminUrl('studios', studioId) },
    { text: '✅ Опублікувати', callback_data: `s:p:${studioId}` },
  ],
]

export const requestKeyboard = (id: number): TgKeyboard => [
  [
    { text: '📨 Взято в роботу', callback_data: `r:w:${id}` },
    { text: '✅ Передано студіям', callback_data: `r:f:${id}` },
  ],
  [
    { text: '🗄 Закрити', callback_data: `r:x:${id}` },
    { text: '🔗 В адмінці', url: adminUrl('requests', id) },
  ],
]
