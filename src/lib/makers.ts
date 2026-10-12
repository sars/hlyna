import { getAllStudios, getAllWithShops, groupByCity, isStudio, MIN_LIST, offersMasterClasses, worksWithVenues, type StudioCard } from './catalog'

// Everyone in the studio lists except suppliers (hidden for now): studios, brands, makers, schools. Shops and galleries are not
// studios: they have their own block on a city page (getShops).
const listed = (s: StudioCard) => s.type !== 'supplier'

// Cities with at least MIN_LIST makers get /vyrobnyky/misto/<city> (no thin pages).
export async function makerCities() {
  return groupByCity((await getAllStudios()).filter(listed)).filter((g) => g.studios.length >= MIN_LIST)
}

/**
 * A city page that was live but fell under the minimum because its entries are shops or legacy pages (museums, traditions):
 * where to send its old URL. Exactly one legacy profile in the city → that profile, else the cities index. Null when this
 * is not such a city (the page is then a plain 404).
 */
export async function droppedCityTarget(slug: string): Promise<string | null> {
  const inCity = (await getAllWithShops()).filter((s) => s.cityDoc?.slug === slug)
  if (!inCity.some((s) => !isStudio(s))) return null
  const legacy = inCity.filter((s) => s.type === 'legacy')
  return legacy.length === 1 ? `/vyrobnyky/${legacy[0].slug}` : '/vyrobnyky/misto'
}

export async function makerCity(slug: string) {
  return (await makerCities()).find((g) => g.city.slug === slug) ?? null
}

// Sections of a city page, in the order buyers look: who makes, then who teaches, then who sells.
export const TYPE_GROUPS: { title: string; types: string[] }[] = [
  { title: 'Студії', types: ['studio'] },
  { title: 'Бренди', types: ['brand'] },
  { title: 'Майстри й авторки', types: ['maker'] },
  { title: 'Традиційні майстерні', types: ['heritage'] },
  { title: 'Школи й курси', types: ['school'] },
  { title: 'Інші місця', types: ['other'] },
]

export const cityStats = (studios: StudioCard[]) => ({
  classes: studios.filter(offersMasterClasses).length,
  venues: studios.filter(worksWithVenues).length,
})
