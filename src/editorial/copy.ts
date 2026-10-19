// Editorial copy shared by every written page (waves A, B, C): the copy shape and {placeholder} filling.
// Copy lives in src/content/wave*/<id>.json; live numbers are filled in at render time.
import { dropStale, isStale, kyivToday } from '@/lib/dates'
import { fmt, fromTo } from '@/lib/money'

export type WaveCopy = {
  id: string
  title: string
  metaDescription: string
  lead: string
  epigraph?: string[]
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[]
  picks?: { need: string; slugs: string[]; why: string }[]
  /** Ranked selections by category (e.g. «Розписні прикраси», top 5 each): one product line per maker. */
  tops?: TopCategory[]
  faq: { q: string; a: string }[]
  sources: string[]
  /** When the copy last changed (YYYY-MM-DD): the page's lastmod in the sitemap; without it, site.contentUpdated. */
  updated?: string
}

export type TopItem = {
  /** What is offered, e.g. «Косівські розписні прикраси, понад 40 форм». */
  title: string
  /** Maker as the reader knows it; linked to the profile when `slug` is set, else to `href` (their Instagram). */
  maker: string
  slug?: string
  href?: string
  city?: string
  /** Price line as published, with the unit: «190–445 грн за штуку». */
  price?: string
  /** One or two sentences: forms, sizes, set contents, quantities. */
  details: string
  /** How to get it: preorder, deadline, minimum order, delivery. */
  terms?: string
  /** When the facts were seen: «сезон 2026/27», «грудень 2025». */
  seen: string
  /** Instagram post that shows the item (embedded lazily); with `photos` it stays as the source link. */
  embed?: string
  /**
   * The studio's own photos of the item, shown instead of the embed: sha256 of each file as uploaded in the panel
   * (`shasum -a 256 file`, first 12 hex are enough). Used only while the studio (`slug`) has photo consent.
   */
  photos?: string[]
}

export type TopCategory = { id: string; heading: string; intro?: string; items: TopItem[] }

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
    // A text that opens with a placeholder («{inCity} кераміку…» → «у Києві…») starts with a capital.
    .replace(/^(\s*)(\p{Ll})/u, (_m, a: string, b: string) => a + b.toUpperCase())

/** The copy as shown today: placeholders filled ({year} is the current year), and dated sentences that have passed taken
 *  out (src/lib/dates.ts). A section or a question whose own heading names a past date goes whole. */
export function fillCopy(c: WaveCopy, vars: WaveVars, today = kyivToday()): WaveCopy {
  const all: WaveVars = { year: today.slice(0, 4), ...vars }
  const f = (t: string) => dropStale(fill(t, all), today)
  const live = (t: string) => !isStale(fill(t, all), today)
  return {
    ...c,
    title: fill(c.title, all),
    metaDescription: f(c.metaDescription),
    lead: f(c.lead),
    sections: c.sections
      .filter((s) => live(s.heading))
      .map((s) => ({ heading: fill(s.heading, all), paragraphs: s.paragraphs.map(f).filter(Boolean), bullets: s.bullets?.map(f).filter(Boolean) }))
      .filter((s) => s.paragraphs.length || s.bullets?.length),
    picks: c.picks?.map((p) => ({ ...p, need: f(p.need), why: f(p.why) })),
    tops: c.tops?.map((t) => ({ ...t, intro: t.intro && f(t.intro), items: t.items.map((x) => ({ ...x, details: f(x.details), terms: x.terms && f(x.terms) })) })),
    faq: c.faq.filter((x) => live(x.q)).map((x) => ({ q: fill(x.q, all), a: f(x.a) })).filter((x) => x.a),
  }
}

export const priceVars = (r: { min?: number; max?: number; median?: number; priceText?: string } | null | undefined): WaveVars => ({
  min: r?.min,
  max: r?.max,
  median: r?.median ? `${fmt(r.median)} грн` : undefined,
  priceRange: r?.priceText ?? (r?.min && r?.max ? fromTo(r.min, r.max) : undefined),
})
