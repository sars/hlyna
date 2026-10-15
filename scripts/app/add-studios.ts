// New studios from research (Instagram scans, owners' messages) through createStudio (row, prices, first revision, audit):
//   ADD=path pnpm exec tsx scripts/app/add-studios.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "slug", "name", "shortName"?, "type" (one of STUDIO_TYPES), "city"? (city name in app.cities), "status"?, "confidence"?,
//      "summary", "recentNote"?, "address"?, "instagram"?, "website"?, "formats"? (STUDIO_FORMATS), "products"?, "services"?,
//      "salesChannels"?, "sources"?, "instagramPosts"?, "prices"?: [text…], "followers"?, "lastPost"? (YYYY-MM-DD), "checked"? (YYYY-MM-DD),
//      "note"? (internal) }]
// A slug that is taken (or was a studio's slug before) stops the run. Studios are published (visibility public).
// Afterwards: tag-studios.ts (format tags), and geocode.ts with SLUGS=… when an address is set.
import fs from 'node:fs'
import { eq, or } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { cities, studios, studioSlugHistory } from '../../src/server/db/schema/catalog'
import { webUrl } from '../../src/lib/present'
import { SLUG_RE, STUDIO_FORMATS, STUDIO_TYPES, type StudioFormat, type StudioType } from '../../src/shared/options'
import { createStudio } from '../../src/server/services/studios'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'

type Add = {
  slug: string; name: string; shortName?: string; type: StudioType; city?: string; status?: 'active' | 'unclear'; confidence?: 'high' | 'medium' | 'low'
  summary: string; recentNote?: string; address?: string; instagram?: string; website?: string
  formats?: StudioFormat[]; products?: string[]; services?: string[]; salesChannels?: string[]; sources?: string[]; instagramPosts?: string[]
  prices?: string[]; followers?: number; lastPost?: string; checked?: string; note?: string
}

const { dry } = guard('add-studios')
const adds = JSON.parse(fs.readFileSync(process.env.ADD || '/tmp/hlyna-add.json', 'utf8')) as Add[]
const actor = scriptActor('add-studios')

// Check everything before writing anything.
const cityIds = new Map<string, number>()
for (const a of adds) {
  if (!SLUG_RE.test(a.slug)) throw new Error(`${a.slug}: bad slug`)
  if (!(STUDIO_TYPES as readonly string[]).includes(a.type)) throw new Error(`${a.slug}: unknown type ${a.type}`)
  for (const f of a.formats ?? []) if (!(STUDIO_FORMATS as readonly string[]).includes(f)) throw new Error(`${a.slug}: unknown format ${f}`)
  for (const [k, v] of [['instagram', a.instagram], ['website', a.website]] as const) if (v && webUrl(v) !== v) throw new Error(`${a.slug}: ${k} must be an absolute http(s) URL`)
  const taken = await db.select({ id: studios.id }).from(studios).where(eq(studios.slug, a.slug)).limit(1)
  const old = await db.select({ s: studioSlugHistory.oldSlug }).from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, a.slug)).limit(1)
  if (taken.length || old.length) throw new Error(`${a.slug}: slug is taken`)
  if (a.instagram) {
    const dup = await db.select({ slug: studios.slug }).from(studios).where(or(eq(studios.instagram, a.instagram), eq(studios.instagram, a.instagram.replace(/\/$/, '')))).limit(1)
    if (dup.length) throw new Error(`${a.slug}: Instagram already belongs to ${dup[0]!.slug}`)
  }
  if (a.city) {
    const [c] = await db.select({ id: cities.id }).from(cities).where(eq(cities.name, a.city)).limit(1)
    if (!c) throw new Error(`${a.slug}: no city «${a.city}»`)
    cityIds.set(a.city, c.id)
  }
  console.log(`${a.slug}: ${a.shortName ?? a.name} · ${a.type} · ${a.city ?? '—'} · ${(a.formats ?? []).join(',') || 'no formats'} · ${a.prices?.length ?? 0} prices`)
}

const run = dry ? 0 : await startRun(db, 'add-studios', `${adds.length} studios`)
let added = 0
if (!dry) {
  for (const a of adds) {
    await db.transaction((tx) =>
      createStudio(
        tx,
        {
          slug: a.slug, name: a.name, shortName: a.shortName ?? null, type: a.type, status: a.status ?? 'active', visibility: 'public', confidence: a.confidence ?? 'medium',
          cityId: a.city ? cityIds.get(a.city)! : null, address: a.address ?? null, summary: a.summary, recentNote: a.recentNote ?? null, descriptionInternal: a.note ?? null,
          instagram: a.instagram ?? null, website: a.website ?? null,
          formats: a.formats ?? [], products: a.products ?? [], services: a.services ?? [], salesChannels: a.salesChannels ?? [], sources: a.sources ?? [], instagramPosts: a.instagramPosts ?? [],
          activityFollowers: a.followers ?? null, activityLastPostDate: a.lastPost ?? null, activityCheckedAt: a.checked ?? null,
          prices: (a.prices ?? []).map((text) => ({ text })),
        },
        actor,
        'Нова студія (скрипт)',
      ),
    )
    added++
  }
  await finishRun(db, run, { added })
}
console.log(dry ? 'dry run, nothing saved' : `added ${added}`)
if (!dry) await revalidateSite(false)
await pool.end()
