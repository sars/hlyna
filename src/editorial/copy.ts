// Editorial copy shared by every written page (waves A, B, C): the copy shape and {placeholder} filling.
// Copy lives in src/content/wave*/<id>.json; live numbers are filled in at render time.
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
  /** Instagram post that shows the item (embedded lazily). */
  embed?: string
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

export const priceVars = (r: { min?: number; max?: number; median?: number; priceText?: string } | null | undefined): WaveVars => ({
  min: r?.min,
  max: r?.max,
  median: r?.median ? `${fmt(r.median)} грн` : undefined,
  priceRange: r?.priceText ?? (r?.min && r?.max ? fromTo(r.min, r.max) : undefined),
})
