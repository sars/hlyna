import 'server-only'

import { headers } from 'next/headers'

import { appBackend } from './backend'

// What the /kabinet pages read, on either backend. Until cutover the default is Payload (lib/kabinet); with
// DATA_BACKEND=app the same pages read Better Auth sessions and the app schema. Pages import only this file.

export type KabinetOwner = { name: string; studios: { id: number; name: string; slug: string; pending: boolean }[] }

export async function kabinetOwner(): Promise<KabinetOwner | null> {
  if (appBackend()) {
    const { currentUser } = await import('@/server/auth/guards')
    const { ownerStudios } = await import('@/server/services/kabinet')
    const { db } = await import('@/server/db')
    const u = await currentUser(await headers())
    if (!u || u.role !== 'owner') return null
    return { name: u.name, studios: await ownerStudios(db, u.id) }
  }
  const { currentOwner, payloadClient } = await import('./kabinet')
  const owner = await currentOwner()
  if (!owner) return null
  const payload = await payloadClient()
  const ids = (owner.studios ?? []).map((s) => (typeof s === 'object' ? s.id : s))
  const studios = ids.length
    ? (await payload.find({ collection: 'studios', where: { id: { in: ids } }, depth: 0, limit: 20, draft: true, overrideAccess: true, select: { name: true, slug: true, pendingOwnerChanges: true } })).docs
    : []
  return { name: owner.name, studios: studios.map((s) => ({ id: s.id, name: s.name, slug: s.slug ?? '', pending: Boolean(s.pendingOwnerChanges) })) }
}

export type { OwnerEditInitial } from '@/server/services/kabinet'
import type { OwnerEditInitial } from '@/server/services/kabinet'

/** 'login' = not signed in; null = not this owner's studio (or no such studio). */
export async function kabinetEdit(slug: string): Promise<{ name: string; initial: OwnerEditInitial } | 'login' | null> {
  if (appBackend()) {
    const { currentUser } = await import('@/server/auth/guards')
    const { ownerEditInitial } = await import('@/server/services/kabinet')
    const { db } = await import('@/server/db')
    const u = await currentUser(await headers())
    if (!u || u.role !== 'owner') return 'login'
    return ownerEditInitial(db, u.id, slug)
  }
  const { currentOwner, ownedStudio } = await import('./kabinet')
  const owner = await currentOwner()
  if (!owner) return 'login'
  const s = await ownedStudio(owner, slug)
  if (!s) return null
  const t = (v?: string | null) => v ?? ''
  return {
    name: s.name,
    initial: {
      slug,
      name: s.name,
      publicNow: t(s.publicDescription || s.summary),
      ownerAbout: t(s.ownerAbout),
      ownerNews: t(s.ownerNews),
      ownerQuote: t(s.ownerQuote),
      services: (s.services ?? []).map((x) => x.text),
      products: (s.products ?? []).map((x) => x.text),
      prices: (s.prices ?? []).map((p) => ({ text: p.text, date: t(p.date), source: t(p.source) })),
      address: t(s.address),
      website: t(s.website),
      instagram: t(s.instagram),
      phone: t(s.phone),
      email: t(s.email),
      b2b: {
        minOrder: t(s.b2b?.minOrder),
        leadTime: t(s.b2b?.leadTime),
        logoMethods: (s.b2b?.logoMethods ?? []).map((x) => x.text),
        foodSafe: Boolean(s.b2b?.foodSafe),
        dishwasherSafe: Boolean(s.b2b?.dishwasherSafe),
        worksWithHoreca: Boolean(s.b2b?.worksWithHoreca),
        worksWithCorporate: Boolean(s.b2b?.worksWithCorporate),
      },
      photos: (s.photos ?? [])
        .filter((p): p is Exclude<typeof p, number> => typeof p === 'object')
        .map((p) => ({ id: p.id, url: p.sizes?.small?.url ?? p.url ?? '', alt: t(p.alt) })),
      instagramPosts: (s.activity?.instagramPosts ?? []).map((x) => x.url),
      pending: Boolean(s.pendingOwnerChanges),
    },
  }
}
