import { asc, eq, inArray } from 'drizzle-orm'

import type { Db } from '../../db'
import { studioPrices, studios } from '../../db/schema/catalog'
import { STUDIO_FORMATS } from '../../../shared/options'
import { INSTAGRAM_POST_RE } from '../../../shared/schemas'
import type { Actor } from '../audit'
import { handleOf } from './altNames'
import { studiosWithPendingOwnerChanges, writeStudio, type PriceRow } from './runs'

// Instagram results into studios (ported from scripts/import-ig.ts and import-ig-highlights.ts, same rules).

const FORMATS = new Set<string>(STUDIO_FORMATS)

/**
 * What a scan read belongs to the profile only while the profile still links that account. A scan row names the handle it read;
 * when an edit cleared or changed the profile's Instagram (it was another person's, another business's, or renamed), the old
 * rows must not write their posts, followers, notes or prices back (Korniienko and «4rom_people», 17.10.2026).
 */
const readsOwnAccount = (s: { instagram: string | null }, handle?: string | null) => !handle || handleOf(s.instagram) === handle.replace(/^@/, '').toLowerCase()

export type IgNote = { slug: string; handle?: string | null; status?: string; followers?: number | null; lastPost?: string | null; embed?: string[]; note?: string; offers?: string[] }

/**
 * Posts pass: embeds, «Що нового», followers, last post date, format tags (tags only grow).
 * A recentNote edited by hand (differs from the last imported one, kept in `imported`) is not overwritten unless force.
 */
export async function importIgNotes(db: Db, notes: IgNote[], opts: { dry?: boolean; force?: boolean; imported: Record<string, string> }, actor: Actor) {
  const counts = { updated: 0, missing: 0, skippedOwner: 0, skippedAccount: 0, unchanged: 0 }
  const usable = notes.filter((x) => !x.status || x.status === 'ok' || x.status.startsWith('renamed'))
  const rows = usable.length ? await db.select().from(studios).where(inArray(studios.slug, usable.map((x) => x.slug))) : []
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const pending = await studiosWithPendingOwnerChanges(db, rows.map((r) => r.id))
  const log: string[] = []
  for (const x of usable) {
    const s = bySlug.get(x.slug)
    if (!s) { counts.missing++; continue }
    if (pending.has(s.id)) { counts.skippedOwner++; log.push(`skip (owner changes) ${s.slug}`); continue }
    if (!readsOwnAccount(s, x.handle)) { counts.skippedAccount++; log.push(`skip (profile links ${s.instagram ?? 'no Instagram'}, the note read @${x.handle}) ${s.slug}`); continue }
    const handEdited = Boolean(s.recentNote) && opts.imported[x.slug] !== undefined && s.recentNote !== opts.imported[x.slug]
    const patch: Partial<typeof studios.$inferInsert> = {
      activityFollowers: x.followers ?? s.activityFollowers ?? null,
      activityLastPostDate: x.lastPost ? new Date(x.lastPost).toISOString() : s.activityLastPostDate ?? null,
      instagramPosts: (x.embed ?? []).filter((u) => INSTAGRAM_POST_RE.test(u)).slice(0, 3),
      formats: [...new Set([...(s.formats ?? []), ...(x.offers ?? []).filter((o) => FORMATS.has(o))])],
    }
    if (!handEdited || opts.force) patch.recentNote = x.note || null
    if (opts.dry) { counts.updated++; log.push(`${x.slug} ${JSON.stringify(patch).slice(0, 200)}`); continue }
    const changes = await db.transaction(async (tx) => {
      const c = await writeStudio(tx, s.id, patch, undefined, actor, 'Instagram: пости')
      if (Object.keys(c).length) await tx.update(studios).set({ activityCheckedAt: new Date().toISOString() }).where(eq(studios.id, s.id))
      return c
    })
    if (Object.keys(changes).length) counts.updated++
    else counts.unchanged++
    if (typeof patch.recentNote !== 'undefined') opts.imported[x.slug] = patch.recentNote ?? ''
  }
  return { counts, log, imported: opts.imported }
}

// ---------- highlights

