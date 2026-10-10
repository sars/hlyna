/**
 * Status from evidence: a studio marked «unclear» with an Instagram post since 2025 becomes «active».
 * Also prints the studios the site treats as unverified (research text doubts activity after 2022, no fresh post),
 * which lists, counts and the map leave out (src/lib/catalog.ts → isUnverified).
 *   pnpm payload run scripts/refresh-status.ts      (DRY=1 to print only)
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

const DRY = process.env.DRY === '1'
const DOUBT = /актуальн\p{L}*[^.!?]{0,60}не підтвердж|не підтвердж\p{L}*[^.!?]{0,30}актуальн|роботу призупинено|тимчасово (?:закрит|не працює)|більше не працює|статус[^.!?]{0,40}не підтвердж|актуальн\p{L}* активн\p{L}*[^.!?]{0,30}не підтвердж/iu
const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'studios', where: { _status: { equals: 'published' } }, depth: 0, limit: 5000, pagination: false })
let activated = 0
for (const s of docs as Studio[]) {
  const fresh = (s.activity?.lastPostDate ?? '') >= '2025-01-01'
  if (s.status === 'unclear' && fresh) {
    activated++
    if (!DRY) await payload.update({ collection: 'studios', id: s.id, data: { status: 'active' }, context: { disableRevalidate: true } })
  }
  if (s.status !== 'closed' && !fresh && DOUBT.test([s.publicDescription, s.description, s.summary].filter(Boolean).join(' ')))
    console.log('unverified:', s.slug, `(${s.status})`)
}
console.log(`${DRY ? 'would activate' : 'activated'} ${activated}`)
process.exit(0)
