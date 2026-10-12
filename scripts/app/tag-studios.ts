// Format tags from the research data (new stack). DRY=1 preview, RESET=1 recompute from scratch, PROD=1 production.
//   pnpm tsx scripts/app/tag-studios.ts
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { sourceIdFor } from '../source-id'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { tagStudios } from '../../src/server/services/imports/tags'

const { dry } = guard('tag-studios')
const DATA_FILE = process.env.DATA_FILE || path.join(RESEARCH_DIR, '_master/all_entries.jsonl')
const flat = (v: unknown): string => (Array.isArray(v) ? v.map(flat).join(' · ') : typeof v === 'string' ? v : '')
const raw = new Map<string, Record<string, unknown>>()
for (const line of fs.readFileSync(DATA_FILE, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const e = JSON.parse(line) as Record<string, unknown>
  raw.set(sourceIdFor(flat(e.name), flat(e.city)), e)
}
const run = dry ? null : await startRun(db, 'tag-studios')
const r = await tagStudios(db, raw, { dry, reset: process.env.RESET === '1' }, scriptActor('tag-studios'))
r.log.forEach((l) => console.log(l))
if (run) await finishRun(db, run, { changed: r.changed, publicPerTag: r.publicPerTag })
console.log(dry ? 'dry run' : 'done', 'changed', r.changed, r.publicPerTag)
await revalidateSite(dry)
await pool.end()
