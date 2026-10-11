import 'server-only'

import { headers } from 'next/headers'

import { currentUser } from '@/server/auth/guards'
import { db } from '@/server/db'
import { ownerEditInitial, ownerStudios } from '@/server/services/kabinet'
import type { OwnerEditInitial } from '@/server/services/kabinet'

// What the /kabinet pages read: the owner's Better Auth session and their studios in the app schema.

export type KabinetOwner = { name: string; studios: { id: number; name: string; slug: string; pending: boolean }[] }

export async function kabinetOwner(): Promise<KabinetOwner | null> {
  const u = await currentUser(await headers())
  if (!u || u.role !== 'owner') return null
  return { name: u.name, studios: await ownerStudios(db, u.id) }
}

export type { OwnerEditInitial }

/** 'login' = not signed in; null = not this owner's studio (or no such studio). */
export async function kabinetEdit(slug: string): Promise<{ name: string; initial: OwnerEditInitial } | 'login' | null> {
  const u = await currentUser(await headers())
  if (!u || u.role !== 'owner') return 'login'
  return ownerEditInitial(db, u.id, slug)
}
