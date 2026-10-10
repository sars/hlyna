import type { Metadata } from 'next'

import { topics, type Topic, type TopicCtx } from '@/content/topics'
import { ogImage } from '@/utilities/ogImage'
import { fmt, getAllStudios, groupByCity, hasFormat, MIN_LIST, pluralUk, range, type StudioCard } from './catalog'

export type TopicListData = { title: string; note?: string; byCity?: boolean; studios: StudioCard[] }
export type PriceExample = { studio: StudioCard; text: string }
export type TopicData = { lists: TopicListData[]; all: StudioCard[]; ctx: TopicCtx; examples: PriceExample[] }

const amountsIn = (text: string) =>
  [...text.matchAll(/(\d[\d\s]{1,6})\s*(?:грн|₴)/g)].map((m) => Number(m[1].replace(/\s/g, ''))).filter((v) => v >= 200 && v <= 20000)

// Rank: studios with prices first, then with Instagram, then by name (stable and explainable).
const rank = (s: StudioCard) => (s.prices?.length ? 2 : 0) + (s.instagram ? 1 : 0)

export async function topicData(topic: Topic, citySlug?: string): Promise<TopicData> {
  const studios = (await getAllStudios()).filter((s) => !citySlug || s.cityDoc?.slug === citySlug)
  const seen = new Set<number>()
  const lists = topic.lists.map((l) => {
    const picked = studios
      .filter((s) => !seen.has(s.id) && (!l.types || l.types.includes(s.type ?? '')) && l.formats.some((f) => hasFormat(s, f)))
      .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'uk'))
    picked.forEach((s) => seen.add(s.id))
    return { title: l.title, note: l.note, byCity: l.byCity && !citySlug, studios: picked }
  })
  const all = lists.flatMap((l) => l.studios)
  const examples: PriceExample[] = []
  const amounts: number[] = []
  for (const s of all) {
    const lines = (s.prices ?? []).map((p) => p.text).filter((t) => topic.price.re.test(t) && !topic.price.exclude?.test(t) && amountsIn(t).length)
    lines.forEach((t) => amounts.push(...amountsIn(t)))
    if (lines[0]) examples.push({ studio: s, text: lines[0] })
  }
  // Typical span, not extremes: 10th–90th percentile once there are enough prices.
  const sorted = [...amounts].sort((a, b) => a - b)
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  const r = sorted.length >= 5 ? { min: pick(0.1), max: pick(0.9) } : range(amounts)
  return {
    lists,
    all,
    examples: examples.slice(0, 8),
    ctx: { n: all.length, cities: groupByCity(all).length, min: r?.min, max: r?.max, place: citySlug ? all[0]?.cityDoc?.name : undefined },
  }
}

// One line that shows why a studio is on the page: a matching service or price, else the summary.
export function evidenceLine(s: StudioCard, re: RegExp): string {
  const lines = [...(s.services ?? []), ...(s.prices ?? []), ...(s.products ?? [])].map((x) => x.text)
  const hit = lines.find((t) => re.test(t))
  if (hit) return hit.length > 150 ? `${hit.slice(0, 147)}…` : hit
  const sentence = (s.publicDescription ?? '').split(/(?<=[.!?])\s+/).find((t) => re.test(t))
  return sentence ?? s.summary ?? ''
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
        sub: ctx.min && ctx.max ? `${ctx.n} ${pluralUk(ctx.n, ['місце', 'місця', 'місць'])} · від ${fmt(ctx.min)} грн` : undefined,
        ...(over.coa ? { coa: over.coa, pattern: over.coa } : { img: topic.ogImg, credit: `Фото: ${topic.photo.author}, ${topic.photo.license}` }),
      }),
    },
  }
}

// Cities with at least MIN_LIST studios that sell certificates: each gets /sertyfikaty/<city> (no thin pages).
export async function certificateCities() {
  const types = topics.certificates.lists[0].types ?? []
  const studios = (await getAllStudios()).filter((s) => types.includes(s.type ?? '') && hasFormat(s, 'certificates'))
  return groupByCity(studios).filter((g) => g.studios.length >= MIN_LIST).map((g) => g.city)
}
