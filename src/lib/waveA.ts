// Wave A pages: format × city master classes, where to buy, gifts by budget, birthdays in a studio.
// Copy (title, lead, sections, FAQ…) is written per page from data packs (UkraineCeramics/_site_content/waveA)
// and synced into src/content/waveA by scripts/sync-wave-a.mjs. A page without copy does not exist:
// it returns 404 and stays out of the sitemap, navigation and llms.txt. Live numbers come from the data here.
import { copies } from '@/content/waveA'
import etsyShops from '@/content/waveA/etsy.json'
import stockistShops from '@/content/waveA/stockists.json'
import { topics, type Topic } from '@/content/topics'
import { fmt, getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk, type StudioCard } from './catalog'
import { amountsIn, inCity, isExhibitingOnly, publicPrices, roundNice, typicalRange } from './present'
import { topicData } from './topics'

export type WaveCopy = {
  id: string
  title: string
  metaDescription: string
  lead: string
  epigraph?: string[]
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[]
  picks?: { need: string; slugs: string[]; why: string }[]
  faq: { q: string; a: string }[]
  sources: string[]
}

export const waveCopy = (id: string): WaveCopy | null => (copies as Record<string, WaveCopy>)[id] ?? null
export const hasCopy = (id: string) => Boolean(waveCopy(id))

// ---------- placeholders ----------

export type WaveVars = Record<string, string | number | undefined>

/** {count}, {priceRange}… → values; a placeholder without a value becomes '' (copy must not depend on it). */
export const fill = (text: string, vars: WaveVars) =>
  text
    .replace(/\{(\w+)\}/g, (_m, k: string) => {
      const v = vars[k]
      return v === undefined || v === '' ? '' : typeof v === 'number' ? fmt(v) : v
    })
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')

export function fillCopy(c: WaveCopy, vars: WaveVars): WaveCopy {
  const f = (t: string) => fill(t, vars)
  return {
    ...c,
    title: f(c.title),
    metaDescription: f(c.metaDescription),
    lead: f(c.lead),
    sections: c.sections.map((s) => ({ heading: f(s.heading), paragraphs: s.paragraphs.map(f), bullets: s.bullets?.map(f) })),
    picks: c.picks?.map((p) => ({ ...p, need: f(p.need), why: f(p.why) })),
    faq: c.faq.map((x) => ({ q: f(x.q), a: f(x.a) })),
  }
}

const priceVars = (r: { min?: number; max?: number; median?: number } | null | undefined): WaveVars => ({
  min: r?.min,
  max: r?.max,
  median: r?.median ? `${fmt(r.median)} грн` : undefined,
  priceRange: r?.min && r?.max ? `від ${fmt(r.min)} до ${fmt(r.max)} грн` : undefined,
})

// ---------- 1. format × city ----------

export const FORMAT_PAGES = {
  'honcharne-kolo': { topic: 'wheel', label: 'Гончарне коло', short: 'гончарне коло' },
  lipennya: { topic: 'handbuilding', label: 'Ліплення з глини', short: 'ліплення' },
  'dlya-ditey': { topic: 'kids', label: 'Майстер-класи для дітей', short: 'для дітей' },
  'dlya-dvokh': { topic: 'couples', label: 'Гончарство для двох', short: 'для двох' },
  rozpys: { topic: 'painting', label: 'Розпис кераміки', short: 'розпис' },
  kursy: { topic: 'courses', label: 'Курси кераміки', short: 'курси' },
} as const
export type FormatSlug = keyof typeof FORMAT_PAGES
export const isFormatSlug = (x: string): x is FormatSlug => x in FORMAT_PAGES
export const formatCityId = (city: string, format: string) => `mk-${city}-${format}`

export async function formatCityData(city: string, format: FormatSlug) {
  const topic: Topic = topics[FORMAT_PAGES[format].topic]
  const data = await topicData(topic, city)
  const place = data.all[0]?.cityDoc?.name ?? ''
  const vars: WaveVars = {
    count: data.all.length,
    places: `${fmt(data.all.length)} ${pluralUk(data.all.length, ['місце', 'місця', 'місць'])}`,
    city: place,
    inCity: inCity(place),
    ...priceVars(data.ctx),
  }
  return { topic, data, vars, place }
}

