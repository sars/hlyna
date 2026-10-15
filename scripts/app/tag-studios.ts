// Format tags, in two steps (nothing is written unreviewed):
//   1. propose:  pnpm exec tsx scripts/app/tag-studios.ts
//      → $RESEARCH_DIR/_site_content/tag_review/proposals-<date>.json: every tag the rules would add, with the phrase
//        that triggered it. A reviewer sets "ok": true (or false + "note") on each line.
//   2. apply:    APPLY=<that file> pnpm exec tsx scripts/app/tag-studios.ts   (PROD=1 for production, DRY=1 to preview)
//      → adds only the accepted tags (tags never shrink here; removing one is a panel edit).
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { sourceIdFor } from '../source-id'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { applyTagProposals, tagProposals, type TagProposal } from '../../src/server/services/imports/tags'

const { dry } = guard('tag-studios')
const flat = (v: unknown): string => (Array.isArray(v) ? v.map(flat).join(' · ') : typeof v === 'string' ? v : '')

if (process.env.APPLY) {
  const list = JSON.parse(fs.readFileSync(process.env.APPLY, 'utf8')) as TagProposal[]
  const ok = list.filter((p) => p.ok === true)
  console.log(`accepted ${ok.length} of ${list.length}`)
  if (dry) ok.forEach((p) => console.log(`${p.slug} +${p.tag}`))
  else {
    const run = await startRun(db, 'tag-studios', path.basename(process.env.APPLY))
    const r = await applyTagProposals(db, ok, scriptActor('tag-studios'))
    await finishRun(db, run, { accepted: ok.length, changed: r.changed, skippedOwner: r.skipped.length })
    console.log('changed', r.changed, r.skipped.length ? `skipped (owner changes pending): ${r.skipped.join(', ')}` : '')
    await revalidateSite(false)
  }
} else {
  const DATA_FILE = process.env.DATA_FILE || path.join(RESEARCH_DIR, '_master/all_entries.jsonl')
  const raw = new Map<string, Record<string, unknown>>()
  for (const line of fs.readFileSync(DATA_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const e = JSON.parse(line) as Record<string, unknown>
    raw.set(sourceIdFor(flat(e.name), flat(e.city)), e)
  }
  const list = await tagProposals(db, raw)
  const dir = path.join(RESEARCH_DIR, '_site_content/tag_review')
  fs.mkdirSync(dir, { recursive: true })
  const out = path.join(dir, `proposals-${new Date().toISOString().slice(0, 10)}.json`)
  fs.writeFileSync(out, JSON.stringify(list, null, 1) + '\n')
  const by: Record<string, number> = {}
  for (const p of list) by[p.tag] = (by[p.tag] ?? 0) + 1
  console.log(`${list.length} proposals (${list.filter((p) => p.visibility === 'public').length} on public studios) → ${out}`, by)
}
await pool.end()
