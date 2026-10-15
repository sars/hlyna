// City field edits through the panel's city service (slug history, audit):
//   EDITS=path pnpm exec tsx scripts/app/edit-cities.ts   (PROD=1 for production, DRY=1 to preview)
// EDITS is a JSON array: [{ "slug": "kosiv", "why": "…", "set": { "oblast": "Івано-Франківська", "locative": "у Косові" } }]
// Fields: name, slug, oblast, locative. The oblast decides which centre's page lists the city (OBLAST_CENTRES).
import fs from 'node:fs'
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { cities } from '../../src/server/db/schema/catalog'
import { saveCity, type CityInput } from '../../src/server/services/cities'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'

type Field = 'name' | 'slug' | 'oblast' | 'locative'
type Edit = { slug: string; why?: string; set: Partial<Record<Field, string>> }

const { dry } = guard('edit-cities')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-city-edits.json', 'utf8')) as Edit[]
const actor = scriptActor('edit-cities')
const run = dry ? 0 : await startRun(db, 'edit-cities', `${edits.length} edits`)
let saved = 0
const missing: string[] = []

for (const e of edits) {
  // a city the file renamed earlier is found by its new slug, so the file can be re-run
  const [c] = (await db.select().from(cities).where(eq(cities.slug, e.slug)).limit(1)).concat(e.set.slug ? await db.select().from(cities).where(eq(cities.slug, e.set.slug)).limit(1) : [])
  if (!c) {
    missing.push(e.slug)
    continue
  }
  const input: CityInput = { name: c.name, slug: c.slug, oblast: c.oblast, locative: c.locative, population: c.population, isOver100k: c.isOver100k, ...e.set }
  const lines = (Object.keys(e.set) as Field[]).filter((f) => input[f] !== c[f]).map((f) => `${f}: ${JSON.stringify(c[f])} → ${JSON.stringify(input[f])}`)
  console.log(`${e.slug}: ${lines.join('\n  ') || 'no change'}${e.why && lines.length ? `\n  why: ${e.why}` : ''}`)
  if (dry || !lines.length) continue
  await saveCity(db, c.id, input, actor)
  saved++
}

missing.forEach((s) => console.log('missing', s))
if (!dry) await finishRun(db, run, { saved, missing: missing.length })
console.log(dry ? 'dry run, nothing saved' : `saved ${saved}`)
if (!dry) await revalidateSite(false)
await pool.end()