/** Every format × city pair with at least MIN_LIST places (whether or not copy exists). */
export async function formatCityCandidates() {
  const studios = await getAllStudios()
  const cities = groupByCity(studios.filter(offersMasterClasses)).map((g) => g.city)
  const out: { city: string; cityName: string; format: FormatSlug; count: number }[] = []
  for (const c of cities) {
    for (const format of Object.keys(FORMAT_PAGES) as FormatSlug[]) {
      const d = await topicData(topics[FORMAT_PAGES[format].topic], c.slug!)
      if (d.all.length >= MIN_LIST) out.push({ city: c.slug!, cityName: c.name, format, count: d.all.length })
    }
  }
  return out
}

/** Pairs that are live: enough places and copy written. */
export async function liveFormatCityPages() {
  return (await formatCityCandidates()).filter((p) => hasCopy(formatCityId(p.city, p.format)))
}

// ---------- 2. where to buy ----------

export type EtsyShop = { shop: string; url: string; location: string; rating?: number; reviews?: number; sales?: number; years?: string; items?: number; slug?: string; name?: string }
export type StockistShop = { name: string; city: string; address?: string; website?: string; instagram?: string; brands: string; slug?: string }

const ONLINE = /сайт|інтернет-магазин|онлайн|shop|etsy|prom|rozetka|create4me/iu

export async function whereToBuyData() {
  const studios = await getAllStudios()
  const shops = studios.filter((s) => s.type === 'shop' || (s.type === 'other' && /галере|крамниц|концепт|магазин|store|shop/iu.test(s.name)))
  const makers = studios.filter((s) => (s.type === 'brand' || s.type === 'maker' || s.type === 'studio') && !isExhibitingOnly(s))
  const online = makers.filter((s) => Boolean(s.website) || (s.salesChannels ?? []).some((c) => ONLINE.test(c.text)))
  const etsy = (etsyShops as EtsyShop[]).slice().sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  const stockists = stockistShops as StockistShop[]
  const shopCities = groupByCity(shops)
  const vars: WaveVars = {
    shops: shops.length,
    shopCities: shopCities.length,
    online: online.length,
    etsy: etsy.length,
    etsySales: etsy.reduce((n, e) => n + (e.sales ?? 0), 0),
  }
  return { shops, shopCities, online, etsy, stockists, vars }
}

// ---------- 3. gifts by budget ----------

const CLASS_OR_SERVICE = /донат|благодійн|лот(?!\p{L})|аукціон|(?<!\p{L})мк(?!\p{L})|майстер-клас|занят|ліпк|ліплен|гончарств|курс|абонемент|оренд|коворк|сертифікат|випал|доставк|глазуруван|розпис\s+(?:свого|чужого|чаш\p{L}*)|табір|(?<!\p{L})годин|\/\s*день|груп[аиуо]|груповий|особ[аиу]|дитин|(?<!\p{L})діт|років|індивідуальн|гончарн\p{L}* (?:круг|коло)|usd|eur|\$|€/iu
export const GIFT_TIERS = [
  { key: 'to500', label: 'До 500 грн', min: 0, max: 500 },
  { key: 'to1000', label: '500–1 000 грн', min: 501, max: 1000 },
  { key: 'to2000', label: '1 000–2 000 грн', min: 1001, max: 2000 },
  { key: 'over2000', label: 'Понад 2 000 грн', min: 2001, max: 20000 },
] as const
export const GIFT_OCCASIONS = [
  { key: 'wedding', label: 'На весілля', re: /сервіз|набір|пар[аиу]\s+(?:чаш|горнят|кухл)|для двох|весіл|тарел|блюд(?!ц)|глечик/iu },
  { key: 'teacher', label: 'Вчителю чи вихователю', re: /чашк|горнят|кухл|вазон|кашпо|підставк|магніт|дзвіночок/iu },
  { key: 'colleagues', label: 'Колегам і партнерам', re: /чашк|горнят|кухл|свічник|аромат|підставк|магніт|брелок|набір|тарілочк/iu },
  { key: 'housewarming', label: 'На новосілля', re: /(?<!\p{L})ваз(?!елін)|тарілк|миск|глечик|кашпо|вазон|світильник|свічник|салатник|блюд(?!ц)/iu },
] as const

export type GiftItem = { studio: StudioCard; text: string; source?: string; amount: number }

