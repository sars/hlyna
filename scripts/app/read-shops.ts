// The daily items job: reads the shops of partner studios (consent_requests = true, i.e. they agreed to the 10 %), then
// applies the freshness rule to every item, Instagram ones included. DRY=1 prints the read, PROD=1 for production.
//   pnpm exec tsx scripts/app/read-shops.ts        TODAY=YYYY-MM-DD applies the rule as of another day.
// A shop that cannot be read changes nothing; after 3 days without a good read its «in stock» reads as unknown (the rule).
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { applyShopRead, wixProducts } from '../../src/server/services/imports/shops'
import { refreshItems } from '../../src/server/services/items'

// Partner shops and how to read them. A new partner with a shop goes here (and gets «Згода на запити» in the panel).
const SHOPS = [{ studio: 'studiia-keramiky-osonnia-sumy', origin: 'https://www.osonnya.shop', page: '/category/all-products', platform: 'wix' as const }]

const { dry } = guard('read-shops')
const actor = scriptActor('read-shops')
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10)
const run = dry ? null : await startRun(db, 'read-shops')
const counts: Record<string, unknown> = {}

for (const shop of SHOPS) {
  const [s] = await db.select({ id: studios.id, consent: studios.consentRequests }).from(studios).where(eq(studios.slug, shop.studio)).limit(1)
  if (!s) { console.log(`${shop.studio}: no such studio`); continue }
  if (!s.consent) { console.log(`${shop.studio}: no «Згода на запити» in the panel — not a partner, not read`); continue }
  const res = await fetch(shop.origin + shop.page, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hlyna.com.ua catalogue)' }, signal: AbortSignal.timeout(20_000) }).catch((e: Error) => e)
  if (res instanceof Error || !res.ok) { console.log(`${shop.studio}: read failed (${res instanceof Error ? res.message : res.status})`); counts[shop.studio] = 'read failed'; continue }
  const read = wixProducts(await res.text(), shop.origin)
  if (dry) { read.products.forEach((p) => console.log(`${p.inStock ? 'in stock' : 'sold    '} ${p.price ?? '–'} · ${p.name} · ${p.url}`)); continue }
  const r = await db.transaction((tx) => applyShopRead(tx, s.id, read, today, actor))
  r.log.forEach((l) => console.log(`${shop.studio}: ${l}`))
  counts[shop.studio] = r.counts
}

const rule = dry ? null : await db.transaction((tx) => refreshItems(tx, actor, today))
if (run) await finishRun(db, run, { ...counts, rule })
console.log(dry ? 'dry run' : 'done', counts, rule ?? '')
await revalidateSite(dry)
await pool.end()
