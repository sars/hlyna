/**
 * Load Instagram pass results into studios: posts to embed, "what's new" paragraph, followers, last post date.
 *   pnpm payload run scripts/import-ig.ts        (DRY=1 to print only)
 * Source: UkraineCeramics/09_instagram/posts_scan/ig_notes.jsonl (written from the scanned posts in our own words).
 * Also adds format tags the posts confirm (tags only grow). Never overwrites a recentNote edited by hand
 * unless FORCE=1: a note is treated as hand-edited when it differs from the last imported one.
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

type Format = NonNullable<Studio['formats']>[number]
type Note = {
  slug: string; status?: string; handle?: string; followers?: number | null; lastPost?: string | null
  embed?: string[]; note?: string; offers?: string[]
}

const FILE = process.env.IG_NOTES || '/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan/ig_notes.jsonl'
const STATE = '/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan/.imported_notes.json'
const DRY = process.env.DRY === '1'
const FORMATS = new Set(['wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca', 'new-year'])

const notes = new Map<string, Note>()
for (const l of fs.readFileSync(FILE, 'utf8').split('\n')) if (l.trim()) { const n = JSON.parse(l) as Note; notes.set(n.slug, n) }
const imported: Record<string, string> = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {}

const payload = await getPayload({ config })
let n = 0
for (const [slug, x] of notes) {
  if (x.status && x.status !== 'ok' && !x.status.startsWith('renamed')) continue
  const doc = (await payload.find({ collection: 'studios', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })).docs[0] as Studio | undefined
  if (!doc) { console.log('missing', slug); continue }
  const handEdited = doc.recentNote && imported[slug] !== undefined && doc.recentNote !== imported[slug]
  const data: Partial<Studio> = {
    activity: {
      ...doc.activity,
      followers: x.followers ?? doc.activity?.followers ?? null,
      lastPostDate: x.lastPost ? new Date(x.lastPost).toISOString() : doc.activity?.lastPostDate ?? null,
      checkedAt: new Date().toISOString(),
      instagramPosts: (x.embed ?? []).filter((u) => /^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(u)).slice(0, 3).map((url) => ({ url })),
    },
    formats: [...new Set<Format>([...(doc.formats ?? []), ...((x.offers ?? []).filter((o) => FORMATS.has(o)) as Format[])])],
  }
  if (!handEdited || process.env.FORCE === '1') data.recentNote = x.note ?? ''
  n++
  if (DRY) { console.log(slug, JSON.stringify(data).slice(0, 200)); continue }
  await payload.update({ collection: 'studios', id: doc.id, data, draft: doc._status !== 'published', context: { disableRevalidate: true } })
  if (typeof data.recentNote === "string") imported[slug] = data.recentNote
}
if (!DRY) fs.writeFileSync(STATE, JSON.stringify(imported, null, 1))
console.log('updated', n)
process.exit(0)
