import { centreOf, cityPages, getAllStudios, getAllWithShops, getCities, isOpen, isStudio, confirmedForVenues, offersMasterClasses, type StudioCard } from './catalog'

// Everyone in the studio lists except suppliers (hidden for now): studios, brands, makers, schools. Shops and galleries are not
// studios: they have their own block on a city page (getShops).
const listed = (s: StudioCard) => s.type !== 'supplier'

// Who gets /vyrobnyky/misto/<city>: every oblast centre with a maker (its page covers the oblast) and any other town with
// MIN_LIST makers (cityPages).
export async function makerCities() {
  return cityPages((await getAllStudios()).filter(listed))
}

/** The same pages from the whole published catalogue (getCatalog's records), for code that has no page cache. */
export const makerCityPages = (catalog: StudioCard[]) => cityPages(catalog.filter((s) => isOpen(s) && isStudio(s) && listed(s)))

/**
 * Where a hidden profile's URL goes (its current and old slugs): the makers page of its city, else of its oblast centre,
 * else the cities index. A hidden profile was taken down on purpose (inactive, no contacts, out of scope); people and
 * crawlers who still arrive from search see the makers nearby instead of a 404 that Google keeps retrying.
 */
export function hiddenProfileTarget(city: { slug: string; oblast?: string | null } | null, pages: Set<string>): string {
  const centre = centreOf(city)
  const to = [city?.slug, centre].find((c) => c && pages.has(c))
  return to ? `/vyrobnyky/misto/${to}` : '/vyrobnyky/misto'
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

/**
 * A town whose page went because its makers were hidden or merged (Соснівка, 17.10.2026): its old URL goes to its oblast
 * centre's page, where those makers keep their lines in «Майстри, які працювали в місті». Null when the town is a centre
 * itself, has no oblast, or the centre has no page.
 */
export async function centreCityTarget(slug: string): Promise<string | null> {
  const centre = centreOf((await getCities()).find((c) => c.slug === slug))
  if (!centre || centre === slug) return null
  return (await makerCity(centre)) ? `/vyrobnyky/misto/${centre}` : null
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
  venues: studios.filter(confirmedForVenues).length,
})
