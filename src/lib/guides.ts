// Live numbers for guide pages (/hayidy/*, /dlya-studiy): counts from the catalogue and price ranges from the
// price index, so guide text never drifts from the data it quotes.
import { getAllStudios, groupByCity, offersMasterClasses, worksWithCompanies, worksWithVenues } from './catalog'
import { priceIndex } from './priceIndex'
import type { Metadata } from 'next'

import type { Guide } from '@/content/guides'
import { docPhotos } from '@/content/photos'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from './money'

export type GuidePrice = { range: string; median: string; n: number; rangeNum: string; medianNum: string }
export type GuideCtx = {
  makers: number
  cities: number
  venues: number
  companies: number
  mk: number
  mkCities: number
  price: Partial<Record<string, GuidePrice>>
  batch: string
  logo: string
}

export async function guideCtx(): Promise<GuideCtx> {
  const all = (await getAllStudios()).filter((s) => s.type !== 'supplier')
  const mk = all.filter(offersMasterClasses)
  const { stats } = await priceIndex()
  const price: GuideCtx['price'] = {}
  for (const x of stats) price[x.cat.key] = { range: `${fmt(x.p10)}–${fmt(x.p90)} грн`, median: `${fmt(x.median)} грн`, n: x.n, rangeNum: `${fmt(x.p10)}–${fmt(x.p90)}`, medianNum: fmt(x.median) }
  return {
    makers: all.length,
    cities: groupByCity(all).length,
    venues: all.filter(worksWithVenues).length,
    companies: all.filter(worksWithCompanies).length,
    mk: mk.length,
    mkCities: groupByCity(mk).length,
    price,
    batch: site.lead.batch,
    logo: site.lead.logoDetail,
  }
}

/** «здебільшого 700–1 900 грн» or a neutral fallback when the index has too few studios. */
export const priceText = (ctx: GuideCtx, key: string, fallback = 'за прайсом студії') => (ctx.price[key] ? `здебільшого ${ctx.price[key]!.range}` : fallback)

/** Open Graph metadata for a guide: share card with its photo (or the tile pattern). */
export function guideMetadata(g: Guide): Metadata {
  const photo = g.photo ? docPhotos[g.photo] : null
  const img = photo ? (photo.src.startsWith('/images/doc/') ? 'doc-' : '') + photo.src.split('/').pop()!.replace(/\.jpg$/, '') : undefined
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: g.path },
    openGraph: {
      images: ogImage({ title: g.h1, kicker: g.kicker, ...(photo ? { img, credit: `Фото: ${photo.author}, ${photo.license}` } : { pattern: g.slug }) }),
    },
  }
}
