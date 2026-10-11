// Editorial content for city and product pages (src/content/places, synced by scripts/sync-place-content.mjs).
// Live numbers (counts, prices) stay in the page templates; this holds the parts written by hand.
import { cities, products } from '@/content/places'

export type PlaceContent = {
  slug: string
  lead: string
  scene: string[]
  picks: { need: string; slugs: string[]; why: string }[]
  faq: { q: string; a: string }[]
  seeAlso: string[]
  sources: string[]
}

export const cityContent = (slug: string): PlaceContent | null => cities[slug] ?? null
export const productContent = (slug: string): PlaceContent | null => products[slug] ?? null

const words = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\d\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3))

// The page's own FAQ first (it carries live numbers), then editorial questions that don't repeat one of them.
export function mergeFaq<T extends { q: string; a: string }>(base: T[], extra: { q: string; a: string }[]): { q: string; a: string }[] {
  // Same question word («Де…», «Скільки…») and mostly the same words = the same question.
  const head = (q: string) => q.trim().split(/\s+/)[0].toLowerCase()
  const seen = base.map((f) => ({ h: head(f.q), w: words(f.q) }))
  const out: { q: string; a: string }[] = [...base]
  for (const f of extra) {
    const w = words(f.q)
    const h = head(f.q)
    const dup = seen.some(({ h: sh, w: s }) => {
      if (sh !== h) return false
      const common = [...w].filter((x) => s.has(x)).length
      return common / Math.max(1, Math.min(w.size, s.size)) >= 0.6
    })
    if (dup) continue
    seen.push({ h, w })
    out.push(f)
  }
  return out
}

// Editorial answers point at «the price table below»; say where prices really are on this page.
export const fixPriceRef = (a: string, where: string) =>
  a
    // «Вартість — див. таблицю цін нижче» → «Вартість — у розділі «Ціни»…», not «Вартість — ціни — у розділі…»
    .replace(/\s*[—–-]\s*див\.\s*таблицю цін нижче/g, ` — ${where}`)
    .replace(/[Дд]ив\.\s*таблицю цін нижче/g, (m) => (m[0] === 'Д' ? 'Ціни' : 'ціни') + ` — ${where}`)
