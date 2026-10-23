// Shop edits from a JSON file — how items and a studio's shop terms are managed (docs/shop/PLAN.md: through Claude, not a
// panel editor):   EDITS=path pnpm exec tsx scripts/app/edit-items.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "studio": "<slug>", "item": "<item slug>", "why"?: "…",
//      "set"?: { "title"?, "category"? (ITEM_CATEGORIES), "kind"? ("piece" | "series" | "to_order"), "fulfillment"? ("ship" | "digital"),
//                "description"? (our text, paragraphs by blank line), "photoFact"?, "terms"?, "specs"?: [{ "label", "value" }],
//                "leadDaysMin"?, "leadDaysMax"?, "stock"? (null = not counted), "priceMin"?, "priceMax"?, "priceText"?,
//                "availability"? ("in_stock" | "to_order" | "unknown" | "sold"), "confirmedAt"? (YYYY-MM-DD) },
//      "hide"?: true | false },
//    { "studio": "<slug>", "why"?: "…", "shopTerms": { "delivery"?: [...], "payment"?: [...], "pickupAddress"?, "deliveryNote"?, "returnsNote"? } | null }]
//   A hidden item («manual») stays hidden until an edit shows it again; then the freshness rule decides.
import fs from 'node:fs'

import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { audit, diff } from '../../src/server/services/audit'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'
import { EDITABLE_FIELDS, patchItem, type ItemPatch } from '../../src/server/services/items'
import { DELIVERY_METHODS, ITEM_AVAILABILITY, ITEM_CATEGORIES, ITEM_FULFILLMENT, ITEM_KINDS, PAYMENT_METHODS, type ShopTerms } from '../../src/shared/options'

type Edit = { studio: string; item?: string; why?: string; set?: Record<string, unknown>; hide?: boolean; shopTerms?: ShopTerms | null }

const { dry } = guard('edit-items')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-item-edits.json', 'utf8')) as Edit[]
const actor = scriptActor('edit-items')
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10)
const run = dry ? 0 : await startRun(db, 'edit-items', `${edits.length} edits`)
const counts = { items: 0, terms: 0, unchanged: 0, missing: 0 }

const oneOf = (list: readonly string[], v: unknown, what: string) => {
  if (typeof v !== 'string' || !list.includes(v)) throw new Error(`${what}: «${String(v)}» is not one of ${list.join(', ')}`)
  return v
}

function checkSet(set: Record<string, unknown>): ItemPatch {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(set)) {
    if (!(EDITABLE_FIELDS as readonly string[]).includes(k)) throw new Error(`unknown field «${k}»`)
    if (k === 'category') oneOf(ITEM_CATEGORIES, v, k)
    if (k === 'kind') oneOf(ITEM_KINDS, v, k)
    if (k === 'fulfillment') oneOf(ITEM_FULFILLMENT, v, k)
    if (k === 'availability') oneOf(ITEM_AVAILABILITY, v, k)
    if (k === 'specs' && !(Array.isArray(v) && v.every((s) => s && typeof s.label === 'string' && typeof s.value === 'string'))) throw new Error('specs: [{label, value}]')
    if ((k === 'leadDaysMin' || k === 'leadDaysMax' || k === 'stock' || k === 'priceMin' || k === 'priceMax') && v != null && !(Number.isInteger(v) && (v as number) >= 0)) throw new Error(`${k}: whole number or null`)
    if (k === 'confirmedAt' && v != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('confirmedAt: YYYY-MM-DD')
    out[k] = typeof v === 'string' ? v.trim() : v
  }
  return out as ItemPatch
}

function checkTerms(t: ShopTerms): ShopTerms {
  t.delivery?.forEach((d) => oneOf(DELIVERY_METHODS.filter((x) => x !== 'none'), d, 'delivery'))
  t.payment?.forEach((p) => oneOf(PAYMENT_METHODS.filter((x) => x !== 'card_online'), p, 'payment'))
  return t
}

for (const e of edits) {
  const [s] = await db.select({ id: studios.id, name: studios.name, visibility: studios.visibility, status: studios.status, lastPostAt: studios.activityLastPostDate, shopTerms: studios.shopTerms }).from(studios).where(eq(studios.slug, e.studio)).limit(1)
  if (!s) { console.log(`${e.studio}: no such studio`); counts.missing++; continue }
  const why = e.why ? ` — ${e.why}` : ''
  if (e.shopTerms !== undefined) {
    const next = e.shopTerms ? checkTerms(e.shopTerms) : null
    const changes = diff({ shopTerms: s.shopTerms }, { shopTerms: next }, ['shopTerms'])
    if (!Object.keys(changes).length) { console.log(`${e.studio}: shop terms unchanged`); counts.unchanged++; continue }
    console.log(`${e.studio}: shop terms${why}\n  ${JSON.stringify(next)}`)
    if (!dry) {
      await db.update(studios).set({ shopTerms: next, updatedAt: new Date().toISOString(), updatedBy: actor.source }).where(eq(studios.id, s.id))
      await audit(db, actor, 'studio', s.id, 'update', changes)
    }
    counts.terms++
    continue
  }
  if (!e.item) { console.log(`${e.studio}: an edit needs "item" or "shopTerms"`); counts.missing++; continue }
  const patch: ItemPatch = { ...(e.set ? checkSet(e.set) : {}), ...(e.hide === undefined ? {} : { hidden: e.hide }) }
  if (dry) {
    console.log(`${e.studio}/${e.item}${why}\n  ${JSON.stringify(patch).slice(0, 600)}`)
    counts.items++
    continue
  }
  const r = await db.transaction((tx) => patchItem(tx, s.id, e.item!, patch, actor, today, { visibility: s.visibility, status: s.status, lastPostAt: s.lastPostAt }))
  if (!r) { console.log(`${e.studio}/${e.item}: no such item`); counts.missing++; continue }
  if (!r.changed) { console.log(`${e.studio}/${e.item}: unchanged`); counts.unchanged++; continue }
  console.log(`${e.studio}/${e.item}${why}: ${Object.keys(r.changes).join(', ')}`)
  counts.items++
}

if (run) await finishRun(db, run, counts)
console.log(dry ? 'dry run' : 'done', counts)
await revalidateSite(dry)
await pool.end()
