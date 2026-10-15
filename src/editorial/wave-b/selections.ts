// Wave B selections: contemporary tableware brands, New Year ornaments, who works with business, Etsy shops.
import etsyShops from '@/content/waveA/etsy-shops.json'
import type { WaveVars } from '@/editorial/copy'
import { evidenceLine } from '@/editorial/topics'
import type { EtsyShop } from '@/editorial/wave-a'
import { confirmedForVenues, groupByCity, hasFormat } from '@/lib/catalog'
import { productText, PRODUCT_RE } from '@/lib/products'
import { makers } from './makers'

/** Contemporary tableware: brands and studios whose own products are plates, bowls or cups. */
export async function tablewareBrandsData() {
  const studios = (await makers()).filter((s) => ['brand', 'studio', 'maker'].includes(s.type ?? '') && (PRODUCT_RE.plates.test(productText(s)) || PRODUCT_RE.cups.test(productText(s))))
  const brands = studios.filter((s) => s.type === 'brand')
  const others = studios.filter((s) => s.type !== 'brand')
  const groups = groupByCity(studios)
  const vars: WaveVars = { count: studios.length, brands: brands.length, cities: groups.length, horeca: studios.filter(confirmedForVenues).length }
  return { studios: [...brands, ...others], brands, others, groups, vars }
}

export const NEW_YEAR = /ялинк|новоріч|різдв|ангел(?:ик|оч)|дзвіночк|миколай|сніжинк/iu
export async function newYearData() {
  const studios = (await makers()).filter((s) => hasFormat(s, 'new-year') || NEW_YEAR.test(productText(s)))
  const lines = studios.map((s) => ({ s, line: evidenceLine(s, NEW_YEAR) }))
  const groups = groupByCity(studios)
  const vars: WaveVars = { count: studios.length, cities: groups.length }
  return { studios, lines, groups, vars }
}

export async function businessData() {
  const all = (await makers()).filter((s) => ['brand', 'studio', 'maker'].includes(s.type ?? ''))
  const horeca = all.filter(confirmedForVenues)
  const logo = all.filter((s) => hasFormat(s, 'logo'))
  const gifts = all.filter((s) => hasFormat(s, 'corporate-gifts'))
  const studios = [...new Map([...horeca, ...logo, ...gifts].map((s) => [s.id, s])).values()]
  const withTerms = studios.filter((s) => s.b2b?.minOrder || s.b2b?.leadTime || s.b2b?.logoMethods?.length)
  const vars: WaveVars = { count: studios.length, horeca: horeca.length, logo: logo.length, gifts: gifts.length, cities: groupByCity(studios).length, withTerms: withTerms.length }
  return { studios, horeca, logo, gifts, withTerms, vars }
}

export async function etsyData() {
  const shops = (etsyShops as EtsyShop[]).slice().sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  const sales = shops.reduce((n, e) => n + (e.sales ?? 0), 0)
  const reviews = shops.reduce((n, e) => n + (e.reviews ?? 0), 0)
  const ratings = shops.map((e) => e.rating).filter((x): x is number => typeof x === 'number').sort((a, b) => a - b)
  const vars: WaveVars = {
    count: shops.length,
    etsySales: sales,
    etsyReviews: reviews,
    medianRating: ratings.length ? String(ratings[Math.floor(ratings.length / 2)]).replace('.', ',') : undefined,
    topShop: shops[0]?.name ?? shops[0]?.shop,
    topSales: shops[0]?.sales,
  }
  return { shops, vars }
}
