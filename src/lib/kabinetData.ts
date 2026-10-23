import 'server-only'

import { headers } from 'next/headers'

import { currentUser } from '@/server/auth/guards'
import { db } from '@/server/db'
import { loadOwned, ownerStudioSummaries, sectionPage, summarize } from '@/server/services/kabinet'
import { getOrder, listOrders } from '@/server/services/orders'
import { ownerTelegramLinked, telegramLinkToken, telegramStartLink } from '@/server/services/ownerTelegram'
import type { KabinetSection } from '@/shared/options'
import type { SectionPage, StudioSummary } from '@/shared/kabinet'

// What the /kabinet pages read: the owner's Better Auth session and their studios in the app schema.
// 'login' = not signed in as an owner; null = not this owner's studio (or no such studio).

async function ownerId() {
  const u = await currentUser(await headers())
  return u && u.role === 'owner' ? u : null
}

export async function kabinetOwner(): Promise<{ name: string; studios: StudioSummary[]; telegram: { linked: boolean; link: string | null } } | null> {
  const u = await ownerId()
  if (!u) return null
  const linked = await ownerTelegramLinked(db, u.id)
  // The start token is minted only for an owner who still has to link the chat.
  const link = linked || !process.env.TELEGRAM_BOT_USERNAME ? null : telegramStartLink(await telegramLinkToken(db, u.id))
  return { name: u.name, studios: await ownerStudioSummaries(db, u.id), telegram: { linked, link } }
}

/** The studio's orders (open ones, or all with `all`), newest first; 'login' / null as in kabinetSection. */
export async function kabinetOrders(slug: string, all: boolean) {
  const u = await ownerId()
  if (!u) return 'login' as const
  const l = await loadOwned(db, u.id, slug)
  if (!l) return null
  const { rows, hasMore } = await listOrders(db, { studioId: l.s.id, status: all ? undefined : 'open' })
  return { studio: summarize(l), rows, hasMore }
}

/** One order of the owner's studio. */
export async function kabinetOrder(slug: string, id: number) {
  const u = await ownerId()
  if (!u) return 'login' as const
  const l = await loadOwned(db, u.id, slug)
  if (!l) return null
  const order = await getOrder(db, id)
  return order && order.studioId === l.s.id ? { studio: summarize(l), order } : null
}

export async function kabinetSection<S extends KabinetSection>(slug: string, section: S): Promise<SectionPage<S> | 'login' | null> {
  const u = await ownerId()
  return u ? sectionPage(db, u.id, slug, section) : 'login'
}
