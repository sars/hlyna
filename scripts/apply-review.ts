// Applies publish/hide/merge decisions: pnpm payload run scripts/apply-review.ts
// Reads REVIEW_DIR/review_*.json: [{slug, publish, reason, mergeInto?, copyIssue?}]
// Hidden profiles become drafts (kept in the admin, never deleted). Merges copy links and lists into the kept profile.
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

type D = { slug: string; publish: boolean; reason?: string; mergeInto?: string; copyIssue?: string }
const DIR = process.env.REVIEW_DIR || '/tmp/hlyna-copy'
const extra: D[] = [{ slug: 'yeti-ceramics', publish: false, reason: 'duplicate (owner: same studio)', mergeInto: 'yeti-studio' }]
const decisions = new Map<string, D>()
for (const f of fs.readdirSync(DIR).filter((x) => /^review_\d+\.json$/.test(x))) for (const d of JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8')) as D[]) decisions.set(d.slug, d)
for (const d of extra) decisions.set(d.slug, d)

const payload = await getPayload({ config })
const all = (await payload.find({ collection: 'studios', depth: 0, limit: 5000, pagination: false, draft: true })).docs
const bySlug = new Map(all.map((s) => [s.slug, s]))
const uniq = (a: { text: string }[] = [], b: { text: string }[] = []) => {
  const seen = new Set(a.map((x) => x.text.trim().toLowerCase()))
  return [...a.map(({ text }) => ({ text })), ...b.filter((x) => !seen.has(x.text.trim().toLowerCase())).map(({ text }) => ({ text }))]
}
let pub = 0, hid = 0, merged = 0, missing = 0
for (const [slug, d] of decisions) {
  const s = bySlug.get(slug)
  if (!s) { missing++; continue }
  if (d.mergeInto) {
    const t = bySlug.get(d.mergeInto)
    if (t) {
      const links = new Set([...(t.otherLinks ?? []).map((l) => l.url)])
      for (const u of [s.instagram, s.website, s.facebook, ...(s.otherLinks ?? []).map((l) => l.url)]) if (u && u !== t.instagram && u !== t.website && u !== t.facebook) links.add(u)
      await payload.update({
        collection: 'studios',
        id: t.id,
        context: { disableRevalidate: true },
        data: {
          instagram: t.instagram || s.instagram,
          website: t.website || s.website,
          facebook: t.facebook || s.facebook,
          otherLinks: [...links].map((url) => ({ url })),
          services: uniq(t.services ?? [], s.services ?? []),
          products: uniq(t.products ?? [], s.products ?? []),
          prices: [...(t.prices ?? []).map(({ text, source, date }) => ({ text, source, date })), ...(s.prices ?? []).filter((p) => !(t.prices ?? []).some((q) => q.text === p.text)).map(({ text, source, date }) => ({ text, source, date }))],
        },
      })
      merged++
    }
  }
  const status = d.publish ? 'published' : 'draft'
  if (s._status !== status) await payload.update({ collection: 'studios', id: s.id, context: { disableRevalidate: true }, data: { _status: status } })
  d.publish ? pub++ : hid++
}
console.log(JSON.stringify({ decisions: decisions.size, public: pub, hidden: hid, merged, missing }))
process.exit(0)
