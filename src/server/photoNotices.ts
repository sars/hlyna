import { db } from './db'
import { sendDuePhotoNotices } from './services/kabinetPhotos'

// Owner photo changes reach the editor in Telegram ten minutes after the owner's last photo action; this timer looks for
// due notices every minute. Only where the bot is configured. Safe with several instances: a notice is claimed atomically.

/** Starts the once-a-minute check (a second call, e.g. after a dev reload, does nothing). */
export function startPhotoNotices() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return
  const g = globalThis as { __photoNoticeTimer?: ReturnType<typeof setInterval> }
  if (g.__photoNoticeTimer) return
  g.__photoNoticeTimer = setInterval(() => {
    sendDuePhotoNotices(db).catch((e) => console.error('Photo notices error', String(e).slice(0, 200)))
  }, 60_000)
  g.__photoNoticeTimer.unref()
}
