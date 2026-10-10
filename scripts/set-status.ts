// Publish or hide studios by slug: SLUGS=a,b STATUS=draft pnpm payload run scripts/set-status.ts
import { getPayload } from 'payload'
import config from '@payload-config'

const slugs = (process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean)
const status = process.env.STATUS === 'published' ? 'published' : 'draft'
const payload = await getPayload({ config })
for (const slug of slugs) {
  const doc = (await payload.find({ collection: 'studios', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })).docs[0]
  if (!doc) { console.log('missing', slug); continue }
  await payload.update({ collection: 'studios', id: doc.id, data: { _status: status }, context: { disableRevalidate: true } })
  console.log(status, slug)
}
process.exit(0)
