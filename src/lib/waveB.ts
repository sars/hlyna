// Wave B pages: selections (tableware brands, Etsy, New Year ornaments, who works with business), events,
// museums and three guides (kinds of ceramics, care, black-smoked and milk-fired). Same mechanism as wave A:
// copy is written per page from data packs (UkraineCeramics/_site_content/waveB), reviewed, and synced into
// src/content/waveB by scripts/sync-wave-b.mjs. A page without copy returns 404 and stays out of the sitemap,
// navigation and llms.txt. Live lists and numbers come from the data here; copy uses {placeholders}.
import { copies } from '@/content/waveB'
import eventsData from '@/content/waveB/events.json'
import museumsData from '@/content/waveB/museums.json'
import etsyShops from '@/content/waveA/etsy.json'
import { getAllStudios, groupByCity, hasFormat, texts, worksWithVenues, type StudioCard } from './catalog'
import { isExhibitingOnly } from './present'
import { productText, PRODUCT_RE } from './products'
import { evidenceLine } from './topics'
import { fillCopy, type EtsyShop, type WaveCopy, type WaveVars } from './waveA'

export const waveBCopy = (id: string): WaveCopy | null => (copies as Record<string, WaveCopy>)[id] ?? null

export type WaveBId =
  | 'brendy-posudu'
  | 'etsy'
  | 'podiyi'
  | 'muzei-keramiky'
  | 'yalynkovi-prykrasy'
  | 'vydy-keramiky'
  | 'dohliad-za-keramikoyu'
  | 'chornodymlena-i-molochena'
  | 'pratsyuyut-z-biznesom'

type Section = 'dobirky' | 'hayidy' | null
export const WAVE_B: Record<WaveBId, { path: string; section: Section; crumb: string; kicker: string; form: string; pattern: string }> = {
  'brendy-posudu': { path: '/dobirky/brendy-posudu', section: 'dobirky', crumb: 'Бренди посуду', kicker: 'Добірки', form: 'tableware', pattern: 'brands' },
  etsy: { path: '/dobirky/etsy', section: 'dobirky', crumb: 'Кераміка на Etsy', kicker: 'Добірки', form: 'other', pattern: 'etsy' },
  podiyi: { path: '/podiyi', section: null, crumb: 'Ярмарки й події', kicker: 'Події', form: 'other', pattern: 'events' },
  'muzei-keramiky': { path: '/muzei-keramiky', section: null, crumb: 'Музеї й галереї', kicker: 'Де подивитися', form: 'other', pattern: 'museums' },
  'yalynkovi-prykrasy': { path: '/dobirky/yalynkovi-prykrasy', section: 'dobirky', crumb: 'Ялинкові прикраси', kicker: 'Добірки', form: 'corporate-gifts', pattern: 'newyear' },
  'vydy-keramiky': { path: '/hayidy/vydy-keramiky', section: 'hayidy', crumb: 'Види кераміки', kicker: 'Гайди', form: 'tableware', pattern: 'materials' },
  'dohliad-za-keramikoyu': { path: '/hayidy/dohliad-za-keramikoyu', section: 'hayidy', crumb: 'Догляд за керамікою', kicker: 'Гайди', form: 'tableware', pattern: 'care' },
  'chornodymlena-i-molochena': { path: '/hayidy/chornodymlena-i-molochena', section: 'hayidy', crumb: 'Чорнодимлена й молочена', kicker: 'Гайди', form: 'other', pattern: 'smoke' },
  'pratsyuyut-z-biznesom': { path: '/dobirky/pratsyuyut-z-biznesom', section: 'dobirky', crumb: 'Хто працює з бізнесом', kicker: 'Добірки', form: 'tableware', pattern: 'business' },
}
export const WAVE_B_IDS = Object.keys(WAVE_B) as WaveBId[]

const MAKERS = new Set(['studio', 'brand', 'maker', 'school', 'heritage'])
const makers = async () => (await getAllStudios()).filter((s) => MAKERS.has(s.type ?? '') && !isExhibitingOnly(s))

// ---------- selections ----------

/** Contemporary tableware: brands and studios whose own products are plates, bowls or cups. */
export async function tablewareBrandsData() {
  const studios = (await makers()).filter((s) => ['brand', 'studio', 'maker'].includes(s.type ?? '') && (PRODUCT_RE.plates.test(productText(s)) || PRODUCT_RE.cups.test(productText(s))))
  const brands = studios.filter((s) => s.type === 'brand')
  const others = studios.filter((s) => s.type !== 'brand')
  const groups = groupByCity(studios)
  const vars: WaveVars = { count: studios.length, brands: brands.length, cities: groups.length, horeca: studios.filter(worksWithVenues).length }
  return { studios: [...brands, ...others], brands, others, groups, vars }
}

