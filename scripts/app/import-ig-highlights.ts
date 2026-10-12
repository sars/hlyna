// Facts from pinned Instagram highlights → studios (new stack). DRY=1 to preview, PROD=1 for production.
//   pnpm tsx scripts/app/import-ig-highlights.ts
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { importHighlights, type HlRow } from '../../src/server/services/imports/instagram'

const { dry } = guard('import-ig-highlights')
const FILE = process.env.HL_EXTRACT || path.join(RESEARCH_DIR, '09_instagram/posts_scan/hl_extract.jsonl')
const HISTORY = process.env.PRICE_HISTORY || path.join(RESEARCH_DIR, '16_prices/price_history.jsonl')
const rows = new Map<string, HlRow>()
for (const l of fs.readFileSync(FILE, 'utf8').split('\n')) if (l.trim()) { const x = JSON.parse(l) as HlRow; rows.set(x.slug, x) }
const run = dry ? null : await startRun(db, 'import-ig-highlights')
const r = await importHighlights(db, [...rows.values()], { dry }, scriptActor('import-ig-highlights'))
r.log.forEach((l) => console.log(l))
// Replaced price lines are kept for a price index over time.
if (!dry && r.replaced.length) fs.appendFileSync(HISTORY, r.replaced.map((x) => JSON.stringify(x)).join('\n') + '\n')
if (run) await finishRun(db, run, r.counts)
console.log(dry ? 'dry run' : 'done', r.counts)
await revalidateSite(dry)
await pool.end()
