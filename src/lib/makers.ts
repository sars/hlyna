import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, worksWithVenues, type StudioCard } from './catalog'

// Everyone in the public catalogue except suppliers (hidden for now): studios, brands, makers, schools, shops.
const listed = (s: StudioCard) => s.type !== 'supplier'

// Cities with at least MIN_LIST makers get /vyrobnyky/misto/<city> (no thin pages).
export async function makerCities() {
  return groupByCity((await getAllStudios()).filter(listed)).filter((g) => g.studios.length >= MIN_LIST)
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
  { title: 'Магазини й галереї', types: ['shop', 'other'] },
]

export const cityStats = (studios: StudioCard[]) => ({
  classes: studios.filter(offersMasterClasses).length,
  venues: studios.filter(worksWithVenues).length,
})
