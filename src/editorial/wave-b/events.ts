// Wave B: ceramics markets, fairs and exhibitions (/podiyi) and museums and galleries (/muzei-keramiky).
import eventsData from '@/content/waveB/events.json'
import museumsData from '@/content/waveB/museums.json'
import type { WaveVars } from '@/editorial/copy'
import { getAllWithShops } from '@/lib/catalog'

export type EventItem = {
  name: string; kind: string; recurrence: string; dates: string; nextDate: string; city: string; venue: string
  status: string; entry: string; participation: string; link: string; months: string; approx?: boolean
}
// Last day of the event's current edition: «2026-10-10..2026-10-11» → 2026-10-11; otherwise nextDate.
export const eventEnd = (e: EventItem) => e.dates.match(new RegExp(`${e.nextDate}\\.\\.(\\d{4}-\\d{2}-\\d{2})`))?.[1] ?? e.nextDate
const today = () => new Date().toISOString().slice(0, 10)
export const EVENT_KIND: Record<string, string> = {
  fair: 'Ярмарок', market: 'Маркет', festival: 'Фестиваль', exhibition: 'Виставка', symposium: 'Симпозіум', plein_air: 'Пленер',
  residency: 'Резиденція', competition: 'Конкурс', design_week: 'Тиждень дизайну', conference: 'Конференція', open_studio: 'Відкрита студія',
  workshop_series: 'Цикл майстер-класів', other: 'Подія',
}

export async function eventsPageData() {
  const items = eventsData as EventItem[]
  const t = today()
  // Upcoming or still running today (multi-day events count until their last day), computed at render time.
  const upcoming = items.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.nextDate) && eventEnd(e) >= t && e.status !== 'ended').sort((a, b) => a.nextDate.localeCompare(b.nextDate))
  const recurring = items.filter((e) => !upcoming.includes(e) && ['annual', 'seasonal', 'monthly'].includes(e.recurrence) && !['ended', 'paused'].includes(e.status))
  const paused = items.filter((e) => ['ended', 'paused'].includes(e.status))
  const cities = new Set(items.map((e) => e.city).filter(Boolean))
  const vars: WaveVars = { count: items.length, upcoming: upcoming.length, recurring: recurring.length, cities: cities.size }
  return { items, upcoming, recurring, paused, vars }
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
