// Where to buy contemporary Ukrainian ceramics (/de-kupyty-keramiku): shops, makers selling online, Etsy.
import shopMakers from '@/content/shop-makers.json'
import etsyShops from '@/content/waveA/etsy-shops.json'
import stockistShops from '@/content/waveA/stockists.json'
import type { WaveVars } from '@/editorial/copy'
import { getAllWithShops, groupByCity, type StudioCard } from '@/lib/catalog'
import { isExhibitingOnly } from '@/lib/present'

export type EtsyShop = { shop: string; url: string; location: string; rating?: number; reviews?: number; sales?: number; years?: string; items?: number; slug?: string; name?: string }
export type StockistShop = { name: string; city: string; address?: string; website?: string; instagram?: string; brands: string; slug?: string }

/** A place that sells the work of makers from the catalogue (src/content/shop-makers.json), makers and the shop resolved to open profiles. */
export type StockPlace = {
  place: string
  kind?: string
  address?: string
  note?: string
  shop?: StudioCard
  makers: StudioCard[]
  sources: { label: string; url: string }[]
}
export type StockGroup = { id: string; name: string; places: StockPlace[] }
type RawPlace = { place: string; slug?: string; kind?: string; address?: string; note?: string; slugs: string[]; sources: StockPlace['sources'] }

const ONLINE = /сайт|інтернет-магазин|онлайн|shop|etsy|prom|rozetka|create4me/iu

// Only makers with an open profile are named (the catalogue's own rule: closed and unverified ones stay out of lists);
// a place left without any of them is not shown. Which maker is sold where is only what the brand's own stockist page,
// the shop's catalogue or a maker's Instagram states, with the date it was read (the JSON holds source and date).
function stockGroups(known: Map<string, StudioCard>): StockGroup[] {
  return (shopMakers.groups as { id: string; name: string; places: RawPlace[] }[])
    .map((g) => ({
      id: g.id,
      name: g.name,
      places: g.places
        .map((p) => ({
          place: p.place,
          kind: p.kind,
          address: p.address,
          note: p.note,
          shop: p.slug ? known.get(p.slug) : undefined,
          makers: p.slugs.map((s) => known.get(s)).filter((s): s is StudioCard => !!s),
          sources: p.sources,
        }))
        .filter((p) => p.makers.length > 0),
    }))
    .filter((g) => g.places.length > 0)
}

export async function whereToBuyData() {
  const studios = await getAllWithShops()
  const stock = stockGroups(new Map(studios.map((s) => [s.slug!, s])))
  const stockPlaces = stock.flatMap((g) => g.places)
  const shops = studios.filter((s) => s.type === 'shop' || (s.type === 'other' && /галере|крамниц|концепт|магазин|store|shop/iu.test(s.name)))
  const makers = studios.filter((s) => (s.type === 'brand' || s.type === 'maker' || s.type === 'studio') && !isExhibitingOnly(s))
  const online = makers.filter((s) => Boolean(s.website) || (s.salesChannels ?? []).some((c) => ONLINE.test(c.text)))
  const etsy = (etsyShops as EtsyShop[]).slice().sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  const stockists = stockistShops as StockistShop[]
  const shopCities = groupByCity(shops)
  const vars: WaveVars = {
    shops: shops.length,
    shopCities: shopCities.length,
    online: online.length,
    etsy: etsy.length,
    etsySales: etsy.reduce((n, e) => n + (e.sales ?? 0), 0),
    stockPlaces: stockPlaces.length,
    stockMakers: new Set(stockPlaces.flatMap((p) => p.makers.map((m) => m.slug))).size,
  }
  return { shops, shopCities, online, etsy, stockists, stock, stockUpdated: shopMakers.updated, stockAbroad: shopMakers.abroad, vars }
}
