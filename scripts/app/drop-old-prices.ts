// Only what is offered this year stays on the profiles: a price line whose newest year is before BEFORE (default: the
// current year), and a dated service line («… (Instagram, 07.2025)», «Ціни станом на 11.2024: …») from before it.
// Undated lines stay (their age is unknown), and so do last year's Instagram lines: they come from highlights the studio
// still keeps pinned (seen in this year's scan), so the offer is current. Removed lines go to the price history first
// (16_prices/price_history.jsonl), so the price index over time keeps them.
//   DRY=1 pnpm exec tsx scripts/app/drop-old-prices.ts      (PROD=1 for production; BEFORE=2026)
import fs from 'node:fs'
import path from 'node:path'

import { asc, eq } from 'drizzle-orm'

import { guard, RESEARCH_DIR, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studioPrices, studios } from '../../src/server/db/schema/catalog'
import { finishRun, scriptActor, startRun, studiosWithPendingOwnerChanges, writeStudio } from '../../src/server/services/imports/runs'

const { dry } = guard('drop-old-prices')
const BEFORE = Number(process.env.BEFORE ?? new Date().getFullYear())
const HISTORY = process.env.PRICE_HISTORY || path.join(RESEARCH_DIR, '16_prices/price_history.jsonl')
// Newest year in a line; a season «2025–26» / «2025/26» (consecutive years) counts as its second year.
const newestYear = (s: string) =>
  Math.max(0, ...[...s.matchAll(/(?<!\d)(20[12]\d)(?:\s*[–/-]\s*(?:20)?(\d\d))?(?!\d)/g)].map((m) => (m[2] && Number(m[2]) === (Number(m[1]) + 1) % 100 ? 2000 + Number(m[2]) : Number(m[1]))))
// A service line goes when it is an offer with a price or schedule, dated by its source «(Instagram, 07.2025)», or a
// «Ціни станом на …» line. Experience, clients, location and biography lines stay («посуд для ресторанів Fest», «з 2017»).
/** Last year's line from Instagram: a pinned price list or schedule the studio still shows. */
const stillPinned = (s: string, y: number) => y === BEFORE - 1 && /Instagram/.test(s)
const OFFER = /грн|₴|\bUSD\b|\bEUR\b|розклад|щодня|(?<!\p{L})(?:пн|вт|ср|чт|пт|сб|нд)(?!\p{L})|\d{1,2}:\d{2}|абонемент|безкоштовн/iu
const oldService = (s: string) => {
  const m = s.match(/^Ціни станом на (?:\d{2}\.)?(20\d\d)/)
  if (m) return Number(m[1]) < BEFORE
  const src = s.match(/\([^()]*\p{L}[^()]*,\s*(?:\d{2}\.)?20\d\d(?:\s*[–/-]\s*(?:20)?\d\d)?\)\s*$/u)
  const y = newestYear(src?.[0] ?? '')
  return !!src && OFFER.test(s) && y < BEFORE && !stillPinned(s, y)
}

const all = await db.select({ id: studios.id, slug: studios.slug, services: studios.services }).from(studios)
const pending = await studiosWithPendingOwnerChanges(db)
const actor = scriptActor('drop-old-prices')
const run = dry ? null : await startRun(db, 'drop-old-prices', `before ${BEFORE}`)
const removed: { slug: string; replacedAt: string; text: string; reason: string }[] = []
let studiosChanged = 0
const skipped: string[] = []
const today = new Date().toISOString().slice(0, 10)
for (const s of all) {
  const prices = await db.select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))
  const isOld = (p: (typeof prices)[number]) => { const t = `${p.text} ${p.dateText ?? ''}`; const y = newestYear(t); return y > 0 && y < BEFORE && !stillPinned(t, y) }
  const oldPrices = prices.filter(isOld)
  const oldServices = (s.services ?? []).filter(oldService)
  if (!oldPrices.length && !oldServices.length) continue
  if (pending.has(s.id)) { skipped.push(s.slug); continue }
  for (const p of oldPrices) removed.push({ slug: s.slug, replacedAt: today, text: p.text, reason: `older than ${BEFORE}` })
  for (const t of oldServices) removed.push({ slug: s.slug, replacedAt: today, text: t, reason: `older than ${BEFORE} (service line)` })
  studiosChanged++
  if (dry) { console.log(`${s.slug}: −${oldPrices.length} prices, −${oldServices.length} services | ${[...oldPrices.map((p) => p.text), ...oldServices].join(' || ').slice(0, 220)}`); continue }
  fs.appendFileSync(HISTORY, [...oldPrices.map((p) => ({ slug: s.slug, replacedAt: today, text: p.text, reason: `older than ${BEFORE}` })), ...oldServices.map((t) => ({ slug: s.slug, replacedAt: today, text: t, reason: `older than ${BEFORE} (service line)` }))].map((x) => JSON.stringify(x)).join('\n') + '\n')
  await db.transaction((tx) =>
    writeStudio(tx, s.id, oldServices.length ? { services: (s.services ?? []).filter((t) => !oldService(t)) } : {}, oldPrices.length ? prices.filter((p) => !isOld(p)) : undefined, actor, `Застарілі ціни (до ${BEFORE})`),
  )
}
if (run) await finishRun(db, run, { studios: studiosChanged, lines: removed.length, skippedOwner: skipped.length })
console.log(`${dry ? 'dry run: would change' : 'changed'} ${studiosChanged} studios, ${removed.length} lines`, skipped.length ? `skipped (owner changes pending): ${skipped.join(', ')}` : '')
await revalidateSite(dry)
await pool.end()
