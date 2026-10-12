// Show or hide studios: SLUGS=a,b STATUS=public|hidden pnpm tsx scripts/app/set-status.ts (PROD=1 for production).
// STATUS=published/draft (older wording) are accepted too.
import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { setVisibility } from '../../src/server/services/imports/fixes'

guard('set-status')
const slugs = (process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean)
const visibility = ['public', 'published'].includes(process.env.STATUS ?? '') ? 'public' : 'hidden'
const run = await startRun(db, 'set-status', `${visibility}: ${slugs.join(',')}`)
const r = await setVisibility(db, slugs, visibility, scriptActor('set-status'))
r.changed.forEach((s) => console.log(visibility, s))
r.missing.forEach((s) => console.log('missing', s))
await finishRun(db, run, { changed: r.changed.length, missing: r.missing.length })
await revalidateSite(false)
await pool.end()
