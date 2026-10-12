// Alternate names a studio is known by (new stack). DRY=1 preview, PROD=1 production.
//   pnpm tsx scripts/app/alt-names.ts
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { fillAlternateNames, handleOf } from '../../src/server/services/imports/altNames'

const { dry } = guard('alt-names')
const ROOT = RESEARCH_DIR
const byHandle = new Map<string, Set<string>>()
function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'posts_scan') walk(p)
    else if (/^entries_.*\.jsonl$/.test(e.name))
      for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
        try {
          const d = JSON.parse(l) as { name?: string; instagram?: string }
          const h = handleOf(typeof d.instagram === 'string' ? d.instagram : '')
          if (h && d.name) (byHandle.get(h) ?? byHandle.set(h, new Set()).get(h)!).add(d.name)
        } catch {}
      }
  }
}
walk(ROOT)
const renamed = new Map<string, string[]>()
const notesFile = path.join(ROOT, '09_instagram/posts_scan/ig_notes.jsonl')
if (fs.existsSync(notesFile))
  for (const l of fs.readFileSync(notesFile, 'utf8').split('\n')) {
    if (!l.trim()) continue
    const n = JSON.parse(l) as { slug: string; note?: string }
    const m = n.note?.match(/назв\p{L}* з ([^,;.]+?) на ([^,;.]+?)(?=[,;.]|\s(?:а|і|й)\s)/u)
    if (m) renamed.set(n.slug, [m[1]!.trim(), m[2]!.trim()])
  }
const run = dry ? null : await startRun(db, 'alt-names')
const r = await fillAlternateNames(db, byHandle, renamed, { dry }, scriptActor('alt-names'))
r.log.forEach((l) => console.log(l))
if (run) await finishRun(db, run, { changed: r.changed })
console.log(dry ? 'dry run' : 'done', 'changed', r.changed)
await revalidateSite(dry)
await pool.end()
