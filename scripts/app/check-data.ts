// Read-only consistency check of the studio data (rules and reasons: src/server/services/dataChecks.ts):
//   pnpm exec tsx scripts/app/check-data.ts        (DATABASE_URL; PROD=1 for production; exit code 1 when something is flagged)
// Run it after an import, an edits file or a copy sync, before deploying data.
import { guard } from './_guard'
import { db, pool } from '../../src/server/db'
import { cities, studios } from '../../src/server/db/schema/catalog'
import { eq } from 'drizzle-orm'
import { checkStudios } from '../../src/server/services/dataChecks'

guard('check-data')
const rows = await db
  .select({
    slug: studios.slug, name: studios.name, type: studios.type, city: cities.name, visibility: studios.visibility, summary: studios.summary,
    publicDescription: studios.publicDescription, descriptionInternal: studios.descriptionInternal, recentNote: studios.recentNote, instagram: studios.instagram, facebook: studios.facebook, website: studios.website,
  })
  .from(studios)
  .leftJoin(cities, eq(cities.id, studios.cityId))
const issues = checkStudios(rows)
for (const i of issues) console.log(`${i.rule}  ${i.slug}\n  ${i.text}`)
console.log(`${rows.length} profiles checked, ${issues.length} flagged`)
await pool.end()
process.exitCode = issues.length ? 1 : 0
