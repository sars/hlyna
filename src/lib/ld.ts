// schema.org items for studio lists (ItemList → ListItem → item), the same shape on every page.
import { site } from '@/content/site'
import type { TopCategory, TopItem } from '@/editorial/copy'
import type { StudioCard } from './catalog'
import { displayName } from './present'

// A «maker» record named as a workshop or studio («Зайкіна майстерня») is a business, not a person.
export const isPersonMaker = (s: { type?: string | null; name: string }) => s.type === 'maker' && !/майстерн|студі|studio|ceramics|кераміка|бренд/iu.test(s.name)

export const ldStudio = (s: StudioCard) => {
  const place = s.cityDoc ? { '@type': 'PostalAddress', addressLocality: s.cityDoc.name, addressCountry: 'UA' } : null
  return isPersonMaker(s)
    ? { '@type': 'Person', name: displayName(s), url: `${site.url}/vyrobnyky/${s.slug}`, ...(place ? { homeLocation: { '@type': 'Place', address: place } } : {}) }
    : { '@type': 'LocalBusiness', name: displayName(s), url: `${site.url}/vyrobnyky/${s.slug}`, ...(place ? { address: place } : {}) }
}

export const ldItemList = (name: string, studios: StudioCard[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: studios.length,
  itemListElement: studios.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: ldStudio(s) })),
})

// A ranked top of a written page: each row is a maker's offer, named and linked (profile, else Instagram). No Product
// or Offer: prices are published as text ranges, and Google flags Product without a parsed price, ratings or reviews.
export const ldTopList = (c: TopCategory, known: Map<string, StudioCard>) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: c.heading,
  ...(c.intro ? { description: c.intro } : {}),
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  numberOfItems: c.items.length,
  itemListElement: c.items.map((it: TopItem, i) => {
    const s = it.slug ? known.get(it.slug) : undefined
    const url = s ? `${site.url}/vyrobnyky/${s.slug}` : it.href
    return { '@type': 'ListItem', position: i + 1, name: `${it.title} — ${it.maker}`, ...(url ? { url } : {}) }
  }),
})
