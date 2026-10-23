// Telegram Bot API client (TELEGRAM_BOT_TOKEN; TELEGRAM_API_BASE points at a fake for end-to-end checks, see
// scripts/smoke/fake-telegram.mjs). Messages go to the owner's chat (TELEGRAM_CHAT_ID); inline buttons are
// answered by the webhook in src/app/api/telegram/webhook through actions.ts. Never throws: a failed notification
// must not break the action that triggered it.

export type TgButton = { text: string; callback_data?: string; url?: string }
export type TgKeyboard = TgButton[][]

/** Calls a Bot API method; returns the parsed `result` or null. Logs failures without the token. */
export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`${process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org'}/bot${token}/${method}`, {
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