export const NEW_YEAR = /ялинк|новоріч|різдв|ангел(?:ик|оч)|дзвіночк|миколай|сніжинк/iu
export async function newYearData() {
  const studios = (await makers()).filter((s) => hasFormat(s, 'new-year') || NEW_YEAR.test(productText(s)))
  const lines = studios.map((s) => ({ s, line: evidenceLine(s, NEW_YEAR) }))
  const groups = groupByCity(studios)
  const vars: WaveVars = { count: studios.length, cities: groups.length }
  return { studios, lines, groups, vars }
}

export async function businessData() {
  const all = (await makers()).filter((s) => ['brand', 'studio', 'maker'].includes(s.type ?? ''))
  const horeca = all.filter(worksWithVenues)
  const logo = all.filter((s) => hasFormat(s, 'logo'))
  const gifts = all.filter((s) => hasFormat(s, 'corporate-gifts'))
  const studios = [...new Map([...horeca, ...logo, ...gifts].map((s) => [s.id, s])).values()]
  const withTerms = studios.filter((s) => s.b2b?.minOrder || s.b2b?.leadTime || s.b2b?.logoMethods?.length)
  const vars: WaveVars = { count: studios.length, horeca: horeca.length, logo: logo.length, gifts: gifts.length, cities: groupByCity(studios).length, withTerms: withTerms.length }
  return { studios, horeca, logo, gifts, withTerms, vars }
}

export async function etsyData() {
  const shops = (etsyShops as EtsyShop[]).slice().sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  const sales = shops.reduce((n, e) => n + (e.sales ?? 0), 0)
  const reviews = shops.reduce((n, e) => n + (e.reviews ?? 0), 0)
  const ratings = shops.map((e) => e.rating).filter((x): x is number => typeof x === 'number').sort((a, b) => a - b)
  const vars: WaveVars = {
    count: shops.length,
    etsySales: sales,
    etsyReviews: reviews,
    medianRating: ratings.length ? String(ratings[Math.floor(ratings.length / 2)]).replace('.', ',') : undefined,
    topShop: shops[0]?.name ?? shops[0]?.shop,
    topSales: shops[0]?.sales,
  }
  return { shops, vars }
}

// ---------- events and museums ----------

export type EventItem = {
  name: string; kind: string; recurrence: string; dates: string; nextDate: string; city: string; venue: string
  status: string; entry: string; participation: string; link: string; months: string
}
const today = () => new Date().toISOString().slice(0, 10)
export const EVENT_KIND: Record<string, string> = {
  fair: 'Ярмарок', market: 'Маркет', festival: 'Фестиваль', exhibition: 'Виставка', symposium: 'Симпозіум', plein_air: 'Пленер',
  residency: 'Резиденція', competition: 'Конкурс', design_week: 'Тиждень дизайну', conference: 'Конференція', open_studio: 'Відкрита студія',
  workshop_series: 'Цикл майстер-класів', other: 'Подія',
}

export async function eventsPageData() {
  const items = eventsData as EventItem[]
  const t = today()
  const upcoming = items.filter((e) => e.nextDate && e.nextDate >= t && e.status !== 'ended').sort((a, b) => a.nextDate.localeCompare(b.nextDate))
  const recurring = items.filter((e) => !upcoming.includes(e) && ['annual', 'seasonal', 'monthly'].includes(e.recurrence) && !['ended', 'paused'].includes(e.status))
  const paused = items.filter((e) => ['ended', 'paused'].includes(e.status))
  const cities = new Set(items.map((e) => e.city).filter(Boolean))
  const vars: WaveVars = { count: items.length, upcoming: upcoming.length, recurring: recurring.length, cities: cities.size }
  return { items, upcoming, recurring, paused, vars }
}

export type MuseumItem = { name: string; city: string; oblast: string; address: string; website: string; what: string; slug?: string }
export async function museumsPageData() {
  const known = new Set((await getAllStudios()).map((s) => s.slug))
  const items = (museumsData as MuseumItem[]).map((m) => ({ ...m, slug: m.slug && known.has(m.slug) ? m.slug : undefined }))
  const byCity = new Map<string, MuseumItem[]>()
  for (const m of items) byCity.set(m.city || 'Інші', [...(byCity.get(m.city || 'Інші') ?? []), m])
  const groups = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([city, list]) => ({ city, list }))
  const vars: WaveVars = { count: items.length, cities: groups.filter((g) => g.city !== 'Інші').length }
  return { items, groups, vars }
}

// ---------- guides with live maker lists ----------

