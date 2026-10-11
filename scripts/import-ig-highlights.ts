/**
 * Load facts read from pinned Instagram story highlights into studios.
 *   pnpm payload run scripts/import-ig-highlights.ts        (DRY=1 to print only)
 * Source: UkraineCeramics/09_instagram/posts_scan/hl_extract.jsonl, one line per studio:
 *   {slug, checked:"YYYY-MM-DD", prices:[…], services:[…], address?, formats:[…]}
 * Adds new price/service lines; a fresh price replaces older lines for the same offer (old ones logged to price_history.jsonl);
 * sets an address when the studio has none,
 * and adds format tags. Idempotent.
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
const HISTORY = '/Users/rodik/Claude/UkraineCeramics/16_prices/price_history.jsonl'
// The offer part of a price line: words before the first price/dash, without numbers.
const offerWords = (s: string) =>
  new Set(norm(s.split(/\s[—–-]\s|\d[\d\s]*\s*(?:грн|₴)/)[0]).split(' ').filter((w) => w.length > 2 && !/\d/.test(w)))
const KIDS = /дит|діт|школ|підліт/i
// Month index of the source date in a price line: «(…, 03.2026)» or «(…, 2026)».
function when(s: string) {
  const m = s.match(/(\d{2})\.(20\d\d)/)
  if (m) return Number(m[2]) * 12 + Number(m[1])
  const y = s.match(/\((?:[^)]*?)(20\d\d)\)/)
  return y ? Number(y[1]) * 12 + 1 : 0
}
// Same offer = same audience (kids or not), word overlap ≥ 60 % of the union, and the new line is not older.
function sameOffer(old: string, fresh: string) {
  const A = offerWords(old), B = offerWords(fresh)
  if (!A.size || !B.size) return false
  if (KIDS.test(old) !== KIDS.test(fresh)) return false
  const inter = [...A].filter((w) => B.has(w)).length
  if (inter / new Set([...A, ...B]).size < 0.6) return false
  return when(fresh) >= when(old)
}

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
  if (addP.length) {
    // Fresh prices replace older lines for the same offer (same wording before the price); replaced lines go to a
    // history log so a price index over time stays possible.
    const kept = (doc.prices ?? []).filter((p) => !addP.some((n) => sameOffer(p.text, n)))
    const replaced = (doc.prices ?? []).filter((p) => !kept.includes(p))
    if (replaced.length && !DRY) fs.appendFileSync(HISTORY, replaced.map((p) => JSON.stringify({ slug, replacedAt: x.checked, text: p.text })).join('\n') + '\n')
    data.prices = [...kept, ...addP.map((text) => ({ text }))]
  }
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
