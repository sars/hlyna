// Wave B selections: contemporary tableware brands, New Year ornaments, who works with business, Etsy shops.
import etsyShops from '@/content/waveA/etsy-shops.json'
import type { WaveVars } from '@/editorial/copy'
import { evidenceLine } from '@/editorial/topics'
import type { EtsyShop } from '@/editorial/wave-a'
import { confirmedForVenues, groupByCity, hasFormat } from '@/lib/catalog'
import { publicPrices } from '@/lib/present'
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

// Seasonal picks: studios whose own products, services, summary or price lines mention the theme (goat or lamb, candlesticks,
// Christmas-table ware). Same shape as newYearData; a page needs ≥ 3 entries to go live.
const mentionsIn = (s: Parameters<typeof productText>[0] & Parameters<typeof publicPrices>[0], re: RegExp) => re.test(`${productText(s)} ${publicPrices(s).map((p) => p.text).join(' ')}`)
async function mentionData(re: RegExp) {
  const studios = (await makers()).filter((s) => mentionsIn(s, re))
  const lines = studios.map((s) => ({ s, line: evidenceLine(s, re) }))
  const groups = groupByCity(studios)
  const vars: WaveVars = { count: studios.length, cities: groups.length }
  return { studios, lines, groups, vars }
}

// Symbol of 2027 (the year of the Goat / Ram): goat, ram and lamb figures and gifts in ceramics. The lookaheads keep out
// «козак», «козацький», «козир», «козуля».
export const SYMBOL_2027 = /(?<!\p{L})(коз(?:а(?![кцч])|и(?!р)|[оі](?!р)|у(?!л)|[ею])|кіз|козл|козен|козоч|баран|ягн|вівц|овеч)/iu
export const symbolData = () => mentionData(SYMBOL_2027)

export const CANDLESTICKS = /свічник|підсвічник|трійц/iu
export const candlesticksData = () => mentionData(CANDLESTICKS)

// Christmas Eve table: kutia bowls, makitra, uzvar jugs, «різдвяний посуд».
export const CHRISTMAS_TABLE = /святвеч|макітр|кут[яію]|узвар|різдвян\p{L}* (?:посуд|набір|тарел|тарі|горнят|чаш)|трійц/iu
export const christmasTableData = () => mentionData(CHRISTMAS_TABLE)

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
