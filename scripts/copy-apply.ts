// Applies LLM-written copy: pnpm payload run scripts/copy-apply.ts  (reads OUT_DIR/out_*.json: [{slug, summary, publicDescription}])
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

const OUT = process.env.OUT_DIR || '/tmp/hlyna-copy'
const payload = await getPayload({ config })
let n = 0, missing = 0
for (const f of fs.readdirSync(OUT).filter((x) => /^out_\d+\.json$/.test(x))) {
  for (const r of JSON.parse(fs.readFileSync(`${OUT}/${f}`, 'utf8')) as { slug: string; summary: string; publicDescription: string }[]) {
    const found = await payload.find({ collection: 'studios', where: { slug: { equals: r.slug } }, limit: 1, depth: 0 })
    const doc = found.docs[0]
    if (!doc) { missing++; continue }
    await payload.update({ collection: 'studios', id: doc.id, data: { summary: r.summary.slice(0, 200), publicDescription: r.publicDescription, _status: 'published' } })
    n++
  }
}
console.log(`updated ${n}, missing ${missing}`)
process.exit(0)
