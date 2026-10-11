import { eq, inArray } from 'drizzle-orm'

import type { Db } from '../../db'
import { cities, studios } from '../../db/schema/catalog'
import { slugifyUk } from '../../../utilities/transliterateUk'
import { audit, type Actor } from '../audit'
import { writeStudio } from './runs'

// Small editorial scripts on the new stack (ported from set-status.ts and apply-fixes.ts).

/** Show or hide studios by slug (Payload «published/draft» is visibility «public/hidden» now). */
export async function setVisibility(db: Db, slugs: string[], visibility: 'public' | 'hidden', actor: Actor) {
  const rows = slugs.length ? await db.select({ id: studios.id, slug: studios.slug }).from(studios).where(inArray(studios.slug, slugs)) : []
  const missing = slugs.filter((s) => !rows.some((r) => r.slug === s))
  for (const r of rows) await db.transaction((tx) => writeStudio(tx, r.id, { visibility }, undefined, actor, visibility === 'public' ? 'Опубліковано' : 'Приховано'))
  return { changed: rows.map((r) => r.slug), missing }
}

export type Fix = { slug: string; name?: string; summary?: string; publicDescription?: string; city?: string; address?: string }

/** Copy and data fixes by slug; a new city is created when needed (slug from the Ukrainian name). */
export async function applyFixes(db: Db, fixes: Fix[], actor: Actor) {
  let fixed = 0
  const missing: string[] = []
  for (const f of fixes) {
    const [s] = await db.select({ id: studios.id }).from(studios).where(eq(studios.slug, f.slug)).limit(1)
    if (!s) { missing.push(f.slug); continue }
    await db.transaction(async (tx) => {
      const patch: Partial<typeof studios.$inferInsert> = {}
      if (f.name) patch.name = f.name
      if (f.summary) patch.summary = f.summary.slice(0, 200)
      if (f.publicDescription) patch.publicDescription = f.publicDescription
      if (f.address !== undefined) patch.address = f.address || null
      if (f.city) {
        const slug = slugifyUk(f.city)
        let [city] = await tx.select({ id: cities.id }).from(cities).where(eq(cities.slug, slug)).limit(1)
        if (!city) {
          ;[city] = await tx.insert(cities).values({ name: f.city, slug }).returning({ id: cities.id })
          await audit(tx, actor, 'city', city!.id, 'create', { name: { from: null, to: f.city } })
        }
        patch.cityId = city!.id
      }
      await writeStudio(tx, s.id, patch, undefined, actor, 'Виправлення')
    })
    fixed++
  }
  return { fixed, missing }
}
