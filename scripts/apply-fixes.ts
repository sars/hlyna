// Applies copy fixes: pnpm payload run scripts/apply-fixes.ts (reads /tmp/hlyna-copy/fixes.json)
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'
import { slugifyUk } from '../src/utilities/transliterateUk'

type F = { slug: string; name?: string; summary?: string; publicDescription?: string; city?: string }
const fixes = JSON.parse(fs.readFileSync(process.env.FIXES || '/tmp/hlyna-copy/fixes.json', 'utf8')) as F[]
const payload = await getPayload({ config })
let n = 0
for (const f of fixes) {
  const doc = (await payload.find({ collection: 'studios', where: { slug: { equals: f.slug } }, limit: 1, depth: 0, draft: true })).docs[0]
  if (!doc) { console.log('missing', f.slug); continue }
  const data: Record<string, unknown> = {}
  if (f.name) data.name = f.name
  if (f.summary) data.summary = f.summary.slice(0, 200)
  if (f.publicDescription) data.publicDescription = f.publicDescription
  if (f.city) {
    const slug = slugifyUk(f.city)
    let city = (await payload.find({ collection: 'cities', where: { slug: { equals: slug } }, limit: 1 })).docs[0]
    if (!city) city = await payload.create({ collection: 'cities', data: { name: f.city, slug } })
    data.city = city.id
  }
  await payload.update({ collection: 'studios', id: doc.id, data, context: { disableRevalidate: true } })
  n++
}
console.log(`fixed ${n}`)
process.exit(0)
