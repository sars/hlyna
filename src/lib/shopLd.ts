// schema.org for the shop (research/seo-llm.md): Product + Offer with the studio as seller, shipping and return policy,
// ItemList for the lists, OnlineStore for the shop home. Values mirror the visible page; nothing is invented.
import { site } from '@/content/site'
import type { ShopItem, ShopStudio } from '@/server/publicShop'

import { ldAvailability, RETURN_DAYS } from './shop'

const SPEC_KEYS: Record<string, string> = { 'об’єм': 'size', "об'єм": 'size', розмір: 'size', розміри: 'size', висота: 'size', матеріал: 'material', колір: 'color' }

/** A date two months ahead, for `priceValidUntil` (prices change by the studio's hand; a passed date would hide the snippet). */
const validUntil = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 2)
  return d.toISOString().slice(0, 10)
}

export const ldReturnPolicy = (toOrder: boolean, note?: string) => ({
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'UA',
  ...(toOrder
    ? { returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' }
    : { returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: RETURN_DAYS, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnShippingFees' }),
  ...(note ? { description: note } : {}),
})

export const ldShipping = (i: Pick<ShopItem, 'leadDaysMin' | 'leadDaysMax' | 'state'>) => ({
  '@type': 'OfferShippingDetails',
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
  // Carrier tariff, paid on receipt: no fixed rate is claimed.
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: i.state === 'to_order' ? (i.leadDaysMin ?? 14) : 1, maxValue: i.state === 'to_order' ? (i.leadDaysMax ?? i.leadDaysMin ?? 28) : 3, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
  },
})

export const ldSeller = (s: ShopStudio) => ({
  '@type': 'Organization',
  name: s.name,
  url: `${site.url}/vyrobnyky/${s.slug}`,
  ...(s.city ? { address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: 'UA' } } : {}),
})

/** The Product with one Offer of a shop item page (merchant listing). */
export function ldProduct(i: ShopItem) {
  const specs: Record<string, string> = {}
  for (const s of i.specs) {
    const key = SPEC_KEYS[s.label.trim().toLowerCase()]
    if (key && !specs[key]) specs[key] = s.value
  }
  const toOrder = i.state === 'to_order'
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: i.title,
    ...(i.description ? { description: i.description.split(/\n{2,}/)[0] } : {}),
    sku: `${i.studio.slug}/${i.slug}`,
    brand: { '@type': 'Brand', name: i.studio.name },
    manufacturer: ldSeller(i.studio),
    ...(i.photos.length ? { image: i.photos.map((p) => `${site.url}${p.url}`) } : {}),
    ...specs,
    category: i.category,
    url: `${site.url}${i.path}`,
    ...(i.updatedAt ? { dateModified: i.updatedAt.slice(0, 10) } : {}),
    ...(i.priceMin
      ? {
          offers: {
            '@type': 'Offer',
            url: `${site.url}${i.path}`,
            price: String(i.priceMin),
            priceCurrency: 'UAH',
            priceValidUntil: validUntil(),
            availability: ldAvailability(i.state, i.stock),
            itemCondition: 'https://schema.org/NewCondition',
            seller: ldSeller(i.studio),
            shippingDetails: ldShipping(i),
            hasMerchantReturnPolicy: ldReturnPolicy(toOrder, i.studio.terms.returnsNote),
          },
        }
      : {}),
  }
}

/** The list of a shop page: Products with name, image, url (sold ones left out, as Google asks). */
export const ldShopList = (name: string, items: ShopItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: items.length,
  itemListElement: items.map((i, n) => ({
    '@type': 'ListItem',
    position: n + 1,
    item: {
      '@type': 'Product',
      name: i.title,
      url: `${site.url}${i.path}`,
      ...(i.photos[0] ? { image: `${site.url}${i.photos[0].url}` } : {}),
      ...(i.priceMin ? { offers: { '@type': 'Offer', price: String(i.priceMin), priceCurrency: 'UAH', availability: ldAvailability(i.state, i.stock) } } : {}),
    },
  })),
})

/** The shop itself on its home page. */
export const ldOnlineStore = () => ({
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: `${site.name} · Крамниця`,
  url: `${site.url}/kramnytsia`,
  logo: `${site.url}/brand/png/hlyna-mark-primary-512.png`,
  email: site.email,
  areaServed: 'UA',
  hasMerchantReturnPolicy: ldReturnPolicy(false),
  description: 'Крамниця українських керамічних студій: вироби відправляє сама майстерня, ціни встановлюють студії.',
})

/** The studio's shop page: the studio with what it offers, priced as a range. */
export const ldStudioShop = (s: ShopStudio, items: ShopItem[]) => {
  const prices = items.map((i) => i.priceMin).filter((p): p is number => p != null && p > 0)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s.name,
    url: `${site.url}/vyrobnyky/${s.slug}`,
    ...(s.city ? { address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: 'UA' } } : {}),
    ...(prices.length
      ? { makesOffer: { '@type': 'AggregateOffer', lowPrice: String(Math.min(...prices)), highPrice: String(Math.max(...prices)), priceCurrency: 'UAH', offerCount: prices.length, url: `${site.url}/kramnytsia/${s.slug}` } }
      : {}),
  }
}
