// Studio field edits through the panel's editor (version check, revision, slug history with 301, audit):
//   EDITS=path pnpm exec tsx scripts/app/edit-studios.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "slug": "…", "set"?: { "name"?, "slug"?, "address"?, "summary"?, "publicDescription"?, "recentNote"? },
//      "replace"?: [["from", "to"], …] }]   — replace runs over name, address, summary, publicDescription, recentNote.
import fs from 'node:fs'
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { getStudioForEdit, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'

type Field = 'name' | 'slug' | 'address' | 'summary' | 'publicDescription' | 'recentNote'
type Edit = { slug: string; set?: Partial<Record<Field, string>>; replace?: [string, string][] }

const { dry } = guard('edit-studios')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-edits.json', 'utf8')) as Edit[]
const TEXT: Field[] = ['name', 'address', 'summary', 'publicDescription', 'recentNote']
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
  Object.assign(form, e.set ?? {})
  const changed = (['slug', ...TEXT] as Field[]).filter((f) => form[f] !== toEditForm(s)[f])
  console.log(`${e.slug}: ${changed.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f])?.slice(0, 80)} → ${JSON.stringify(form[f])?.slice(0, 80)}`).join('\n  ') || 'no change'}`)
  if (dry || !changed.length) continue
  await saveStudio(db, row.id, form, actor, 'Виправлення (скрипт)')
  saved++
}

missing.forEach((s) => console.log('missing', s))
if (!dry) await finishRun(db, run, { saved, missing: missing.length })
console.log(dry ? 'dry run, nothing saved' : `saved ${saved}`)
if (!dry) await revalidateSite(false)
await pool.end()
