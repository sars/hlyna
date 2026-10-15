// Studio field edits through the panel's editor (version check, revision, slug history with 301, audit):
//   EDITS=path pnpm exec tsx scripts/app/edit-studios.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "slug": "…", "set"?: { "name"?, "shortName"?, "slug"?, "type"? (one of STUDIO_TYPES), "status"? (one of STUDIO_STATUSES), "address"?, "summary"?, "publicDescription"?, "recentNote"?,
//      "website"?, "instagram"?, "facebook"? ("" clears; otherwise an absolute http(s) URL) },
//      "replace"?: [["from", "to"], …], "dropFormats"?: ["courses", …] }]   — replace runs over name, address, summary, publicDescription, recentNote;
//      dropFormats removes format tags the profile does not support (tags are added only through tag-studios proposals).
import fs from 'node:fs'
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { STUDIO_STATUSES, STUDIO_TYPES } from '../../src/shared/options'
import { webUrl } from '../../src/lib/present'
import { getStudioForEdit, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'

type Field = 'name' | 'shortName' | 'slug' | 'type' | 'status' | 'address' | 'summary' | 'publicDescription' | 'recentNote' | LinkField
type LinkField = 'website' | 'instagram' | 'facebook'
type Edit = { slug: string; set?: Partial<Record<Field, string>>; replace?: [string, string][]; dropFormats?: string[] }

const { dry } = guard('edit-studios')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-edits.json', 'utf8')) as Edit[]
const TEXT: Exclude<Field, 'slug' | 'type' | 'status' | LinkField>[] = ['name', 'address', 'summary', 'publicDescription', 'recentNote']
const LINKS: LinkField[] = ['website', 'instagram', 'facebook']
const actor = scriptActor('edit-studios')
const run = dry ? 0 : await startRun(db, 'edit-studios', `${edits.length} edits`)
let saved = 0
const missing: string[] = []

for (const e of edits) {
  const [row] = await db.select({ id: studios.id }).from(studios).where(eq(studios.slug, e.slug)).limit(1)
  const s = row && (await getStudioForEdit(db, row.id))
  if (!row || !s) { missing.push(e.slug); continue }
  const form = toEditForm(s)
  for (const f of TEXT) {
    const v = form[f]
    if (typeof v === 'string') form[f] = (e.replace ?? []).reduce((acc, [a, b]) => acc.split(a).join(b), v)
  }
  if (e.set?.type && !(STUDIO_TYPES as readonly string[]).includes(e.set.type)) throw new Error(`${e.slug}: unknown type ${e.set.type} (one of ${STUDIO_TYPES.join(', ')})`)
  if (e.set?.status && !(STUDIO_STATUSES as readonly string[]).includes(e.set.status)) throw new Error(`${e.slug}: unknown status ${e.set.status} (one of ${STUDIO_STATUSES.join(', ')})`)
  for (const f of LINKS) {
    const v = e.set?.[f]
    if (v && webUrl(v) !== v) throw new Error(`${e.slug}: ${f} must be an absolute http(s) URL, got ${JSON.stringify(v)}`)
  }
  Object.assign(form, e.set ?? {}, ...LINKS.filter((f) => e.set?.[f] === '').map((f) => ({ [f]: null })))
  const dropped = (e.dropFormats ?? []).filter((f) => form.formats.includes(f as never))
  if (dropped.length) form.formats = form.formats.filter((f) => !dropped.includes(f))
  const changed = (['slug', 'shortName', 'type', 'status', ...TEXT, ...LINKS] as Field[]).filter((f) => form[f] !== toEditForm(s)[f])
  console.log(`${e.slug}: ${[...changed.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f])?.slice(0, 80)} → ${JSON.stringify(form[f])?.slice(0, 80)}`), ...(dropped.length ? [`formats: −${dropped.join(', −')}`] : [])].join('\n  ') || 'no change'}`)
  if (dry || (!changed.length && !dropped.length)) continue
  await saveStudio(db, row.id, form, actor, 'Виправлення (скрипт)')
  saved++
}

missing.forEach((s) => console.log('missing', s))
if (!dry) await finishRun(db, run, { saved, missing: missing.length })
console.log(dry ? 'dry run, nothing saved' : `saved ${saved}`)
if (!dry) await revalidateSite(false)
await pool.end()
