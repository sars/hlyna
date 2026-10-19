import { and, eq, inArray, sql } from 'drizzle-orm'

import { studios } from '../db/schema/catalog'
import { itemChecks, items } from '../db/schema/items'
import { slugifyUk } from '../../lib/transliterateUk'
import type { ITEM_AVAILABILITY, ITEM_HIDDEN_REASONS, ITEM_KINDS, ITEM_SIGNALS } from '../../shared/options'
import { audit, diff, type Actor, type Exec } from './audit'

// Items (app.items): the freshness rule that shows and hides them, and the audited writes the import and the shop
// read share. Rule agreed with the owner on 19.10.2026: an item shows only while something recent confirms it.

type Availability = (typeof ITEM_AVAILABILITY)[number]
type HiddenReason = (typeof ITEM_HIDDEN_REASONS)[number]
type Kind = (typeof ITEM_KINDS)[number]
type Signal = (typeof ITEM_SIGNALS)[number]
type Item = typeof items.$inferSelect

/** How long an Instagram item shows after its last confirmation, by kind. */
export const WINDOW_DAYS: Record<Kind, number> = { piece: 28, series: 56, to_order: 182 }
/** A shop's «in stock» holds this many days without a fresh read; then it reads as unknown. */
const SHOP_STOCK_DAYS = 3
/** A sold shop item stays this long as «продано, замовити подібне» (partners repeat their series). */
const SOLD_SHOWN_DAYS = 14
/** A made-to-order offer holds only while the studio posts. */
const STUDIO_SILENT_DAYS = 90

export type FreshnessInput = Pick<Item, 'source' | 'kind' | 'availability' | 'confirmedAt' | 'occasion' | 'seasonEnds' | 'sourceGone' | 'visibility' | 'hiddenReason'>
export type StudioState = { visibility: string; status: string | null; lastPostAt: string | null }
type Freshness = { visibility: 'public' | 'hidden'; hiddenReason: HiddenReason | null; availability: Availability }

const days = (from: string, to: string) => Math.floor((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 864e5)

/** Whether an item shows today (YYYY-MM-DD), why not, and the availability it may claim. */
export function freshness(i: FreshnessInput, studio: StudioState, today: string): Freshness {
  let availability = i.availability
  const show = (): Freshness => ({ visibility: 'public', hiddenReason: null, availability })
  const hide = (r: HiddenReason): Freshness => ({ visibility: 'hidden', hiddenReason: r, availability })
  if (i.visibility === 'hidden' && i.hiddenReason === 'manual') return hide('manual')
  if (studio.visibility !== 'public' || studio.status !== 'active') return hide('studio_hidden')
  if (i.sourceGone) return hide('gone')
  const age = i.confirmedAt ? days(i.confirmedAt, today) : null
  if (availability === 'sold') {
    if (i.source === 'instagram' || age === null || age > SOLD_SHOWN_DAYS) return hide('sold')
    return show()
  }
  if (age === null) return hide('no_date')
  if (i.source === 'shop' && availability === 'in_stock' && age > SHOP_STOCK_DAYS) availability = 'unknown'
  if (i.occasion && i.seasonEnds) return today < i.seasonEnds ? show() : hide('season_over')
  if (i.kind === 'to_order' && studio.lastPostAt && days(studio.lastPostAt, today) > STUDIO_SILENT_DAYS) return hide('stale')
  return age > WINDOW_DAYS[i.kind] ? hide('stale') : show()
}

/** Applies the rule to every item (or the given ones): writes visibility, reason and availability where they changed. */
export async function refreshItems(ex: Exec, actor: Actor, today: string, ids?: number[]) {
  const rows = await ex
    .select({ item: items, studio: { visibility: studios.visibility, status: studios.status, lastPostAt: studios.activityLastPostDate } })
    .from(items)
    .innerJoin(studios, eq(studios.id, items.studioId))
    .where(ids?.length ? inArray(items.id, ids) : undefined)
  const counts = { public: 0, hidden: 0, changed: 0 }
  for (const { item, studio } of rows) {
    const f = freshness(item, studio, today)
    counts[f.visibility]++
    const changes = diff(item, f, ['visibility', 'hiddenReason', 'availability'])
    if (!Object.keys(changes).length) continue
    counts.changed++
    await ex.update(items).set({ ...f, updatedAt: sql`now()`, updatedBy: actor.id ?? actor.source }).where(eq(items.id, item.id))
    await audit(ex, actor, 'item', item.id, 'update', changes)
  }
  return counts
}

/** What an import or a shop read knows about an item; visibility is left to the rule. */
export type ItemDraft = Omit<typeof items.$inferInsert, 'id' | 'studioId' | 'slug' | 'visibility' | 'hiddenReason' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

const DRAFT_FIELDS = [
  'source', 'sourceUrl', 'postedAt', 'title', 'category', 'occasion', 'seasonEnds', 'kind', 'priceText', 'priceMin', 'priceMax',
  'availability', 'availabilityText', 'confirmedAt', 'description', 'photoFact', 'terms', 'embed', 'sourceGone', 'evidence',
] as const

async function freeSlug(ex: Exec, studioId: number, title: string) {
  const base = slugifyUk(title, 60) || 'vyrib'
  const taken = new Set((await ex.select({ slug: items.slug }).from(items).where(eq(items.studioId, studioId))).map((r) => r.slug))
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

/** Creates or updates one item by (studio, sourceKey). Returns what happened; nothing is written when nothing differs. */
export async function upsertItem(ex: Exec, studioId: number, d: ItemDraft & { sourceKey: string }, actor: Actor) {
  const [cur] = await ex.select().from(items).where(and(eq(items.studioId, studioId), eq(items.sourceKey, d.sourceKey))).limit(1)
  const by = actor.id ?? actor.source
  if (!cur) {
    const slug = await freeSlug(ex, studioId, d.title)
    const [row] = await ex.insert(items).values({ ...d, studioId, slug, createdBy: by, updatedBy: by }).returning({ id: items.id })
    await audit(ex, actor, 'item', row!.id, 'create', { studioId, slug, title: d.title, source: d.source })
    return { id: row!.id, action: 'created' as const }
  }
  const next = { ...cur, ...d } as Record<string, unknown>
  const changes = diff(cur as Record<string, unknown>, next, [...DRAFT_FIELDS])
  if (!Object.keys(changes).length) return { id: cur.id, action: 'unchanged' as const }
  const patch = Object.fromEntries(Object.keys(changes).map((k) => [k, next[k]]))
  await ex.update(items).set({ ...patch, updatedAt: sql`now()`, updatedBy: by }).where(eq(items.id, cur.id))
  await audit(ex, actor, 'item', cur.id, 'update', changes)
  return { id: cur.id, action: 'updated' as const, changes }
}

/** Logs one check of an item and stamps it as checked. */
export async function recordCheck(
  ex: Exec,
  itemId: number,
  c: { signal: Signal; postAlive?: boolean | null; priceSeen?: string | null; note?: string | null },
  actor: Actor,
) {
  await ex.insert(itemChecks).values({ itemId, by: actor.id ?? actor.source, signal: c.signal, postAlive: c.postAlive ?? null, priceSeen: c.priceSeen ?? null, note: c.note ?? null })
  await ex.update(items).set({ lastCheckedAt: sql`now()` }).where(eq(items.id, itemId))
}
