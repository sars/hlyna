// The one place pages take price ranges and lead times from, so no two pages quote different numbers.
// Prices: the live price index (/tsiny-2026), the 10th–90th percentile across studios. Lead times:
// fixed constants in site.ts (they come from what studios state, not from price lines).
import { cache } from 'react'

import { site } from '@/content/site'

import { priceIndex, type CategoryStats } from './priceIndex'
import { fmt } from './money'

export type PriceFact = { min: number; max: number; median: number; n: number; unit: string }

export const facts = cache(async () => {
  const { stats } = await priceIndex()
  const by = new Map<string, CategoryStats>(stats.map((x) => [x.cat.key, x]))
  const get = (key: string): PriceFact | null => {
    const x = by.get(key)
    return x ? { min: x.p10, max: x.p90, median: x.median, n: x.n, unit: x.cat.unit } : null
  }
  /** «здебільшого 300–1 900 грн з особи» (or the fallback when too few studios publish a price). */
  const range = (key: string, opts: { unit?: boolean; fallback?: string } = {}) => {
    const f = get(key)
    if (!f) return opts.fallback ?? 'за прайсом студії'
    return `здебільшого ${fmt(f.min)}–${fmt(f.max)} грн${opts.unit === false ? '' : ` ${f.unit}`}`
  }
  /** «1 000 грн» median, or '' */
  const median = (key: string) => {
    const f = get(key)
    return f ? `${fmt(f.median)} грн` : ''
  }
  return { get, range, median, lead: site.lead }
})
