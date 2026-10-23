import { randomBytes } from 'node:crypto'

import { and, eq, isNotNull } from 'drizzle-orm'

import type { Db } from '../db'
import { studioOwner, user } from '../db/schema/auth'
import { audit, type Actor } from './audit'

// A studio owner's Telegram: the cabinet shows a one-tap link `t.me/<bot>?start=k_<token>`; the webhook sees the
// /start, matches the token to the owner and keeps their chat id. From then on new shop orders of their studios reach
// that chat with buttons (docs/shop/PLAN.md). The same bot serves the owner's group and the site chat's visitors.

/** The owner's link token, made on first use and kept (reopening the link re-links a new chat). */
export async function telegramLinkToken(db: Db, userId: string): Promise<string> {
  const [u] = await db.select({ token: user.telegramLinkToken }).from(user).where(eq(user.id, userId)).limit(1)
  if (u?.token) return u.token
  const token = randomBytes(18).toString('base64url')
  await db.update(user).set({ telegramLinkToken: token }).where(eq(user.id, userId))
  return token
}

/** The deep link for the cabinet, or null when the bot's username is not configured (TELEGRAM_BOT_USERNAME). */
export const telegramStartLink = (token: string) => (process.env.TELEGRAM_BOT_USERNAME ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=k_${token}` : null)

export const START_TOKEN_RE = /^\/start\s+k_([A-Za-z0-9_-]{16,64})$/

/** `/start k_<token>` from a chat: remembers the chat for that owner. Returns who was linked, or null for an unknown token. */
export async function linkOwnerTelegram(db: Db, token: string, chatId: number, actor: Actor): Promise<{ userId: string; name: string } | null> {
  const [u] = await db
    .select({ id: user.id, name: user.name, chatId: user.telegramChatId })
    .from(user)
    .where(and(eq(user.telegramLinkToken, token), eq(user.role, 'owner'), eq(user.active, true)))
    .limit(1)
  if (!u) return null
  if (u.chatId !== chatId) {
    await db.update(user).set({ telegramChatId: chatId }).where(eq(user.id, u.id))
    await audit(db, actor, 'user', u.id, 'update', { telegramChatId: { from: u.chatId, to: chatId } })
  }
  return { userId: u.id, name: u.name }
}

/** «Відключити» in the cabinet. */
export async function unlinkOwnerTelegram(db: Db, userId: string, actor: Actor) {
  const [u] = await db.select({ chatId: user.telegramChatId }).from(user).where(eq(user.id, userId)).limit(1)
  if (!u?.chatId) return
  await db.update(user).set({ telegramChatId: null }).where(eq(user.id, userId))
  await audit(db, actor, 'user', userId, 'update', { telegramChatId: { from: u.chatId, to: null } })
}

/** Whether the owner has a linked chat (the cabinet's state line). */
export async function ownerTelegramLinked(db: Db, userId: string): Promise<boolean> {
  const [u] = await db.select({ chatId: user.telegramChatId }).from(user).where(eq(user.id, userId)).limit(1)
  return u?.chatId != null
}

/** The linked chats of a studio's owners: where its new orders go. */
export async function studioOwnerChats(db: Db, studioId: number): Promise<{ userId: string; chatId: number }[]> {
  const rows = await db
    .select({ userId: user.id, chatId: user.telegramChatId })
    .from(studioOwner)
    .innerJoin(user, eq(user.id, studioOwner.userId))
    .where(and(eq(studioOwner.studioId, studioId), isNotNull(user.telegramChatId), eq(user.active, true)))
  return rows.flatMap((r) => (r.chatId == null ? [] : [{ userId: r.userId, chatId: r.chatId }]))
}

/** The owner behind a Telegram chat, for taps on order buttons from their own chat. */
export async function ownerByChat(db: Db, chatId: number): Promise<{ id: string; name: string } | null> {
  const [u] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.telegramChatId, chatId), eq(user.role, 'owner'), eq(user.active, true)))
    .limit(1)
  return u ?? null
}