export async function giftsData() {
  const studios = (await getAllStudios()).filter((s) => ['brand', 'maker', 'studio', 'heritage'].includes(s.type ?? '') && !isExhibitingOnly(s))
  const items: GiftItem[] = []
  for (const s of studios) {
    for (const p of publicPrices(s)) {
      if (CLASS_OR_SERVICE.test(p.text)) continue
      const a = amountsIn(p.text)
      if (!a.length) continue
      items.push({ studio: s, text: p.text, source: p.source, amount: a[0] })
    }
  }
  // One line per studio per tier (the cheapest there), so a big price list doesn't fill a tier alone.
  const tiers = GIFT_TIERS.map((t) => {
    const best = new Map<number, GiftItem>()
    for (const it of items.filter((i) => i.amount >= t.min && i.amount <= t.max)) {
      const cur = best.get(it.studio.id)
      if (!cur || it.amount < cur.amount) best.set(it.studio.id, it)
    }
    return { ...t, items: [...best.values()].sort((a, b) => a.amount - b.amount) }
  })
  const occasions = GIFT_OCCASIONS.map((o) => {
    const best = new Map<number, GiftItem>()
    for (const it of items.filter((i) => o.re.test(i.text))) if (!best.has(it.studio.id)) best.set(it.studio.id, it)
    return { key: o.key, label: o.label, items: [...best.values()].sort((a, b) => a.amount - b.amount) }
  })
  const all = items.map((i) => i.amount)
  const r = typicalRange(all)
  const sorted = [...all].sort((a, b) => a - b)
  const vars: WaveVars = {
    count: new Set(items.map((i) => i.studio.id)).size,
    items: items.length,
    ...priceVars(r ? { ...r, median: sorted.length ? roundNice(sorted[Math.floor(sorted.length / 2)]) : undefined } : null),
    ...Object.fromEntries(tiers.map((t) => [`${t.key}Count`, t.items.length])),
  }
  return { tiers, occasions, items, vars }
}

// ---------- 4. birthdays and parties in a studio ----------

export const PARTY = /день народж|дні народж|днів народж|(?<!\p{L})др(?!\p{L})|дитяч\p{L}* свят|свят\p{L}* (?:для|в|у) (?:студі|майстерн)|дівич|вечірк|оренд\p{L}* (?:студі|майстерн|простор)|гендер-паті|(?<!\p{L})паті(?!\p{L})/iu
const GROUP = /(?:до|від)\s*(\d{1,2})\s*(?:ос|діт|учасн|гост|люд|чол)|(\d{1,2})\s*[–-]\s*(\d{1,2})\s*(?:ос|діт|учасн|гост|люд)/iu

export function partyLines(s: StudioCard) {
  const prices = publicPrices(s).filter((p) => PARTY.test(p.text))
  const services = (s.services ?? []).map((x) => x.text).filter((t) => PARTY.test(t))
  const group = [...prices.map((p) => p.text), ...services].map((t) => t.match(GROUP)).filter(Boolean).map((m) => m![0])[0]
  return { prices, services, group }
}

export async function partyData() {
  const studios = (await getAllStudios()).filter(
    (s) => offersMasterClasses(s) && PARTY.test([...(s.services ?? []), ...(s.prices ?? [])].map((x) => x.text).join(' \n ') + ' ' + (s.publicDescription ?? '')),
  )
  const groups = groupByCity(studios)
  const amounts = studios.flatMap((s) => partyLines(s).prices.flatMap((p) => amountsIn(p.text)))
  const r = typicalRange(amounts)
  const vars: WaveVars = { count: studios.length, cities: groups.length, ...priceVars(r) }
  return { studios, groups, vars }
}

// ---------- registry ----------

export const FIXED_PAGES = {
  'de-kupyty-keramiku': { path: '/de-kupyty-keramiku' },
  'podarunky-z-keramiky': { path: '/podarunky-z-keramiky' },
  'mk-den-narodzhennya': { path: '/maister-klasy/den-narodzhennya' },
} as const

/** Every live wave A page (copy exists): path, title and filled meta description, for the sitemap and llms.txt. */
export async function liveWavePages(): Promise<{ path: string; title: string; summary: string }[]> {
  const out: { path: string; title: string; summary: string }[] = []
  const add = (path: string, c: WaveCopy, vars: WaveVars) => {
    const f = fillCopy(c, vars)
    out.push({ path, title: f.title, summary: f.metaDescription })
  }
  const fixed: [keyof typeof FIXED_PAGES, () => Promise<{ vars: WaveVars }>][] = [
    ['de-kupyty-keramiku', whereToBuyData],
    ['podarunky-z-keramiky', giftsData],
    ['mk-den-narodzhennya', partyData],
  ]
  for (const [id, data] of fixed) {
    const c = waveCopy(id)
    if (c) add(FIXED_PAGES[id].path, c, (await data()).vars)
  }
  for (const p of await liveFormatCityPages()) {
    const c = waveCopy(formatCityId(p.city, p.format))!
    add(`/maister-klasy/${p.city}/${p.format}`, c, (await formatCityData(p.city, p.format)).vars)
  }
  return out
}
