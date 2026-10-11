// Copy/data fixes by slug from a JSON file: FIXES=path pnpm tsx scripts/app/apply-fixes.ts (PROD=1 for production).
//   [{ "slug": "…", "name"?, "summary"?, "publicDescription"?, "city"?, "address"? }]
import fs from 'node:fs'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { applyFixes, type Fix } from '../../src/server/services/imports/fixes'

guard('apply-fixes')
const fixes = JSON.parse(fs.readFileSync(process.env.FIXES || '/tmp/hlyna-copy/fixes.json', 'utf8')) as Fix[]
const run = await startRun(db, 'apply-fixes', `${fixes.length} fixes`)
const r = await applyFixes(db, fixes, scriptActor('apply-fixes'))
r.missing.forEach((s) => console.log('missing', s))
await finishRun(db, run, r)
console.log(`fixed ${r.fixed}`)
await revalidateSite(false)
await pool.end()
