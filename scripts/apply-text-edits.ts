/**
 * Apply reviewed, surgical text edits to studio text fields: exact `find` → `replace` (often ''), nothing else.
 *   EDITS=edits.json pnpm payload run scripts/apply-text-edits.ts        (DRY=1 to print only)
 * edits.json: [{ "slug", "field": "publicDescription|summary|description|recentNote", "find", "replace" }]
 * An edit whose `find` text isn't present is reported and skipped, so a field rewritten meanwhile is never clobbered.
 * Published studios stay published; studios with a pending owner draft are skipped.
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

type Edit = { slug: string; field: 'publicDescription' | 'summary' | 'description' | 'recentNote'; find: string; replace: string }
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || 'edits.json', 'utf8')) as Edit[]
const DRY = process.env.DRY === '1'
const tidy = (t: string) => t.replace(/ {2,}/g, ' ').replace(/\s+([,.;])/g, '$1').replace(/,([.;])/g, '$1').replace(/^[\s,;]+/, '').replace(/\n{3,}/g, '\n\n').trim()

const payload = await getPayload({ config })
const bySlug = new Map<string, Edit[]>()
for (const e of edits) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e])
let changed = 0
for (const [slug, list] of bySlug) {
  const doc = (await payload.find({ collection: 'studios', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })).docs[0] as Studio | undefined
  if (!doc) { console.log('missing', slug); continue }
  if (doc.pendingOwnerChanges) { console.log('skip (owner draft)', slug); continue }
  const data: Record<string, string> = {}
  for (const e of list) {
    const cur = data[e.field] ?? ((doc as unknown as Record<string, unknown>)[e.field] as string | undefined) ?? ''
    if (!cur.includes(e.find)) { console.log('not found, skipped:', slug, e.field, JSON.stringify(e.find.slice(0, 80))); continue }
    data[e.field] = tidy(cur.replace(e.find, e.replace))
  }
  if (!Object.keys(data).length) continue
  changed++
  for (const [f, v] of Object.entries(data)) console.log(`${slug} · ${f}\n  after: ${v.slice(0, 300)}`)
  if (DRY) continue
  await payload.update({ collection: 'studios', id: doc.id, data, draft: doc._status !== 'published', context: { disableRevalidate: true } })
}
console.log(DRY ? 'would change' : 'changed', changed)
process.exit(0)
