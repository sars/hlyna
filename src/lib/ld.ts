// schema.org items for studio lists (ItemList → ListItem → item), the same shape on every page.
import { site } from '@/content/site'
import type { StudioCard } from './catalog'
import { cleanName } from './present'

export const ldStudio = (s: StudioCard) => {
  const place = s.cityDoc ? { '@type': 'PostalAddress', addressLocality: s.cityDoc.name, addressCountry: 'UA' } : null
  return s.type === 'maker'
    ? { '@type': 'Person', name: cleanName(s.name), url: `${site.url}/vyrobnyky/${s.slug}`, ...(place ? { homeLocation: { '@type': 'Place', address: place } } : {}) }
    : { '@type': 'LocalBusiness', name: cleanName(s.name), url: `${site.url}/vyrobnyky/${s.slug}`, ...(place ? { address: place } : {}) }
}

export const ldItemList = (name: string, studios: StudioCard[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: studios.length,
  itemListElement: studios.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: ldStudio(s) })),
})
