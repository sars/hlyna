// Where to buy contemporary Ukrainian ceramics (/de-kupyty-keramiku): shops, makers selling online, Etsy.
import etsyShops from '@/content/waveA/etsy.json'
import stockistShops from '@/content/waveA/stockists.json'
import type { WaveVars } from '@/editorial/copy'
import { getAllStudios, groupByCity } from '@/lib/catalog'
import { isExhibitingOnly } from '@/lib/present'

export type EtsyShop = { shop: string; url: string; location: string; rating?: number; reviews?: number; sales?: number; years?: string; items?: number; slug?: string; name?: string }
export type StockistShop = { name: string; city: string; address?: string; website?: string; instagram?: string; brands: string; slug?: string }

const ONLINE = /сайт|інтернет-магазин|онлайн|shop|etsy|prom|rozetka|create4me/iu

export async function whereToBuyData() {
  const studios = await getAllStudios()
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
  }
  return { shops, shopCities, online, etsy, stockists, vars }
}