export const MATERIALS = [
  { key: 'porcelain', label: 'Порцеляна', re: /порцелян|фарфор/iu },
  { key: 'stoneware', label: 'Кам’яна маса', re: /кам[’'ʼ]ян\p{L}* мас|кераміт|stoneware|високотемпературн/iu },
  { key: 'majolica', label: 'Майоліка', re: /майолік/iu },
  { key: 'terracotta', label: 'Теракота й червона глина', re: /теракот|червон\p{L}* глин/iu },
  { key: 'faience', label: 'Фаянс', re: /фаянс/iu },
  { key: 'raku', label: 'Раку', re: /(?<!\p{L})раку(?!\p{L})/iu },
] as const

export async function materialsData() {
  const all = await makers()
  const groups = MATERIALS.map((m) => ({ ...m, studios: all.filter((s) => m.re.test(texts(s))) }))
  const vars: WaveVars = Object.fromEntries(groups.map((g) => [`${g.key}Count`, g.studios.length]))
  return { groups, vars: { ...vars, count: new Set(groups.flatMap((g) => g.studios.map((s) => s.id))).size } }
}

export const CARE = /посудомий|мікрохвил|духов|ручне миття|мити (?:лише )?руками|догляд|не (?:ставити|використовувати)|харчов\p{L}* полив|термошок/iu
export async function careData() {
  const studios = (await makers()).filter((s) => CARE.test(texts(s)))
  const dishwasher = studios.filter((s) => /посудомий/iu.test(texts(s)))
  const vars: WaveVars = { count: studios.length, dishwasher: dishwasher.length }
  return { studios, vars }
}

export const BLACK_SMOKED = /чорнодим|чорн\p{L}* димлен|димлен|задимлен|відновлювальн\p{L}* випал/iu
export const MILK_FIRED = /молочен|молочн\p{L}* випал|обварюван|обвар(?!\p{L})/iu
export async function smokeData() {
  const all = await makers()
  const black = all.filter((s) => BLACK_SMOKED.test(texts(s)))
  const milk = all.filter((s) => MILK_FIRED.test(texts(s)))
  const vars: WaveVars = { count: new Set([...black, ...milk].map((s) => s.id)).size, black: black.length, milk: milk.length, cities: groupByCity([...black, ...milk]).length }
  return { black, milk, vars }
}

// ---------- registry ----------

export type WaveBData =
  | ({ id: 'brendy-posudu' } & Awaited<ReturnType<typeof tablewareBrandsData>>)
  | ({ id: 'etsy' } & Awaited<ReturnType<typeof etsyData>>)
  | ({ id: 'podiyi' } & Awaited<ReturnType<typeof eventsPageData>>)
  | ({ id: 'muzei-keramiky' } & Awaited<ReturnType<typeof museumsPageData>>)
  | ({ id: 'yalynkovi-prykrasy' } & Awaited<ReturnType<typeof newYearData>>)
  | ({ id: 'vydy-keramiky' } & Awaited<ReturnType<typeof materialsData>>)
  | ({ id: 'dohliad-za-keramikoyu' } & Awaited<ReturnType<typeof careData>>)
  | ({ id: 'chornodymlena-i-molochena' } & Awaited<ReturnType<typeof smokeData>>)
  | ({ id: 'pratsyuyut-z-biznesom' } & Awaited<ReturnType<typeof businessData>>)

export async function waveBData(id: WaveBId): Promise<WaveBData> {
  switch (id) {
    case 'brendy-posudu': return { id, ...(await tablewareBrandsData()) }
    case 'etsy': return { id, ...(await etsyData()) }
    case 'podiyi': return { id, ...(await eventsPageData()) }
    case 'muzei-keramiky': return { id, ...(await museumsPageData()) }
    case 'yalynkovi-prykrasy': return { id, ...(await newYearData()) }
    case 'vydy-keramiky': return { id, ...(await materialsData()) }
    case 'dohliad-za-keramikoyu': return { id, ...(await careData()) }
    case 'chornodymlena-i-molochena': return { id, ...(await smokeData()) }
    case 'pratsyuyut-z-biznesom': return { id, ...(await businessData()) }
  }
}

/** Studios a page lists (for the ItemList JSON-LD). */
export const waveBStudios = (d: WaveBData): StudioCard[] =>
  d.id === 'brendy-posudu' || d.id === 'yalynkovi-prykrasy' || d.id === 'pratsyuyut-z-biznesom' || d.id === 'dohliad-za-keramikoyu'
    ? d.studios
    : d.id === 'chornodymlena-i-molochena'
      ? [...new Map([...d.black, ...d.milk].map((s) => [s.id, s])).values()]
      : d.id === 'vydy-keramiky'
        ? [...new Map(d.groups.flatMap((g) => g.studios).map((s) => [s.id, s])).values()]
        : []

/** Every live wave B page (copy exists), for the sitemap, llms.txt and the section index pages. */
export async function liveWaveBPages(): Promise<{ id: WaveBId; path: string; section: Section; title: string; summary: string }[]> {
  const out: { id: WaveBId; path: string; section: Section; title: string; summary: string }[] = []
  for (const id of WAVE_B_IDS) {
    const c = waveBCopy(id)
    if (!c) continue
    const f = fillCopy(c, (await waveBData(id)).vars)
    out.push({ id, path: WAVE_B[id].path, section: WAVE_B[id].section, title: f.title, summary: f.metaDescription })
  }
  return out
}

