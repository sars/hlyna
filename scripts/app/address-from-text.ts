// Street addresses from a studio's own text (new stack). DRY=1 lists candidates; SLUGS=a,b applies only those; PROD=1 production.
//   pnpm tsx scripts/app/address-from-text.ts
import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { addressFromText } from '../../src/server/services/imports/geo'

const { dry } = guard('address-from-text')
const slugs = (process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean)
if (!dry && !slugs.length) {
  console.error('Applying needs an explicit reviewed list: SLUGS=a,b (run with DRY=1 first).')
  process.exit(2)
}
const run = dry ? null : await startRun(db, 'address-from-text', `slugs: ${slugs.join(',')}`)
const r = await addressFromText(db, { dry, slugs }, scriptActor('address-from-text'))
for (const c of r.candidates) console.log(`${c.slug} [${c.type}] → ${c.addr}\n    …${c.ctx}…${c.more.length ? `  (+${c.more.length} more: ${c.more.join(' | ')})` : ''}`)
if (run) await finishRun(db, run, { applied: r.applied, candidates: r.candidates.length })
console.log(dry ? 'dry run' : 'applied', r.applied)
await revalidateSite(dry)
await pool.end()
