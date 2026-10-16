// Price index 2026 (/tsiny-2026): typical prices per category from the studios' own price lines.
// One value per studio and category (the lower median of its matching lines — always a price the studio really
// quotes, never an average of two), so a studio with twenty price lines counts once. Ranges are the 10th–90th
// percentile across studios, rounded. Only dated ceramic lines count: painting, floristry, candles, wood, add-ons,
// hourly rates, deposits and family formats stay out (audit 15.10.2026, docs/reviews/2026-10-15-page-audit/batch-6.md).
import { cache } from 'react'

import { getAllStudios, type StudioCard } from './catalog'
import { median, near, quantile, roundNice, spanOf, type Span } from './money'
import { publicPrices } from './present'
import { PRODUCT_RE } from './products'

export type Category = {
  key: string
  label: string
  unit: string
  group: 'mk' | 'biz' | 'retail'
  match: (t: string) => boolean
  // Amount for this category from one line (null = line not usable).
  pick: (t: string) => number | null
}

const CLASS = /(?<!\p{L})мк(?!\p{L})|майстер-клас|заняття|урок|гончарств|ліплен|ліпк|розпис|гончарн\p{L}* (?:кол|круг)/iu
// A class, not a product with «розпис» or «ліплені» in its description: a class word, a group or a duration.
const CLASS_MARK = /(?<!\p{L})мк(?!\p{L})|майстер-клас|майстерк|занят|урок|груп|учасник|\d\s+вир[іо]б|\d\s*(?:год|хв)(?!\p{L})/iu
const COURSE = /курс|абонемент|пакет|(?:[3-9]|\d{2,})\s*(?:занять|заняття|зан\.|уроків)/iu
// Not ceramics: painting, drawing, floristry, candles, wood, textile, resin, felting; and not a class price at all.
const NOT_CERAMIC = /живопис|малюван|флорист|букет|петриків|дерев[’'ʼ]?ян|свічкар|свічок|свічки(?!\s+в\s+керам)|вінок|колаж|валян|вибійк|шопер|торбин|ляльк|епоксид|смол[аиою](?!\p{L})|ткацтв|флюїд|ебру|гарбуз|фотосес|консультац|екскурсі/iu
// An add-on line («Додаткова година — 300 грн», «Доєднатися до групи…»), not an add-on mentioned after the price.
const ADDON = /^\s*(?:додатков|доплат|доєдна|доробит|див\.)|без\s+майстра/iu
const HOURLY = /грн\s*\/\s*(?:особа\s*\/\s*)?год(?!\p{L})|за\s+годину|академічн/iu
const FAMILY = /сімейн|з\s+дорослим|дорослий\s*\+\s*дитин|батьки\s*\+|батьки\s+з|і\s+дорослі|та\s+дорослих/iu
const NOT_CLASS_PRICE = /коворк|оренд|випал\s+\d|глина\s+\d|за годину оренди|usd|eur|\$|€|не кераміка|піч|rad-|обладнан|круг\s*«|б\/в|(?<!\p{L})продаж/iu
const GROUP_TOTAL = /до\s+\d+\s+ос|за\s+груп|для\s+груп|компані\p{L}*\s+до|наступн|для\s+своєї\s+компанії|\d+\s+учасник\p{L}*\s*—/iu
const PER_PERSON = /з\s+особи|\/\s*особ|за\s+особу|(?<!\p{L})особа(?!\p{L})|на\s+людину|з\s+людини/iu
const CORPORATE = /корпоратив|тімбілд|тимбілд|для компан|для команд|закрит\p{L}* (?:мк|майстер|груп)/iu
const COUPLE = /для двох|удвох|вдвох|на двох|за двох|побачен|романтичн|для пари|в парі|парн\p{L}*\s+(?:мк|майстер|занят)|(?<![\d–-])(?<!до\s)2\s*(?:особ|осіб|ос\.)/iu
const KIDS = /(?<!\p{L})(?:дит|діт)|школяр|\d+\s*[–-]\s*\d+\s*(?:рок|років)/iu
const PRIVATE = /індивідуал/iu
const SETS = /(?<!\p{L})сет(?!\p{L})|набір|комплект|сервіз|(?<!\p{L})мк(?!\p{L})|майстер-клас|занят|ліпк|ліплен|гончарств|курс|оренд|сертифікат|випал/iu

// What a line is about is said before its first price: «МК — 1 300 грн (1 ос.), 2 400 (2 ос.)» is a single-person price.
const head = (t: string) => t.split(/\d[\d\s]*(?:[.,]\d+)?\s*(?:грн|₴)/u)[0]
// A deposit or prepayment is not the price: «МК — ціна в хайлайті, передоплата 500 грн» has no class price.
const noDeposit = (t: string) => t.replace(/(?:передоплат\p{L}*|депозит\p{L}*)\s*[—–-]?\s*\d[\d\s]*грн/giu, '')
const pickNear = (kw: RegExp) => (t: string) => near(kw)(noDeposit(t))
// The price for two: an amount marked «за двох / за 2 особи / для двох», doubled when it is quoted per person.
const COUPLE_TOTAL = /(?<![\d.,])(\d[\d\s]{0,6})\s*грн\s*(?:\/\s*)?\(?\s*(?:(?:за|для|на)\s+(?:двох|пару)|за\s+2\s*(?:особи|осіб|ос\.)|2\s*(?:особи|осіб|ос\.))/iu
const COUPLE_AFTER = /(?:для двох|удвох|вдвох|на двох|для пари|в парі|парн\p{L}*\s+\p{L}+|(?<![\d–-])2\s*(?:особи|осіб|ос\.))(?:(?!грн).){0,40}?(?<![\d.,])(\d[\d\s]{0,6})(?:\s*[–-]\s*\d[\d\s]{0,6})?\s*грн(\s*\/\s*ос)?/iu
const pickCouple = (t: string) => {
  const s = noDeposit(t)
  const total = s.match(COUPLE_TOTAL)
  if (total) return Number(total[1].replace(/\s/g, ''))
  const after = s.match(COUPLE_AFTER)
  if (after) return Number(after[1].replace(/\s/g, '')) * (after[2] ? 2 : 1)
  return null
}
// The line's first price is for two («МК, 2 год — 2 800 грн за 2 особи»): a couple price, not a per-person one.
const firstIsForTwo = (t: string) => {
  const m = t.match(COUPLE_TOTAL)
  return !!m && m.index === t.search(/(?<![\d.,])\d[\d\s]*(?:[.,]\d+)?\s*(?:грн|₴)/u)
}
const forOne = (t: string) => !COUPLE.test(head(t)) && !firstIsForTwo(t)
const CERT_FOR = /мк|майстер|занят|урок|гончар|ліп|кераміки|розпис|сеанс|відвідуван|на одну людину|на особу/iu
const NOT_RETAIL = /собак|для тварин|horeca|набор|посуд\s*\(|свічки|\d\s*(?:год|хв)(?!\p{L})|(?<!\p{L})мк(?!\p{L})|майстер-клас|на\s+патичк/iu
const clean = (t: string) => !NOT_CERAMIC.test(t) && !ADDON.test(t)
/** A price line about ceramics itself (not painting, candles, add-ons or an hourly rate): topic and city pages use it too. */
export const isCeramicPriceLine = (t: string) => clean(t) && !HOURLY.test(t)

export const CATEGORIES: Category[] = [
  { key: 'group', label: 'Разовий майстер-клас', unit: 'з особи', group: 'mk', match: (t) => CLASS.test(t) && CLASS_MARK.test(t) && clean(t) && !HOURLY.test(t) && !FAMILY.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !PRIVATE.test(head(t)) && forOne(t) && !KIDS.test(t) && !CORPORATE.test(t) && !/сертифікат|день народжен|свят|виїзн|^\s*заняття з глазуруванн/iu.test(t) && !GROUP_TOTAL.test(head(t)), pick: pickNear(CLASS) },
  { key: 'private', label: 'Індивідуальний майстер-клас', unit: 'за заняття', group: 'mk', match: (t) => PRIVATE.test(t) && CLASS.test(t) && clean(t) && !HOURLY.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && forOne(t) && !/сертифікат/iu.test(t), pick: pickNear(PRIVATE) },
  { key: 'couple', label: 'Майстер-клас для двох', unit: 'за двох', group: 'mk', match: (t) => COUPLE.test(t) && CLASS_MARK.test(t) && clean(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !/сертифікат/iu.test(t), pick: pickCouple },
  { key: 'kids', label: 'Дитячий майстер-клас', unit: 'з дитини', group: 'mk', match: (t) => KIDS.test(t) && CLASS.test(t) && clean(t) && !FAMILY.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !/день народжен|свят|сертифікат/iu.test(t), pick: pickNear(KIDS) },
  { key: 'course', label: 'Курс або абонемент', unit: 'за курс', group: 'mk', match: (t) => COURSE.test(t) && clean(t) && !HOURLY.test(t) && !NOT_CLASS_PRICE.test(t) && !/коворк|сертифікат/iu.test(t), pick: pickNear(COURSE) },
  { key: 'cert', label: 'Подарунковий сертифікат', unit: 'за сертифікат', group: 'mk', match: (t) => /сертифікат/iu.test(t) && CERT_FOR.test(t) && clean(t) && !COURSE.test(t) && forOne(t) && !/номінал|на суму|будь-як\p{L}*\s+сум|\+\s*\d/iu.test(t), pick: pickNear(/сертифікат/iu) },
  { key: 'corporate', label: 'Корпоратив з глиною', unit: 'з особи', group: 'biz', match: (t) => CORPORATE.test(t) && PER_PERSON.test(t) && clean(t) && !GROUP_TOTAL.test(t), pick: pickNear(CORPORATE) },
  { key: 'cup', label: 'Чашка ручної роботи', unit: 'за штуку', group: 'retail', match: (t) => PRODUCT_RE.cups.test(t) && !SETS.test(t) && !NOT_RETAIL.test(t), pick: near(PRODUCT_RE.cups) },
  { key: 'plate', label: 'Тарілка, миска чи піала', unit: 'за штуку', group: 'retail', match: (t) => PRODUCT_RE.plates.test(t) && !SETS.test(t) && !NOT_RETAIL.test(t), pick: near(PRODUCT_RE.plates) },
  { key: 'vase', label: 'Ваза', unit: 'за штуку', group: 'retail', match: (t) => /(?<!\p{L})ваз(?!елін)/iu.test(t) && !SETS.test(t) && !NOT_RETAIL.test(t), pick: near(/(?<!\p{L})ваз(?!елін)/iu) },
  { key: 'jewelry', label: 'Прикраса (сережки, кулон)', unit: 'за штуку', group: 'retail', match: (t) => /сережк|кулон|брошк|намист/iu.test(t) && !SETS.test(t) && !NOT_RETAIL.test(t), pick: near(/сережк|кулон|брошк|намист/iu) },
]

export type Example = { studio: StudioCard; text: string; source?: string; value: number }
export type CategoryStats = {
  cat: Category
  n: number
  p10: number
  median: number
  p90: number
  examples: Example[]
}

// The middle price a studio really quotes (lower of the two middle ones), never an average that is in no price list.
const lowerMedian = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)]

// One value per studio and category: the lower median of that studio's matching price lines.
export function studioValues(studios: StudioCard[]) {
  const values = new Map<string, { studio: StudioCard; value: number; lines: Example[] }[]>()
  const years: number[] = []
  const sources = new Set<number>()
  for (const s of studios) {
    // Dated lines only: the methodology says «prices 2023–2026», and an undated line can be ten years old.
    const lines = publicPrices(s).filter((l) => l.year)
    for (const cat of CATEGORIES) {
      const hits: Example[] = []
      for (const l of lines) {
        if (!cat.match(l.text)) continue
        const v = cat.pick(l.text)
        if (v === null || v < 150 || v > 20000) continue
        hits.push({ studio: s, text: l.text, source: l.source, value: v })
        if (l.year) years.push(l.year)
      }
      if (!hits.length) continue
      sources.add(s.id)
      const arr = values.get(cat.key) ?? []
      arr.push({ studio: s, value: lowerMedian(hits.map((h) => h.value)), lines: hits })
      values.set(cat.key, arr)
    }
  }
  return { values, years, sources }
}

/** A studio's own price for one category (lower median of its matching lines), or null. */
export function studioPrice(s: StudioCard, key = 'group'): number | null {
  return studioValues([s]).values.get(key)?.[0]?.value ?? null
}

/** Price of one category across a set of studios (a city, a format in a city), worded by spanOf. */
export function scopeSpan(studios: StudioCard[], key = 'group'): Span | null {
  return spanOf((studioValues(studios).values.get(key) ?? []).map((x) => x.value))
}

// Prices among one group of studios (a city page): from–to across studios, median once there are 3.
export function localPrices(studios: StudioCard[]) {
  const { values } = studioValues(studios)
  return CATEGORIES.flatMap((cat) => {
    const sp = spanOf((values.get(cat.key) ?? []).map((x) => x.value))
    if (!sp) return []
    return [{ cat, n: sp.n, min: sp.min, max: sp.max, text: sp.text, median: sp.n >= 3 ? sp.median : null }]
  })
}

function buildPriceIndex(all: StudioCard[]) {
  // Studio prices only: a shop's retail price carries a resale markup, and the pages say «за прайсами студій».
  const studios = all.filter((s) => s.type !== 'supplier')
  const { values, sources, years: found } = studioValues(studios)
  const years = found.sort()
  const stats: CategoryStats[] = []
  for (const cat of CATEGORIES) {
    const arr = values.get(cat.key) ?? []
    if (arr.length < 3) continue
    const sorted = arr.map((x) => x.value).sort((a, b) => a - b)
    // Examples: studios closest to the median, newest line of each (shows what a typical price looks like).
    const med = median(sorted)
    const examples = [...arr]
      .sort((a, b) => Math.abs(a.value - med) - Math.abs(b.value - med))
      .slice(0, 4)
      .map((x) => x.lines[0])
    stats.push({ cat, n: arr.length, p10: roundNice(quantile(sorted, 0.1)), median: roundNice(med), p90: roundNice(quantile(sorted, 0.9)), examples })
  }
  // Group master-class price by city (cities with at least 3 studios with a price).
  const byCity = new Map<string, { name: string; slug: string; vals: number[] }>()
  for (const x of values.get('group') ?? []) {
    const c = x.studio.cityDoc
    if (!c?.slug) continue
    const e = byCity.get(c.slug) ?? { name: c.name, slug: c.slug, vals: [] }
    e.vals.push(x.value)
    byCity.set(c.slug, e)
  }
  const cities = [...byCity.values()]
    .filter((c) => c.vals.length >= 3)
    .map((c) => {
      const sp = spanOf(c.vals)!
      return { name: c.name, slug: c.slug, n: c.vals.length, median: roundNice(median(c.vals)), min: sp.min, max: sp.max }
    })
    .sort((a, b) => b.n - a.n)
  return { stats, cities, studios: sources.size, years: years.length ? { from: years[0], to: years[years.length - 1] } : null }
}

// Built once per catalogue (getAllStudios keeps its array while the joined catalogue lasts): the search index, llms.txt
// and the sitemap ask for it once per page they list, outside a render where `cache` alone does not memoize.
const built = new WeakMap<StudioCard[], ReturnType<typeof buildPriceIndex>>()
export const priceIndex = cache(async function priceIndex() {
  const all = await getAllStudios()
  if (!built.has(all)) built.set(all, buildPriceIndex(all))
  return built.get(all)!
})
