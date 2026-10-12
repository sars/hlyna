import type { Metadata } from 'next'

import { topics, type Topic, type TopicCtx } from '@/content/topics'
import { ogImage, ogPhoto } from '@/utilities/ogImage'
import { getAllStudios, groupByCity, hasFormat, MIN_LIST, offersMasterClasses, type StudioCard } from '@/lib/catalog'
import { facts } from '@/lib/facts'

import { isExhibitingOnly, publicPrices, splitSource } from '@/lib/present'
import { amountsIn, fromTo, near, spanOf } from '@/lib/money'

// A museum or museum shop is listed on class pages only if its own services name a class it runs.
const museumOnly = (s: StudioCard) =>
  /музей|museum/iu.test(s.name) && !(s.services ?? []).some((x) => /майстер-клас|(?<!\p{L})мк(?!\p{L})|заняття|гурт/iu.test(x.text))

const GROUP_TOTAL = /до\s+\d+\s*(?:ос|учасн|люд|чол)|\d+\s*(?:учасник\p{L}*|осіб)\s*[—–-]|за\s+груп|для\s+(?:своєї\s+)?груп|для\s+(?:своєї\s+)?компані|компані\p{L}*\s+до|наступн/iu
const COUPLE_TOTAL = /для двох|удвох|вдвох|на двох|для пари|\(2\)/iu
const KIDS_LINE = /(?<!\p{L})(?:дит|діт)|школяр|\d+\s*[–-]\s*\d+\s*(?:рок|років)|від\s+\d+\s+рок/iu
const DONATION = /донат|благодійн|зсу|на військо/iu

export type TopicListData = { title: string; note?: string; byCity?: boolean; studios: StudioCard[] }
export type PriceExample = { studio: StudioCard; text: string; source?: string }
export type TopicData = { lists: TopicListData[]; all: StudioCard[]; ctx: TopicCtx; examples: PriceExample[]; amounts: number[] }

const medianOf = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : undefined)

// Rank: studios with prices first, then with Instagram, then by name (stable and explainable).
const rank = (s: StudioCard) => (s.prices?.length ? 2 : 0) + (s.instagram ? 1 : 0)

// Who may appear on a topic page: the list's tags and types, the list's own filter, and for master-class
// and certificate pages a real place to take a class (offersMasterClasses), not an artist who paints.
const eligible = (topic: Topic, l: Topic['lists'][number], s: StudioCard) =>
  (!l.types || l.types.includes(s.type ?? '')) &&
  (l.match ? l.match(s) : l.formats.some((f) => hasFormat(s, f))) &&
  (!l.filter || l.filter(s)) &&
  (topic.section === 'mk' || topic.section === 'cert' ? offersMasterClasses(s) && !museumOnly(s) && !isExhibitingOnly(s) : true)

export async function topicData(topic: Topic, citySlug?: string): Promise<TopicData> {
  const studios = (await getAllStudios()).filter((s) => !citySlug || s.cityDoc?.slug === citySlug)
  const seen = new Set<number>()
  const lists = topic.lists.map((l) => {
    const picked = studios
      .filter((s) => !seen.has(s.id) && eligible(topic, l, s))
      .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'uk'))
    picked.forEach((s) => seen.add(s.id))
    return { title: l.title, note: l.note, byCity: l.byCity && !citySlug, studios: picked }
  })
  const all = lists.flatMap((l) => l.studios)
  const examples: PriceExample[] = []
  const couplePage = /двох/.test(topic.price.re.source)
  const kidsPage = /дит/.test(topic.price.re.source)
  const amounts: number[] = []
  const perStudio: number[] = []
  for (const s of all) {
    const lines = publicPrices(s).filter((p) => topic.price.re.test(p.text) && !topic.price.exclude?.test(p.text) && amountsIn(p.text).length)
    // The range uses only lines in the page's unit (e.g. per person for corporate events).
    let usable = lines
      .filter((p) => !topic.price.unit || (topic.price.unit.test(p.text) && !topic.price.unitNot?.test(p.text)))
      // Totals for a group or a couple are not a per-person price: they stay as examples, out of the range.
      .filter((p) => !GROUP_TOTAL.test(p.text) && (couplePage || !COUPLE_TOTAL.test(p.text)))
      // Children's prices are not an adult class price (and the other way round on the kids page).
      .filter((p) => kidsPage || !KIDS_LINE.test(p.text))
      // A private lesson is not the usual price of a class (it has its own line on /tsiny-2026).
      .filter((p) => couplePage || topic.price.index === 'private' || !/індивідуал/iu.test(p.text))
      .filter((p) => !DONATION.test(p.text))
    // A newer line replaces older ones: prices from before 2025 count only when the studio has nothing newer.
    if (usable.some((p) => (p.year ?? 0) >= 2025)) usable = usable.filter((p) => !p.year || p.year >= 2025)
    // The price next to the page's own words, lower end of a range («1 750–3 400 грн» → 1 750).
    const pick = near(topic.price.re)
    const own = usable.map((p) => pick(p.text)).filter((v): v is number => v !== null && v >= 150 && v <= 20000)
    amounts.push(...own)
    if (own.length) perStudio.push([...own].sort((a, b) => a - b)[Math.floor(own.length / 2)])
    // Prefer an example in the page's unit; recent lines first.
    const best = [...lines].sort((a, b) => Number(!!topic.price.unit?.test(b.text)) - Number(!!topic.price.unit?.test(a.text)) || (b.year ?? 0) - (a.year ?? 0))[0]
    if (best) examples.push({ studio: s, text: best.text, source: best.source })
  }
  const f = await facts()
  // Whole-Ukraine pages quote the price index for their category, so the number matches /tsiny-2026 and
  // every other page; city pages keep the range of their own studios.
  const idx = topic.price.index && !citySlug ? f.get(topic.price.index) : null
  // One value per studio (its own median), worded by spanOf — the same rule as /tsiny-2026 and city pages.
  const span = spanOf(perStudio)
  const r = idx ? { min: idx.min, max: idx.max, text: fromTo(idx.min, idx.max), median: idx.median } : span
  return {
    lists,
    all,
    examples: examples.slice(0, 8),
    amounts,
    ctx: { n: all.length, cities: groupByCity(all).length, min: r?.min, max: r?.max, median: r?.median ?? medianOf(perStudio), priceText: r?.text, place: citySlug ? all[0]?.cityDoc?.name : undefined, price: (k: string) => f.range(k) },
  }
}

