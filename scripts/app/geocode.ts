// Coordinates for the map (new stack). DRY=1 preview, FORCE=1 redo all, SLUGS=a,b only these, PROD=1 production.
//   pnpm tsx scripts/app/geocode.ts
import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { geocodeStudios } from '../../src/server/services/imports/geo'

const { dry } = guard('geocode')
const slugs = (process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean)
const run = dry ? null : await startRun(db, 'geocode', slugs.length ? `slugs: ${slugs.join(',')}` : undefined)
const r = await geocodeStudios(db, { slugs, force: process.env.FORCE === '1', dry }, scriptActor('geocode'))
r.log.forEach((l) => console.log(l))
if (run) await finishRun(db, run, r.counts)
console.log(dry ? 'dry run' : 'done', r.counts)
await revalidateSite(dry)
await pool.end()
