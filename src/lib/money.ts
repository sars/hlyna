// Money: reading hryvnia amounts out of studio price lines and wording prices consistently on every page.
// Pure functions only (no data loading), so price logic has one home and is easy to test.

/** «1 200» with a Ukrainian thousands separator. */
export const fmt = (n: number) => n.toLocaleString('uk-UA')

/** Thousands separators in hryvnia amounts written without them («31894 грн» → «31 894 грн», non-breaking), text otherwise unchanged. */
export const groupMoney = (t: string) =>
  t.replace(/\d[\d\s.,–—-]*?\s*(?:грн|₴)/g, (seg) => seg.replace(/(?<![\d.,])\d{4,}(?!\d)/g, (d) => d.replace(/\B(?=(?:\d{3})+(?!\d))/g, '\u00a0')))

/** Min, max and the upper-middle value of a set of numbers (null when empty). */
export function range(nums: number[]) {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  return { min: sorted[0], max: sorted[sorted.length - 1], median: sorted[Math.floor(sorted.length / 2)] }
}

/** True median (mean of the two middle values for an even count). */
export const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

/** Value at percentile p of an already sorted array. */
export const quantile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]

/** Round to a believable step: 3 120 → 3 100, 870 → 850. */
export const roundNice = (n: number) => (n < 1000 ? Math.round(n / 50) * 50 : Math.round(n / 100) * 100)

/** «900 грн» for one value, «від 900 до 1 700 грн» for two different ones. */
export const fromTo = (min: number, max: number) => (min === max ? `${fmt(min)} грн` : `від ${fmt(min)} до ${fmt(max)} грн`)

/** Hryvnia amounts in a price line between 150 and 20 000 (decimals allowed: «1 200,50 грн»). */
export const amountsIn = (text: string) =>
  [...text.matchAll(/(\d[\d\s]{1,6})(?:[.,]\d+)?\s*(?:грн|₴)/g)].map((m) => Number(m[1].replace(/\s/g, ''))).filter((v) => v >= 150 && v <= 20000)

/** Hryvnia amounts in a price line between 100 and 20 000 (whole numbers; the catalogue's simple reading). */
export const wholeAmountsIn = (text: string) =>
  [...text.matchAll(/(\d[\d\s]{1,6})\s*(?:грн|₴)/g)].map((m) => Number(m[1].replace(/\s/g, ''))).filter((n) => n >= 100 && n <= 20000)

// First price in a piece of text; for a range or alternatives («1 450–1 700 грн», «1100/1300 грн») the lower one,
// since studios quote «від».
const PRICE = /(\d[\d\s]{0,6})(?:[.,]\d+)?(?:\s*[–\-/]\s*\d[\d\s]{0,6}(?:[.,]\d+)?)?\s*(?:грн|₴)/u
export const priceIn = (t: string) => {
  const m = t.match(PRICE)
  return m ? Number(m[1].replace(/\s/g, '')) : null
}

// The price that belongs to given words: «чашки 250–2200 грн, тарілки 545–4000 грн» → cups 250, plates 545.
// Falls back to the first price in the line.
export const near = (kw: RegExp) => (t: string) => {
  const m = t.match(kw)
  if (m?.index !== undefined) {
    const v = priceIn(t.slice(m.index, m.index + m[0].length + 70))
    if (v !== null) return v
  }
  return priceIn(t)
}

/** Typical span, not extremes: 10th–90th percentile once there are 5+ prices; rounded. */
export function typicalRange(amounts: number[]): { min: number; max: number } | null {
  if (!amounts.length) return null
  const sorted = [...amounts].sort((a, b) => a - b)
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  const r = sorted.length >= 5 ? { min: pick(0.1), max: pick(0.9) } : { min: sorted[0], max: sorted[sorted.length - 1] }
  return { min: roundNice(r.min), max: roundNice(r.max) }
}

/**
 * One wording for a set of prices (one value per studio), used by every page so the same studios never
 * produce two different numbers: 1 price → «900 грн», 2 → «900 і 1 300 грн», 3–4 → «від 900 до 1 700 грн»,
 * 5+ → the typical span (10th–90th percentile). Never «від X до X».
 */
export type Span = { n: number; min: number; max: number; median: number; text: string }
export function spanOf(values: number[]): Span | null {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b)
  if (!v.length) return null
  const med = roundNice(v[Math.floor(v.length / 2)])
  const nice = (x: number) => roundNice(x).toLocaleString('uk-UA')
  if (v.length === 1) return { n: 1, min: roundNice(v[0]), max: roundNice(v[0]), median: med, text: `${nice(v[0])} грн` }
  if (v.length === 2) {
    const [a, b] = [roundNice(v[0]), roundNice(v[1])]
    return { n: 2, min: a, max: b, median: med, text: a === b ? `${nice(a)} грн` : `${nice(a)} і ${nice(b)} грн` }
  }
  const r = typicalRange(v)!
  return { n: v.length, min: r.min, max: r.max, median: med, text: r.min === r.max ? `${r.min.toLocaleString('uk-UA')} грн` : `від ${r.min.toLocaleString('uk-UA')} до ${r.max.toLocaleString('uk-UA')} грн` }
}
