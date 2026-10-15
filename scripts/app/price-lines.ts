// Every price line the price index counts, per category, for review (read-only):
//   HLYNA_SCRIPT=1 DATABASE_URL=… pnpm exec tsx scripts/app/price-lines.ts [category]
// One block per category: value, studio, the line and its source. Use it after changing the filters in src/lib/priceIndex.ts.
import { guard } from './_guard'
import { pool } from '../../src/server/db'
import { getAllStudios } from '../../src/lib/catalog'
import { CATEGORIES, studioValues } from '../../src/lib/priceIndex'

guard('price-lines')
const only = process.argv[2]
const studios = (await getAllStudios()).filter((s) => s.type !== 'supplier')
const { values } = studioValues(studios)
for (const cat of CATEGORIES.filter((c) => !only || c.key === only)) {
  const arr = (values.get(cat.key) ?? []).sort((a, b) => a.value - b.value)
  console.log(`\n=== ${cat.key} · ${cat.label} (${arr.length} studios)`)
  for (const x of arr) for (const l of x.lines) console.log(`${l.value}\t${x.studio.slug}\t${l.text.slice(0, 170)}\t[${l.source ?? ''}]`)
}
await pool.end()
