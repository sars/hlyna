import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import type { Studio, StudioOwner } from '@/payload-types'
import { OWNER_COOKIE, passwordFingerprint, readSession } from './ownerAuth'

export const payloadClient = () => getPayload({ config: configPromise })

/** The signed-in studio owner, or null. Checks the session signature, the password fingerprint and `active`. */
export async function currentOwner(): Promise<StudioOwner | null> {
  const s = readSession((await cookies()).get(OWNER_COOKIE)?.value)
  if (!s) return null
  const payload = await payloadClient()
  const owner = await payload.findByID({ collection: 'studio-owners', id: s.ownerId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!owner?.active || !owner.passwordHash || passwordFingerprint(owner.passwordHash) !== s.pw) return null
  return owner
}

export const ownerStudioIds = (owner: StudioOwner): number[] =>
  (owner.studios ?? []).map((s) => (typeof s === 'object' ? s.id : s)).filter(Boolean) as number[]

/** Latest version (draft if the owner has unpublished edits) of one of the owner's studios, by slug. */
export async function ownedStudio(owner: StudioOwner, slug: string): Promise<Studio | null> {
  const payload = await payloadClient()
  const doc = (
    await payload.find({ collection: 'studios', where: { slug: { equals: slug } }, depth: 1, limit: 1, draft: true, overrideAccess: true })
  ).docs[0]
  if (!doc || !ownerStudioIds(owner).includes(doc.id)) return null
  return doc
}

// Fields an owner may change. Everything else (status, sources, consent notes, internal description, requests…) stays admin-only.
export const OWNER_FIELDS = [
  'ownerAbout', // internal, rewritten by us
  'ownerNews', // internal, rewritten by us
  'ownerQuote', // shown only after approval
  'services',
  'products',
  'prices',
  'address',
  'website',
  'instagram',
  'phone',
  'email',
  'b2b',
] as const

export const MAX_PHOTOS = 10
