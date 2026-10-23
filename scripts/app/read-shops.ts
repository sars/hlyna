// The daily items job: reads the shops of partner studios (consent_requests = true, i.e. they agreed to the 10 %), then
// applies the freshness rule to every item, Instagram ones included. DRY=1 prints the read, PROD=1 for production.
//   pnpm exec tsx scripts/app/read-shops.ts        TODAY=YYYY-MM-DD applies the rule as of another day.
//   PHOTOS=1 also opens every product page (the studio's own text → evidence.sourceDescription) and fetches the product
//   photos into media + item_photos for items without photos (FORCE=1: again for every item). The files land in MEDIA_DIR,
//   so on production run it like studio-photos.ts: MEDIA_DIR to an empty folder, then tar it into the volume (deploy/README.md).
// A shop that cannot be read changes nothing; after 3 days without a good read its «in stock» reads as unknown (the rule).
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { applyShopRead, attachShopPhotos, wixProductDetails, wixProducts, type ShopDetails } from '../../src/server/services/imports/shops'
import { refreshItems } from '../../src/server/services/items'
import { displayName } from '../../src/lib/present'

// Partner shops and how to read them. A new partner with a shop goes here (and gets «Згода на запити» in the panel).
const SHOPS = [{ studio: 'studiia-keramiky-osonnia-sumy', origin: 'https://www.osonnya.shop', page: '/category/all-products', platform: 'wix' as const }]

const { dry } = guard('read-shops')
const actor = scriptActor('read-shops')
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10)
const photos = process.env.PHOTOS === '1'
const run = dry ? null : await startRun(db, 'read-shops', photos ? 'with photos' : undefined)
const counts: Record<string, unknown> = {}
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; hlyna.com.ua catalogue)' }
const get = (url: string) => fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) }).catch((e: Error) => e)

for (const shop of SHOPS) {
  const [s] = await db.select({ id: studios.id, slug: studios.slug, name: studios.name, shortName: studios.shortName, consent: studios.consentRequests }).from(studios).where(eq(studios.slug, shop.studio)).limit(1)
  if (!s) { console.log(`${shop.studio}: no such studio`); continue }
  if (!s.consent) { console.log(`${shop.studio}: no «Згода на запити» in the panel — not a partner, not read`); continue }
  const res = await get(shop.origin + shop.page)
  if (res instanceof Error || !res.ok) { console.log(`${shop.studio}: read failed (${res instanceof Error ? res.message : res.status})`); counts[shop.studio] = 'read failed'; continue }
  const read = wixProducts(await res.text(), shop.origin)
  const details = new Map<string, ShopDetails>()
  if (photos) {
    for (const p of read.products) {
      const page = await get(p.url)
      if (page instanceof Error || !page.ok) { console.log(`${shop.studio}: product page failed · ${p.name}`); continue }
      details.set(p.id, wixProductDetails(await page.text()))
    }
  }
  if (dry) {
    read.products.forEach((p) => console.log(`${p.inStock ? 'in stock' : 'sold    '} ${p.price ?? '–'} · ${p.name} · ${p.media.length} photo(s) · ${p.url}${details.get(p.id)?.description ? `\n    ${details.get(p.id)!.description!.split('\n')[0]}` : ''}`))
    continue
  }
  const r = await db.transaction((tx) => applyShopRead(tx, s.id, read, today, actor, details))
  r.log.forEach((l) => console.log(`${shop.studio}: ${l}`))
  counts[shop.studio] = r.counts
  if (photos) {
    const ph = await attachShopPhotos(db, { id: s.id, slug: s.slug, name: displayName(s) }, read.products, actor, { force: process.env.FORCE === '1' })
    ph.log.forEach((l) => console.log(`${shop.studio}: ${l}`))
    counts[`${shop.studio} photos`] = ph.added
  }
}

const rule = dry ? null : await db.transaction((tx) => refreshItems(tx, actor, today))
if (run) await finishRun(db, run, { ...counts, rule })
console.log(dry ? 'dry run' : 'done', counts, rule ?? '')
await revalidateSite(dry)
await pool.end()
