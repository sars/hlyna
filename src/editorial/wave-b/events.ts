// Wave B: ceramics markets, fairs and exhibitions (/podiyi) and museums and galleries (/muzei-keramiky).
import eventsData from '@/content/waveB/events.json'
import museumsData from '@/content/waveB/museums.json'
import type { WaveVars } from '@/editorial/copy'
import { getAllWithShops } from '@/lib/catalog'
import { kyivToday } from '@/lib/dates'

export type EventItem = {
  name: string; kind: string; recurrence: string; dates: string; nextDate: string; city: string; venue: string
  status: string; entry: string; participation: string; link: string; months: string; approx?: boolean
}
// Last day of the event's current edition: «2026-10-10..2026-10-11» → 2026-10-11; otherwise nextDate.
const eventEnd = (e: EventItem) => e.dates.match(new RegExp(`${e.nextDate}\\.\\.(\\d{4}-\\d{2}-\\d{2})`))?.[1] ?? e.nextDate

/** The latest edition with a known day, from nextDate and the history in `dates` («2025-12-06..2025-12-31»). */
export function lastEdition(e: EventItem): { start: string; end: string } | null {
  const spans = [...`${e.nextDate} ${e.dates}`.matchAll(/(\d{4}-\d{2}-\d{2})(?:\.\.~?(\d{4}-\d{2}-\d{2}))?/g)].map((m) => ({ start: m[1], end: m[2] ?? m[1] }))
  return spans.sort((a, b) => b.end.localeCompare(a.end) || a.start.localeCompare(b.start))[0] ?? null
}

const dmy = (d: string) => d.split('-').reverse().join('.')
/** «10.10.2026», «10–11.10.2026», «27.11.2025–01.01.2026». */
function dayRange(start: string, end: string): string {
  if (start === end) return dmy(start)
  if (start.slice(0, 7) === end.slice(0, 7)) return `${start.slice(8)}–${dmy(end)}`
  if (start.slice(0, 4) === end.slice(0, 4)) return `${dmy(start).slice(0, 5)}–${dmy(end)}`
  return `${dmy(start)}–${dmy(end)}`
}

/** When, as of today: the coming date, «Триває до …» while it runs, then «Відбулася …» or, for a yearly event, its usual
 *  months and the last edition. A date never reads as current once it has passed. */
export function eventWhen(e: EventItem, today = kyivToday()): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(e.nextDate)
  if (iso && e.nextDate > today) return `${e.approx ? 'Орієнтовно' : 'Дата'}: ${dmy(e.nextDate)}`
  if (iso && eventEnd(e) >= today) return `Триває до ${dmy(eventEnd(e))}`
  const last = lastEdition(e)
  const repeats = ['annual', 'seasonal', 'monthly'].includes(e.recurrence)
  if (!last || last.end >= today) return e.months
  if (!repeats) return `Відбулася ${dayRange(last.start, last.end)}`
  return e.months ? `${e.months}; востаннє ${dayRange(last.start, last.end)}` : `Востаннє ${dayRange(last.start, last.end)}`
}

export const EVENT_KIND: Record<string, string> = {
  fair: 'Ярмарок', market: 'Маркет', festival: 'Фестиваль', exhibition: 'Виставка', symposium: 'Симпозіум', plein_air: 'Пленер',
  residency: 'Резиденція', competition: 'Конкурс', design_week: 'Тиждень дизайну', conference: 'Конференція', open_studio: 'Відкрита студія',
  workshop_series: 'Цикл майстер-класів', other: 'Подія',
}

export async function eventsPageData(today = kyivToday()) {
  const items = eventsData as EventItem[]
  // Upcoming or still running today (multi-day events count until their last day), computed at render time.
  const upcoming = items.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.nextDate) && eventEnd(e) >= today && e.status !== 'ended').sort((a, b) => a.nextDate.localeCompare(b.nextDate))
  const recurring = items.filter((e) => !upcoming.includes(e) && ['annual', 'seasonal', 'monthly'].includes(e.recurrence) && !['ended', 'paused'].includes(e.status))
  const paused = items.filter((e) => ['ended', 'paused'].includes(e.status))
  // One-off and irregular events of the last twelve months, newest first; older ones stay in the counts only.
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const past = items
    .filter((e) => !upcoming.includes(e) && !recurring.includes(e) && !paused.includes(e))
    .map((e) => ({ e, end: lastEdition(e)?.end ?? '' }))
    .filter((x) => x.end && x.end < today && x.end >= yearAgo)
    .sort((a, b) => b.end.localeCompare(a.end))
    .map((x) => x.e)
  const cities = new Set(items.map((e) => e.city).filter(Boolean))
  const vars: WaveVars = { count: items.length, upcoming: upcoming.length, recurring: recurring.length, past: past.length, cities: cities.size }
  return { items, upcoming, recurring, paused, past, vars }
}

export type MuseumItem = { name: string; city: string; oblast: string; address: string; website: string; what: string; slug?: string }
export async function museumsPageData() {
  const known = new Set((await getAllWithShops()).map((s) => s.slug))
  const items = (museumsData as MuseumItem[]).map((m) => ({ ...m, slug: m.slug && known.has(m.slug) ? m.slug : undefined }))
  const byCity = new Map<string, MuseumItem[]>()
  for (const m of items) byCity.set(m.city || 'Інші', [...(byCity.get(m.city || 'Інші') ?? []), m])
  const groups = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([city, list]) => ({ city, list }))
  const vars: WaveVars = { count: items.length, cities: groups.filter((g) => g.city !== 'Інші').length }
  return { items, groups, vars }
}
