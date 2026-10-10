import type { Metadata } from 'next'

import { topics, type Topic, type TopicCtx } from '@/content/topics'
import { ogImage } from '@/utilities/ogImage'
import { fmt, getAllStudios, groupByCity, hasFormat, MIN_LIST, offersMasterClasses, pluralUk, type StudioCard } from './catalog'
import { amountsIn, publicPrices, splitSource, typicalRange } from './present'

export type TopicListData = { title: string; note?: string; byCity?: boolean; studios: StudioCard[] }
export type PriceExample = { studio: StudioCard; text: string; source?: string }
export type TopicData = { lists: TopicListData[]; all: StudioCard[]; ctx: TopicCtx; examples: PriceExample[] }

// Rank: studios with prices first, then with Instagram, then by name (stable and explainable).
const rank = (s: StudioCard) => (s.prices?.length ? 2 : 0) + (s.instagram ? 1 : 0)

// Who may appear on a topic page: the list's tags and types, the list's own filter, and for master-class
// and certificate pages a real place to take a class (offersMasterClasses), not an artist who paints.
const eligible = (topic: Topic, l: Topic['lists'][number], s: StudioCard) =>
  (!l.types || l.types.includes(s.type ?? '')) &&
  (l.match ? l.match(s) : l.formats.some((f) => hasFormat(s, f))) &&
  (!l.filter || l.filter(s)) &&
  (topic.section === 'mk' || topic.section === 'cert' ? offersMasterClasses(s) : true)

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
  const amounts: number[] = []
  for (const s of all) {
    const lines = publicPrices(s).filter((p) => topic.price.re.test(p.text) && !topic.price.exclude?.test(p.text) && amountsIn(p.text).length)
    // The range uses only lines in the page's unit (e.g. per person for corporate events).
    lines.filter((p) => !topic.price.unit || (topic.price.unit.test(p.text) && !topic.price.unitNot?.test(p.text))).forEach((p) => amounts.push(...amountsIn(p.text)))
    // Prefer an example in the page's unit; recent lines first.
    const best = [...lines].sort((a, b) => Number(!!topic.price.unit?.test(b.text)) - Number(!!topic.price.unit?.test(a.text)) || (b.year ?? 0) - (a.year ?? 0))[0]
    if (best) examples.push({ studio: s, text: best.text, source: best.source })
  }
  const r = typicalRange(amounts)
  return {
    lists,
    all,
    examples: examples.slice(0, 8),
    ctx: { n: all.length, cities: groupByCity(all).length, min: r?.min, max: r?.max, place: citySlug ? all[0]?.cityDoc?.name : undefined },
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

export function topicMetadata(topic: Topic, data: TopicData, over: { title?: string; path?: string; h1?: string; coa?: string } = {}): Metadata {
  const { ctx } = data
  return {
    title: over.title ?? topic.metaTitle(ctx),
    description: topic.metaDescription(ctx),
    alternates: { canonical: over.path ?? topic.path },
    openGraph: {
      images: ogImage({
        title: over.h1 ?? topic.h1,
        kicker: topic.kicker,
        sub: ctx.min && ctx.max ? `${ctx.n} ${topic.section === 'mk' || topic.section === 'cert' ? pluralUk(ctx.n, ['місце', 'місця', 'місць']) : pluralUk(ctx.n, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])} · від ${fmt(ctx.min)} грн` : undefined,
        ...(over.coa ? { coa: over.coa, pattern: over.coa } : topic.photo ? { img: topic.ogImg, credit: `Фото: ${topic.photo.author}, ${topic.photo.license}` } : { pattern: topic.ogImg }),
      }),
    },
  }
}

// Cities with at least MIN_LIST studios that sell certificates: each gets /sertyfikaty/<city> (no thin pages).
export async function certificateCities() {
  const topic = topics.certificates
  const studios = (await getAllStudios()).filter((s) => topic.lists.some((l) => eligible(topic, l, s)))
  return groupByCity(studios).filter((g) => g.studios.length >= MIN_LIST).map((g) => g.city)
}
