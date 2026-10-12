// Price index 2026 (/tsiny-2026): typical prices per category from the studios' own price lines.
// One value per studio and category (the median of its matching lines), so a studio with twenty
// price lines counts once. Ranges are the 10th–90th percentile across studios, rounded.
import { cache } from 'react'

import { getAllWithShops, type StudioCard } from './catalog'
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
const COURSE = /курс|абонемент|(?:[3-9]|\d{2,})\s*(?:занять|заняття|уроків)|місяц/iu
const NOT_CLASS_PRICE = /коворк|оренд|випал\s+\d|глина\s+\d|за годину оренди|usd|eur|\$|€|не кераміка|піч|rad-|обладнан|круг\s*«|б\/в|(?<!\p{L})продаж/iu
const GROUP_TOTAL = /до\s+\d+\s+ос|за\s+груп|для\s+груп|компані\p{L}*\s+до|наступн/iu
const PER_PERSON = /з\s+особи|\/\s*особ|за\s+особу|(?<!\p{L})особа(?!\p{L})|на\s+людину|з\s+людини/iu
const CORPORATE = /корпоратив|тімбілд|тимбілд|для компан|для команд|закрит\p{L}* (?:мк|майстер|груп)/iu
const COUPLE = /для двох|удвох|вдвох|побачен|для пари|в парі|парн\p{L}* (?:мк|майстер|занят)|(?<!\d)2\s*особ/iu
const KIDS = /(?<!\p{L})(?:дит|діт)|школяр|\d+\s*[–-]\s*\d+\s*(?:рок|років)/iu
const PRIVATE = /індивідуал/iu
const SETS = /(?<!\p{L})сет(?!\p{L})|набір|комплект|сервіз|(?<!\p{L})мк(?!\p{L})|майстер-клас|занят|ліпк|ліплен|гончарств|курс|оренд|сертифікат|випал/iu

export const CATEGORIES: Category[] = [
  { key: 'group', label: 'Разовий майстер-клас', unit: 'з особи', group: 'mk', match: (t) => CLASS.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !PRIVATE.test(t) && !COUPLE.test(t) && !KIDS.test(t) && !CORPORATE.test(t) && !/сертифікат|день народжен|свят|виїзн/iu.test(t) && !GROUP_TOTAL.test(t), pick: near(CLASS) },
  { key: 'private', label: 'Індивідуальний майстер-клас', unit: 'за заняття', group: 'mk', match: (t) => PRIVATE.test(t) && CLASS.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !COUPLE.test(t), pick: near(PRIVATE) },
  { key: 'couple', label: 'Майстер-клас для двох', unit: 'за двох', group: 'mk', match: (t) => COUPLE.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t), pick: near(COUPLE) },
  { key: 'kids', label: 'Дитячий майстер-клас', unit: 'з дитини', group: 'mk', match: (t) => KIDS.test(t) && CLASS.test(t) && !COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !/день народжен|свят/iu.test(t), pick: near(KIDS) },
  { key: 'course', label: 'Курс або абонемент', unit: 'за курс', group: 'mk', match: (t) => COURSE.test(t) && !NOT_CLASS_PRICE.test(t) && !/коворк/iu.test(t), pick: near(COURSE) },
  { key: 'cert', label: 'Подарунковий сертифікат', unit: 'за сертифікат', group: 'mk', match: (t) => /сертифікат/iu.test(t) && !COURSE.test(t) && !/\+\s*\d/.test(t), pick: near(/сертифікат/iu) },
  { key: 'corporate', label: 'Корпоратив з глиною', unit: 'з особи', group: 'biz', match: (t) => CORPORATE.test(t) && PER_PERSON.test(t) && !GROUP_TOTAL.test(t), pick: near(CORPORATE) },
  { key: 'cup', label: 'Чашка ручної роботи', unit: 'за штуку', group: 'retail', match: (t) => PRODUCT_RE.cups.test(t) && !SETS.test(t), pick: near(PRODUCT_RE.cups) },
  { key: 'plate', label: 'Тарілка, миска чи піала', unit: 'за штуку', group: 'retail', match: (t) => PRODUCT_RE.plates.test(t) && !SETS.test(t), pick: near(PRODUCT_RE.plates) },
  { key: 'vase', label: 'Ваза', unit: 'за штуку', group: 'retail', match: (t) => /(?<!\p{L})ваз(?!елін)/iu.test(t) && !SETS.test(t), pick: near(/(?<!\p{L})ваз(?!елін)/iu) },
  { key: 'jewelry', label: 'Прикраса (сережки, кулон)', unit: 'за штуку', group: 'retail', match: (t) => /сережк|кулон|брошк|намист/iu.test(t) && !SETS.test(t), pick: near(/сережк|кулон|брошк|намист/iu) },
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

// One value per studio and category: the median of that studio's matching price lines.
export function studioValues(studios: StudioCard[]) {
  const values = new Map<string, { studio: StudioCard; value: number; lines: Example[] }[]>()
  const years: number[] = []
  const sources = new Set<number>()
  for (const s of studios) {
    const lines = publicPrices(s)
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
      arr.push({ studio: s, value: median(hits.map((h) => h.value)), lines: hits })
      values.set(cat.key, arr)
    }
  }
  return { values, years, sources }
}

/** A studio's own price for one category (median of its matching lines), or null. */
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

export const priceIndex = cache(async function priceIndex() {
  // Shops and galleries stay in the price sample: their retail prices are real prices of the same things (the studio counts on
  // other pages leave them out).
  const studios = (await getAllWithShops()).filter((s) => s.type !== 'supplier')
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
})
