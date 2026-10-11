// Instagram posts pass → studios (new stack). DRY=1 to preview, FORCE=1 to overwrite hand-edited notes, PROD=1 for production.
//   pnpm tsx scripts/app/import-ig.ts
import fs from 'node:fs'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { importIgNotes, type IgNote } from '../../src/server/services/imports/instagram'

const { dry } = guard('import-ig')
const FILE = process.env.IG_NOTES || '/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan/ig_notes.jsonl'
const STATE = process.env.IG_STATE || '/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan/.imported_notes.json'
const notes = new Map<string, IgNote>()
for (const l of fs.readFileSync(FILE, 'utf8').split('\n')) if (l.trim()) { const n = JSON.parse(l) as IgNote; notes.set(n.slug, n) }
const imported: Record<string, string> = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {}
const run = dry ? null : await startRun(db, 'import-ig')
const r = await importIgNotes(db, [...notes.values()], { dry, force: process.env.FORCE === '1', imported }, scriptActor('import-ig'))
r.log.forEach((l) => console.log(l))
if (!dry) fs.writeFileSync(STATE, JSON.stringify(r.imported, null, 1))
if (run) await finishRun(db, run, r.counts)
console.log(dry ? 'dry run' : 'done', r.counts)
await revalidateSite(dry)
await pool.end()
