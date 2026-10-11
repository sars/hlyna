/**
 * Load facts read from pinned Instagram story highlights into studios.
 *   pnpm payload run scripts/import-ig-highlights.ts        (DRY=1 to print only)
 * Source: UkraineCeramics/09_instagram/posts_scan/hl_extract.jsonl, one line per studio:
 *   {slug, checked:"YYYY-MM-DD", prices:[…], services:[…], address?, formats:[…]}
 * Only adds: new price/service lines (skipping ones already present), an address when the studio has none,
 * and format tags. Never removes or rewrites existing data. Idempotent.
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

type Format = NonNullable<Studio['formats']>[number]
type X = { slug: string; checked?: string; prices?: string[]; services?: string[]; address?: string | null; formats?: string[] }

const FILE = process.env.HL_EXTRACT || '/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan/hl_extract.jsonl'
const DRY = process.env.DRY === '1'
const FORMATS = new Set(['wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca', 'new-year'])
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const rows = new Map<string, X>()
for (const l of fs.readFileSync(FILE, 'utf8').split('\n')) if (l.trim()) { const x = JSON.parse(l) as X; rows.set(x.slug, x) }

const payload = await getPayload({ config })
let n = 0
for (const [slug, x] of rows) {
  const doc = (await payload.find({ collection: 'studios', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })).docs[0] as Studio | undefined
  if (!doc) { console.log('missing', slug); continue }
  const have = new Set([...(doc.prices ?? []), ...(doc.services ?? [])].map((p) => norm(p.text)))
  const addP = (x.prices ?? []).filter((t) => t && !have.has(norm(t)))
  const addS = (x.services ?? []).filter((t) => t && !have.has(norm(t)))
  const formats = [...new Set<Format>([...(doc.formats ?? []), ...((x.formats ?? []).filter((f) => FORMATS.has(f)) as Format[])])]
  const data: Partial<Studio> = {}
  if (addP.length) data.prices = [...(doc.prices ?? []), ...addP.map((text) => ({ text }))]
  if (addS.length) data.services = [...(doc.services ?? []), ...addS.map((text) => ({ text }))]
  if (x.address && !/\d/.test(doc.address ?? '')) data.address = x.address
  if (formats.length !== (doc.formats ?? []).length) data.formats = formats
  if (!Object.keys(data).length) continue
  n++
  if (DRY) { console.log(slug, JSON.stringify(data).slice(0, 300)); continue }
  await payload.update({ collection: 'studios', id: doc.id, data, draft: doc._status !== 'published', context: { disableRevalidate: true } })
}
console.log('updated', n)
process.exit(0)
