// Exports studios for LLM copywriting into batches: pnpm payload run scripts/copy-export.ts
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

const OUT = process.env.OUT_DIR || '/tmp/hlyna-copy'
const BATCHES = Number(process.env.BATCHES || 6)
const payload = await getPayload({ config })
const res = await payload.find({ collection: 'studios', depth: 1, limit: 5000, pagination: false })
const rows = res.docs
  .filter((s) => !s.publicDescription || process.env.ALL)
  .map((s) => ({
    slug: s.slug,
    name: s.name,
    type: s.type,
    city: typeof s.city === 'object' ? s.city?.name : null,
    research: s.description,
    services: (s.services ?? []).map((x) => x.text),
    products: (s.products ?? []).map((x) => x.text),
    prices: (s.prices ?? []).map((x) => x.text),
    salesChannels: (s.salesChannels ?? []).map((x) => x.text),
    hasWebsite: Boolean(s.website),
    hasInstagram: Boolean(s.instagram),
    address: s.address,
  }))
fs.mkdirSync(OUT, { recursive: true })
const size = Math.ceil(rows.length / BATCHES)
for (let i = 0; i < BATCHES; i++) fs.writeFileSync(`${OUT}/in_${i + 1}.json`, JSON.stringify(rows.slice(i * size, (i + 1) * size), null, 1))
console.log(`exported ${rows.length} studios into ${BATCHES} batches in ${OUT}`)
process.exit(0)
