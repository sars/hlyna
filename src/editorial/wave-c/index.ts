// Wave C pages: corporate occasions and the winter season. Same mechanism as waves A and B: copy is written
// per page from data packs (UkraineCeramics/_site_content/waveC), reviewed, and synced into src/content/waveC
// by scripts/sync-wave-c.mjs. A page without copy returns 404 and stays out of the sitemap, navigation and
// llms.txt. Structured data (the formats comparison, the season calendar, studio offers) lives in JSON next
// to the copy and is rendered by code, so copy never restates a table.
import { site } from '@/content/site'
import { copies } from '@/content/waveC'
import factsData from '@/content/waveC/facts.json'
import formatsData from '@/content/waveC/formats.json'
import newYearJson from '@/content/waveC/newyear.json'
import { getAllStudios, groupByCity, hasFormat, type StudioCard } from '@/lib/catalog'
import { facts } from '@/lib/facts'
import { isExhibitingOnly } from '@/lib/present'
import { fillCopy, type WaveCopy, type WaveVars } from '@/editorial/copy'
import { newYearData } from '@/editorial/wave-b'

export const waveCCopy = (id: string): WaveCopy | null => (copies as Record<string, WaveCopy>)[id] ?? null

export type WaveCId = 'richnytsya-kompaniyi' | 'podarunky-spivrobitnykam' | 'novyi-rik-i-rizdvo'
type Section = 'biz' | null
export const WAVE_C: Record<WaveCId, { path: string; section: Section; crumb: string; kicker: string; form: string }> = {
  'richnytsya-kompaniyi': { path: '/dlya-biznesu/yak-vidsvyatkuvaty-richnytsyu-kompaniyi', section: 'biz', crumb: 'Річниця компанії', kicker: 'Для бізнесу', form: 'corporate-workshop' },
  'podarunky-spivrobitnykam': { path: '/dlya-biznesu/podarunky-spivrobitnykam', section: 'biz', crumb: 'Подарунки співробітникам', kicker: 'Для бізнесу', form: 'corporate-gifts' },
  'novyi-rik-i-rizdvo': { path: '/novyi-rik-i-rizdvo', section: null, crumb: 'Новий рік і Різдво', kicker: 'Сезон 2026/27', form: 'corporate-gifts' },
}
export const WAVE_C_IDS = Object.keys(WAVE_C) as WaveCId[]

export type SourceRef = { label: string; url: string; date: string }
export type FormatRow = {
  key: string; ceramics: boolean; name: string; price: string; priceNote?: string; group: string; duration: string
  booking: string; fits: string; pros: string; cons: string; sources: SourceRef[]
}
export type Facts = typeof factsData
export const waveCFacts: Facts = factsData

const MAKERS = new Set(['studio', 'brand', 'maker', 'school', 'heritage'])
const makers = async () => (await getAllStudios()).filter((s) => MAKERS.has(s.type ?? '') && !isExhibitingOnly(s))

/** The comparison table with live values filled in ("live:corporate" → the price index range). */
export async function formatRows(): Promise<FormatRow[]> {
  const f = await facts()
  const live = (v: string) =>
    v === 'live:corporate' ? f.range('corporate', { fallback: '550–1 750 грн з особи (прайси студій)' })
      : v === 'live:cup' ? f.range('cup', { fallback: 'за прайсом студії' })
        : v === 'live:lead.logo' ? `${site.lead.logo} на партію з логотипом`
          : v
  return (formatsData as FormatRow[]).map((r) => ({ ...r, price: live(r.price), booking: live(r.booking) }))
}

export async function anniversaryData() {
  const rows = await formatRows()
  const studios = (await makers()).filter((s) => hasFormat(s, 'corporate-workshop'))
  const f = await facts()
  const vars: WaveVars = {
    count: rows.length,
    ceramicsCount: rows.filter((r) => r.ceramics).length,
    studios: studios.length,
    cities: groupByCity(studios).length,
    corporateRange: f.range('corporate', { fallback: '' }),
    corporateMedian: f.median('corporate'),
    pickup: site.lead.pickup,
    logoLead: site.lead.logo,
  }
  return { rows, studios, vars }
}

export async function staffGiftsData() {
  const all = (await makers()).filter((s) => ['brand', 'studio', 'maker'].includes(s.type ?? ''))
  const gifts = all.filter((s) => hasFormat(s, 'corporate-gifts'))
  const logo = all.filter((s) => hasFormat(s, 'logo') && !gifts.includes(s))
  const studios = [...gifts, ...logo]
  const f = await facts()
  const vars: WaveVars = {
    count: studios.length,
    gifts: gifts.length,
    logo: logo.length,
    cities: groupByCity(studios).length,
    cupRange: f.range('cup', { fallback: '' }),
    cupMedian: f.median('cup'),
    certRange: f.range('cert', { fallback: '' }),
    taxFree: factsData.taxFreeGift.value,
    logoLead: site.lead.logo,
  }
  return { gifts, logo, studios, vars }
}

export type Offer = { slug: string; what: string; price: string | null; deadline: string | null; date: string; source: string }
export type Market = { name: string; city: string; dates: string; note: string; source: string }
export type NewYear = typeof newYearJson

export async function winterData() {
  const ny = newYearJson as NewYear
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  const offers = (ny.offers as Offer[]).map((o) => ({ ...o, studio: known.get(o.slug) })).filter((o): o is Offer & { studio: StudioCard } => !!o.studio)
  const live = await newYearData()
  const offerIds = new Set(offers.map((o) => o.studio.id))
  const more = live.lines.filter((l) => !offerIds.has(l.s.id))
  const vars: WaveVars = {
    count: live.studios.length,
    offers: offers.length,
    preorders: offers.filter((o) => o.deadline).length,
    cities: live.vars.cities,
    markets: ny.marketsLastSeason.length,
    pickup: site.lead.pickup,
    logoLead: site.lead.logo,
  }
  return { ny, offers, more, vars }
}

export type WaveCData =
  | ({ id: 'richnytsya-kompaniyi' } & Awaited<ReturnType<typeof anniversaryData>>)
  | ({ id: 'podarunky-spivrobitnykam' } & Awaited<ReturnType<typeof staffGiftsData>>)
  | ({ id: 'novyi-rik-i-rizdvo' } & Awaited<ReturnType<typeof winterData>>)

export async function waveCData(id: WaveCId): Promise<WaveCData> {
  switch (id) {
    case 'richnytsya-kompaniyi': return { id, ...(await anniversaryData()) }
    case 'podarunky-spivrobitnykam': return { id, ...(await staffGiftsData()) }
    case 'novyi-rik-i-rizdvo': return { id, ...(await winterData()) }
  }
}

export const waveCStudios = (d: WaveCData): StudioCard[] =>
  d.id === 'novyi-rik-i-rizdvo' ? [...d.offers.map((o) => o.studio), ...d.more.map((l) => l.s)] : d.studios

/** Every live wave C page (copy exists), for the sitemap, llms.txt and section indexes. */
export async function liveWaveCPages(): Promise<{ id: WaveCId; path: string; section: Section; title: string; summary: string }[]> {
  const out: { id: WaveCId; path: string; section: Section; title: string; summary: string }[] = []
  for (const id of WAVE_C_IDS) {
    const c = waveCCopy(id)
    if (!c) continue
    const f = fillCopy(c, (await waveCData(id)).vars)
    out.push({ id, path: WAVE_C[id].path, section: WAVE_C[id].section, title: f.title, summary: f.metaDescription })
  }
  return out
}
