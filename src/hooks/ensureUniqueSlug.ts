import type { CollectionBeforeValidateHook, CollectionSlug, Where } from 'payload'

import { slugifyUk } from '../utilities/transliterateUk'

/**
 * Fills `slug` from another field (transliterated Ukrainian → Latin) when empty,
 * normalises user-entered slugs and appends -2, -3… when the slug is taken.
 */
export const ensureUniqueSlug =
  ({ collection, from }: { collection: CollectionSlug; from: string }): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req }) => {
    if (!data) return data

    const source =
      (typeof data.slug === 'string' && data.slug.trim()) ||
      (typeof originalDoc?.slug === 'string' && originalDoc.slug) ||
      (typeof data[from] === 'string' && data[from]) ||
      (typeof originalDoc?.[from] === 'string' && originalDoc[from]) ||
      ''

    const base = slugifyUk(String(source)) || 'item'
    const ownId = originalDoc?.id

    let candidate = base
    for (let n = 2; n < 200; n++) {
      const where: Where = { slug: { equals: candidate } }
      if (ownId !== undefined) where.id = { not_equals: ownId }
      const existing = await req.payload.find({
        collection,
        where,
        limit: 1,
        depth: 0,
        pagination: false,
        draft: true,
        req,
      })
      if (existing.docs.length === 0) break
      candidate = `${base}-${n}`
    }

    data.slug = candidate
    return data
  }
