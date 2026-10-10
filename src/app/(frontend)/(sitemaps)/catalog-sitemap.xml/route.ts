import { getServerSideSitemap } from 'next-sitemap'

import { site } from '@/content/site'
import { topicList } from '@/content/topics'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses } from '@/lib/catalog'
import { certificateCities } from '@/lib/topics'

// Every public catalogue page: hubs, topic pages, master-class and certificate cities, studio profiles.
export const revalidate = 3600

const HUBS = ['/', '/zapyt', '/maister-klasy', '/vyrobnyky', '/dlya-biznesu', '/dlya-biznesu/posud-dlya-restoraniv', '/llms.txt']

export async function GET() {
  const studios = await getAllStudios()
  const now = new Date().toISOString()
  const cities = groupByCity(studios.filter(offersMasterClasses)).filter((g) => g.studios.length >= MIN_LIST)
  return getServerSideSitemap([
    ...HUBS.map((p) => ({ loc: site.url + p, lastmod: now })),
    ...topicList.map((t) => ({ loc: site.url + t.path, lastmod: now })),
    ...(await certificateCities()).map((c) => ({ loc: `${site.url}/sertyfikaty/${c.slug}`, lastmod: now })),
    ...cities.map((g) => ({ loc: `${site.url}/maister-klasy/${g.city.slug}`, lastmod: now })),
    ...studios.map((s) => ({ loc: `${site.url}/vyrobnyky/${s.slug}`, lastmod: s.updatedAt || now })),
  ])
}
