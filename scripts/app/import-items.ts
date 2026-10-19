// Verified Instagram scans → app.items, then the freshness rule over every item. DRY=1 previews, PROD=1 for production.
//   pnpm exec tsx scripts/app/import-items.ts
//   SCANS=halloween/verified_items.jsonl,…   (relative to 09_instagram; default: the halloween, interior and souvenirs scans)
//   EDITS=scripts/app/edits/2026-10-19-items.json   ({"<studio slug>/<source key>": {"category"?, "kind"?, "availability"?, "skip"?: "why"}})
//   TODAY=YYYY-MM-DD to apply the rule as of another day.
// Kiln and firing scans (vypal) are services, not items, and stay out.
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { handleOf } from '../../src/server/services/imports/altNames'
import { draftFromScan, type ScanRow } from '../../src/server/services/imports/igItems'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { refreshItems, upsertItem, type ItemDraft } from '../../src/server/services/items'

const { dry } = guard('import-items')
const actor = scriptActor('import-items')
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10)
const SCANS = (process.env.SCANS ?? 'halloween/verified_items.jsonl,interior/verified.jsonl,interior/verified_round2.jsonl,souvenirs/verified.jsonl').split(',')
type Edit = Partial<Pick<ItemDraft, 'category' | 'kind' | 'availability'>> & { skip?: string }
const edits: Record<string, Edit> = process.env.EDITS ? JSON.parse(fs.readFileSync(process.env.EDITS, 'utf8')) : {}

const all = await db.select({ id: studios.id, slug: studios.slug, instagram: studios.instagram }).from(studios)
const bySlug = new Map(all.map((s) => [s.slug, s]))
const byHandle = new Map(all.filter((s) => s.instagram).map((s) => [handleOf(s.instagram), s]))

const counts = { created: 0, updated: 0, unchanged: 0, skipped: 0, noStudio: 0 }
const run = dry ? null : await startRun(db, 'import-items', SCANS.join(', '))
for (const file of SCANS) {
  const topic = file.split('/')[0]!
  for (const line of fs.readFileSync(path.join(RESEARCH_DIR, '09_instagram', file), 'utf8').split('\n')) {
    if (!line.trim()) continue
    const row = JSON.parse(line) as ScanRow
    for (const it of row.items ?? []) {
      const studio = bySlug.get(it.slug ?? row.slug ?? '') ?? byHandle.get(handleOf(row.href ?? row.handle ?? ''))
      if (!studio) { counts.noStudio++; console.log(`no studio      ${row.slug ?? row.handle ?? it.slug ?? '?'} · ${it.title}`); continue }
      const d = draftFromScan(row, it, topic, today)
      const edit = 'skip' in d ? undefined : edits[`${studio.slug}/${d.sourceKey}`]
      if ('skip' in d || edit?.skip) { counts.skipped++; console.log(`skip           ${studio.slug} · ${it.title} (${'skip' in d ? d.skip : edit!.skip})`); continue }
      const { skip: _, ...fix } = edit ?? {}
      const draft = { ...d, ...fix }
      console.log(`${draft.category.padEnd(15)} ${(draft.kind ?? '').padEnd(8)} ${(draft.availability ?? '').padEnd(8)} ${draft.confirmedAt ?? 'no date   '} ${studio.slug} · ${draft.title} · ${draft.priceMin ?? '–'}–${draft.priceMax ?? '–'}`)
      if (dry) continue
      const r = await db.transaction((tx) => upsertItem(tx, studio.id, draft, actor))
      counts[r.action]++
    }
  }
}
const rule = dry ? null : await db.transaction((tx) => refreshItems(tx, actor, today))
if (run) await finishRun(db, run, { ...counts, ...rule })
console.log(dry ? 'dry run' : 'done', counts, rule ?? '')
await revalidateSite(dry)
await pool.end()