export type HlRow = { slug: string; handle?: string | null; checked?: string; prices?: string[]; services?: string[]; address?: string | null; formats?: string[] }

const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const offerWords = (s: string) => new Set(norm(s.split(/\s[—–-]\s|\d[\d\s]*\s*(?:грн|₴)/)[0]!).split(' ').filter((w) => w.length > 2 && !/\d/.test(w)))
const KIDS = /дит|діт|школ|підліт/i
/** Month index of the source date in a price line: «(…, 03.2026)» or «(…, 2026)». */
export function when(s: string) {
  const m = s.match(/(\d{2})\.(20\d\d)/)
  if (m) return Number(m[2]) * 12 + Number(m[1])
  const y = s.match(/\((?:[^)]*?)(20\d\d)\)/)
  return y ? Number(y[1]) * 12 + 1 : 0
}
/** Same offer = same audience (kids or not), word overlap ≥ 60 % of the union, and the new line is not older. */
export function sameOffer(old: string, fresh: string) {
  const A = offerWords(old), B = offerWords(fresh)
  if (!A.size || !B.size) return false
  if (KIDS.test(old) !== KIDS.test(fresh)) return false
  const inter = [...A].filter((w) => B.has(w)).length
  if (inter / new Set([...A, ...B]).size < 0.6) return false
  return when(fresh) >= when(old)
}

/** Highlights pass: new price/service lines (a fresh price replaces the same offer), address if none, format tags. */
export async function importHighlights(db: Db, rows: HlRow[], opts: { dry?: boolean }, actor: Actor) {
  const counts = { updated: 0, missing: 0, skippedOwner: 0, skippedAccount: 0, pricesAdded: 0, pricesReplaced: 0 }
  const replaced: { slug: string; replacedAt?: string; text: string }[] = []
  const log: string[] = []
  const found = rows.length ? await db.select().from(studios).where(inArray(studios.slug, rows.map((r) => r.slug))) : []
  const bySlug = new Map(found.map((r) => [r.slug, r]))
  const pending = await studiosWithPendingOwnerChanges(db, found.map((r) => r.id))
  for (const x of rows) {
    const s = bySlug.get(x.slug)
    if (!s) { counts.missing++; continue }
    if (pending.has(s.id)) { counts.skippedOwner++; continue }
    if (!readsOwnAccount(s, x.handle)) { counts.skippedAccount++; log.push(`skip (profile links ${s.instagram ?? 'no Instagram'}, the highlights read @${x.handle}) ${s.slug}`); continue }
    const prices: PriceRow[] = await db.select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))
    const have = new Set([...prices.map((p) => p.text), ...(s.services ?? [])].map(norm))
    const addP = (x.prices ?? []).filter((t) => t && !have.has(norm(t)))
    const addS = (x.services ?? []).filter((t) => t && !have.has(norm(t)))
    const patch: Partial<typeof studios.$inferInsert> = {}
    let nextPrices: PriceRow[] | undefined
    if (addP.length) {
      const kept = prices.filter((p) => !addP.some((n) => sameOffer(p.text, n)))
      for (const p of prices) if (!kept.includes(p)) replaced.push({ slug: s.slug, replacedAt: x.checked, text: p.text })
      counts.pricesReplaced += prices.length - kept.length
      counts.pricesAdded += addP.length
      nextPrices = [...kept, ...addP.map((text) => ({ text, source: null, dateText: null }))]
    }
    if (addS.length) patch.services = [...(s.services ?? []), ...addS]
    if (x.address && !/\d/.test(s.address ?? '')) patch.address = x.address
    const formats = [...new Set([...(s.formats ?? []), ...(x.formats ?? []).filter((f) => FORMATS.has(f))])]
    if (formats.length !== (s.formats ?? []).length) patch.formats = formats
    if (!nextPrices && !Object.keys(patch).length) continue
    counts.updated++
    if (opts.dry) { log.push(`${s.slug} ${JSON.stringify({ ...patch, prices: nextPrices?.map((p) => p.text) }).slice(0, 300)}`); continue }
    await db.transaction((tx) => writeStudio(tx, s.id, patch, nextPrices, actor, 'Instagram: закріплені історії'))
  }
  return { counts, replaced, log }
}
