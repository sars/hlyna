/**
 * Print likely duplicate studios (read-only).
 *
 *   pnpm payload run scripts/find-duplicates.ts
 *   MIN_RATIO=0.8 pnpm payload run scripts/find-duplicates.ts
 *
 * A pair is a candidate when the two studios share
 *   - the normalised Instagram handle, or
 *   - the website domain (aggregators like etsy/prom/linktree ignored), or
 *   - the city plus a very similar name: both names are transliterated to Latin,
 *     generic words (кераміка, студія, ceramics, studio…) dropped, and compared
 *     exactly or by Levenshtein ratio ≥ MIN_RATIO (default 0.85).
 * Clear duplicates go to ../UkraineCeramics/_ops/name_aliases.tsv, then merge.py,
 * then `pnpm import:studios:prune`.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { transliterateUk } from '../src/utilities/transliterateUk'

const MIN_RATIO = Number(process.env.MIN_RATIO || 0.85)

const GENERIC = new Set([
  'ceramics', 'ceramic', 'ceramica', 'keramika', 'keramiky', 'keramiki', 'keramik', 'keramichna',
  'keramichnyi', 'keramichna', 'studio', 'studiia', 'studiya', 'studija', 'pottery', 'maisternia',
  'maysternya', 'masterskaia', 'masterskaya', 'honcharna', 'honcharnyi', 'goncharna', 'art', 'clay',
  'hlyna', 'glyna', 'workshop', 'shop', 'ua', 'the', 'by', 'and', 'z', 'i', 'ta', 'na', 'fop', 'tov',
  'handmade', 'design', 'home', 'house', 'lab', 'atelier', 'space', 'club', 'school', 'shkola',
])

/** Latin, lowercase, without generic words; spelling variants folded (kh/h/g, y/i, double letters). */
function nameKey(name: string): string {
  const words = transliterateUk(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !GENERIC.has(w))
  return words
    .join('')
    .replace(/kh/g, 'h')
    .replace(/g/g, 'h')
    .replace(/[yj]/g, 'i')
    .replace(/w/g, 'v')
    .replace(/ck|c|q/g, 'k')
    .replace(/(.)\1+/g, '$1')
}

function igHandle(v?: string | null): string {
  const s = (v || '').trim()
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i) || s.match(/^@?([A-Za-z0-9._]{2,30})$/)
  const h = (m?.[1] || '').toLowerCase().replace(/^\.+|\.+$/g, '')
  return ['p', 'reel', 'reels', 'explore', 'stories', 'accounts'].includes(h) ? '' : h
}

const AGGREGATORS =
  /instagram\.com|facebook\.com|taplink|linktr\.ee|bodo\.ua|prom\.ua|etsy\.com|kasta\.ua|rozetka|shafa\.ua|vsisvoi|google\.|youtube|t\.me|tiktok|olx\.ua|epicentrk/

function domain(v?: string | null): string {
  let s = (v || '').trim()
  if (!s) return ''
  if (!/^https?:\/\//.test(s)) s = `http://${s}`
  try {
    const d = new URL(s).hostname.toLowerCase().replace(/^www\./, '')
    return AGGREGATORS.test(d) ? '' : d
  } catch {
    return ''
  }
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

const ratio = (a: string, b: string): number =>
  1 - levenshtein(a, b) / Math.max(a.length, b.length, 1)

type Row = {
  id: number
  name: string
  city: string
  instagram: string
  website: string
  sourceId: string
  key: string
}

async function main() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'studios',
    limit: 0,
    pagination: false,
    depth: 1,
    draft: true,
  })

  const rows: Row[] = docs.map((d) => ({
    id: d.id,
    name: d.name,
    city: typeof d.city === 'object' && d.city ? d.city.name : String(d.city ?? ''),
    instagram: d.instagram || '',
    website: d.website || '',
    sourceId: d.sourceId || '',
    key: nameKey(d.name),
  }))

  const pairs = new Map<string, { a: Row; b: Row; reasons: string[] }>()
  const add = (a: Row, b: Row, reason: string) => {
    if (a.id === b.id) return
    const [x, y] = a.id < b.id ? [a, b] : [b, a]
    const k = `${x.id}-${y.id}`
    const p = pairs.get(k) || { a: x, b: y, reasons: [] }
    if (!p.reasons.includes(reason)) p.reasons.push(reason)
    pairs.set(k, p)
  }

  const groupBy = (fn: (r: Row) => string, label: string) => {
    const groups = new Map<string, Row[]>()
    for (const r of rows) {
      const k = fn(r)
      if (k) groups.set(k, [...(groups.get(k) || []), r])
    }
    for (const [k, g] of groups)
      for (let i = 0; i < g.length; i++)
        for (let j = i + 1; j < g.length; j++) add(g[i], g[j], `${label}:${k}`)
  }

  groupBy((r) => igHandle(r.instagram), 'ig')
  groupBy((r) => domain(r.website), 'web')

  const byCity = new Map<string, Row[]>()
  for (const r of rows) byCity.set(r.city, [...(byCity.get(r.city) || []), r])
  for (const g of byCity.values())
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const a = g[i].key
        const b = g[j].key
        if (a.length < 4 || b.length < 4) continue
        if (a === b) add(g[i], g[j], `name=${a}`)
        else {
          const r = ratio(a, b)
          if (r >= MIN_RATIO) add(g[i], g[j], `name~${r.toFixed(2)}`)
        }
      }

  const list = [...pairs.values()].sort(
    (p, q) => p.a.city.localeCompare(q.a.city) || p.a.name.localeCompare(q.a.name),
  )
  for (const { a, b, reasons } of list) {
    console.log(
      [
        a.city,
        `#${a.id} ${a.name} [${igHandle(a.instagram) || '-'} | ${domain(a.website) || '-'}]`,
        `#${b.id} ${b.name} [${igHandle(b.instagram) || '-'} | ${domain(b.website) || '-'}]`,
        reasons.join(', '),
      ].join('\t'),
    )
  }
  console.log(`\n${list.length} candidate pairs among ${rows.length} studios`)
  process.exit(0)
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
