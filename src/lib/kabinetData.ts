import 'server-only'

import { headers } from 'next/headers'

import { currentUser } from '@/server/auth/guards'
import { db } from '@/server/db'
import { ownerStudioSummaries, sectionPage } from '@/server/services/kabinet'
import type { KabinetSection } from '@/shared/options'
import type { SectionPage, StudioSummary } from '@/shared/kabinet'

// What the /kabinet pages read: the owner's Better Auth session and their studios in the app schema.
// 'login' = not signed in as an owner; null = not this owner's studio (or no such studio).

async function ownerId() {
  const u = await currentUser(await headers())
  return u && u.role === 'owner' ? u : null
}

export async function kabinetOwner(): Promise<{ name: string; studios: StudioSummary[] } | null> {
  const u = await ownerId()
  return u ? { name: u.name, studios: await ownerStudioSummaries(db, u.id) } : null
}

export async function kabinetSection<S extends KabinetSection>(slug: string, section: S): Promise<SectionPage<S> | 'login' | null> {
  const u = await ownerId()
  return u ? sectionPage(db, u.id, slug, section) : 'login'
}
