// Every published studio as the site renders it, for writers and the copy sync scripts (they warn on unknown slugs):
//   HLYNA_SCRIPT=1 pnpm exec tsx scripts/app/export-public-studios.ts   → $RESEARCH_DIR/_site_content/public_studios.json
// Re-run after studios are added, renamed or hidden. Read-only.
import fs from 'node:fs'
import path from 'node:path'

import { guard, RESEARCH_DIR } from './_guard'
import { pool } from '../../src/server/db'
import { getCatalog } from '../../src/lib/catalog'

guard('export-public-studios')
const out = path.join(RESEARCH_DIR, '_site_content/public_studios.json')
const studios = (await getCatalog()).map(({ cityDoc, ...s }) => ({ ...s, cityName: cityDoc?.name ?? null, citySlug: cityDoc?.slug ?? null }))
fs.writeFileSync(out, JSON.stringify(studios, null, 1) + '\n')
console.log(`${studios.length} published studios → ${out}`)
await pool.end()
