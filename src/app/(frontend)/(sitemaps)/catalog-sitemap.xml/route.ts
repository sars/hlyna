import { getServerSideSitemap } from 'next-sitemap'

import { site } from '@/content/site'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses } from '@/lib/catalog'

// Every public catalogue page: hubs, master-class cities and studio profiles.
export const revalidate = 3600

const HUBS = ['/', '/zapyt', '/maister-klasy', '/vyrobnyky', '/dlya-biznesu', '/dlya-biznesu/posud-dlya-restoraniv', '/llms.txt']

export async function GET() {
  const studios = await getAllStudios()
  const now = new Date().toISOString()
  const cities = groupByCity(studios.filter(offersMasterClasses)).filter((g) => g.studios.length >= MIN_LIST)
  return getServerSideSitemap([
    ...HUBS.map((p) => ({ loc: site.url + p, lastmod: now })),
    ...cities.map((g) => ({ loc: `${site.url}/maister-klasy/${g.city.slug}`, lastmod: now })),
    ...studios.map((s) => ({ loc: `${site.url}/vyrobnyky/${s.slug}`, lastmod: s.updatedAt || now })),
  ])
}
