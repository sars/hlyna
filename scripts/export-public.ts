// Dump published studios (with city slug) to JSON for offline analysis: OUT=path pnpm payload run scripts/export-public.ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { writeFileSync } from 'node:fs'

const payload = await getPayload({ config })
const [s, c] = await Promise.all([
  payload.find({ collection: 'studios', where: { _status: { equals: 'published' } }, depth: 0, limit: 5000, pagination: false }),
  payload.find({ collection: 'cities', depth: 0, limit: 2000, pagination: false }),
])
const byId = new Map(c.docs.map((x) => [x.id, x]))
const out = s.docs.map((d) => ({ ...d, citySlug: byId.get(d.city as number)?.slug, cityName: byId.get(d.city as number)?.name }))
writeFileSync(process.env.OUT || 'public-studios.json', JSON.stringify(out, null, 1))
console.log(out.length)
process.exit(0)