// Phrases that say nothing on their own («посуд на замовлення», «подарункові сертифікати»): used only when
// nothing more specific exists.
const isGeneric = (t: string) => t.length < 28 && !/\d/.test(t)

// One line that shows why a studio is on the page. Best: a matching price line (format, duration, price);
// then a specific matching service; then the summary. Source notes like «(сайт, 2026)» are dropped.
export function evidenceLine(s: StudioCard, re: RegExp): string {
  const prices = publicPrices(s).map((p) => p.text).filter((t) => re.test(t))
  const services = [...(s.services ?? []), ...(s.products ?? [])].map((x) => splitSource(x.text).text).filter((t) => re.test(t))
  const score = (t: string) => (/грн/.test(t) ? 4 : 0) + (/\d/.test(t) ? 2 : 0) + (t.length > 40 ? 1 : 0) - (isGeneric(t) ? 5 : 0)
  const best = [...prices, ...services].sort((a, b) => score(b) - score(a))[0]
  const clip = (t: string) => (t.length > 150 ? `${t.slice(0, 147)}…` : t)
  if (best && !isGeneric(best)) return clip(best)
  const sentence = (s.publicDescription ?? '').split(/(?<=[.!?])\s+/).find((t) => re.test(t) && t.length < 220)
  return clip(sentence ?? s.summary ?? best ?? '')
}

export function topicMetadata(topic: Topic, data: TopicData, over: { title?: string; path?: string; h1?: string } = {}): Metadata {
  const { ctx } = data
  return {
    title: over.title ?? topic.metaTitle(ctx),
    description: topic.metaDescription(ctx),
    alternates: { canonical: over.path ?? topic.path },
    openGraph: {
      images: ogImage({ title: over.h1 ?? topic.ogTitle ?? topic.h1, kicker: topic.kicker, sub: topic.ogSub, ...(topic.ogImg ? { img: topic.ogImg } : ogPhoto(topic.photo)) }),
    },
  }
}

// Cities with at least MIN_LIST studios that sell certificates: each gets /sertyfikaty/<city> (no thin pages).
export async function certificateCities() {
  const topic = topics.certificates
  const studios = (await getAllStudios()).filter((s) => topic.lists.some((l) => eligible(topic, l, s)))
  return groupByCity(studios).filter((g) => g.studios.length >= MIN_LIST).map((g) => g.city)
}

/** City chips for a whole-Ukraine topic page: its format × city pages, city certificate pages, or the makers
 *  pages of cities with at least MIN_LIST entries on the page. Empty on a city-scoped page. */
export async function topicCityLinks(topic: Topic, data: TopicData): Promise<{ label: string; href: string; count?: number }[]> {
  if (data.ctx.place) return []
  const format = topic.path.match(/^\/maister-klasy\/([a-z-]+)$/)?.[1]
  if (format) {
    const { liveFormatCityPages } = await import('@/editorial/wave-a')
    return (await liveFormatCityPages()).filter((p) => p.format === format).sort((a, b) => b.count - a.count).map((p) => ({ label: p.cityName, href: `/maister-klasy/${p.city}/${p.format}`, count: p.count }))
  }
  if (topic.path === '/sertyfikaty') return (await certificateCities()).map((c) => ({ label: c.name, href: `/sertyfikaty/${c.slug}` }))
  const { makerCities } = await import('@/lib/makers')
  const withPage = new Set((await makerCities()).map((g) => g.city.slug))
  return groupByCity(data.all)
    .filter((g) => g.studios.length >= MIN_LIST && withPage.has(g.city.slug))
    .map((g) => ({ label: g.city.name, href: `/vyrobnyky/misto/${g.city.slug}`, count: g.studios.length }))
}
