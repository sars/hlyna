import { getServerSideSitemap } from 'next-sitemap'

import { guides } from '@/content/guides'
import { site } from '@/content/site'
import { topicList } from '@/content/topics'
import { getAllStudios, getCatalog, groupByCity, MIN_LIST, offersMasterClasses } from '@/lib/catalog'
import { makerCities } from '@/lib/makers'
import { certificateCities } from '@/lib/topics'

// Every public catalogue page: hubs, topic and product pages, master-class, certificate and maker cities, studio profiles.
export const revalidate = 3600

const HUBS = ['/', '/zapyt', '/maister-klasy', '/vyrobnyky', '/vyrobnyky/misto', '/vyrobnyky/vyrib', '/dlya-biznesu', '/tsiny-2026', '/hayidy', '/dlya-studiy', '/dobirky', '/dobirky/suchasni-keramisty', '/dobirky/kosiv-i-opishne', '/mapa', '/llms.txt']

export async function GET() {
  const studios = await getAllStudios()
  const now = new Date().toISOString()
  const cities = groupByCity(studios.filter(offersMasterClasses)).filter((g) => g.studios.length >= MIN_LIST)
  return getServerSideSitemap([
    ...HUBS.map((p) => ({ loc: site.url + p, lastmod: now })),
    ...topicList.map((t) => ({ loc: site.url + t.path, lastmod: now })),
    ...guides.map((g) => ({ loc: site.url + g.path, lastmod: now })),
    ...(await certificateCities()).map((c) => ({ loc: `${site.url}/sertyfikaty/${c.slug}`, lastmod: now })),
    ...cities.map((g) => ({ loc: `${site.url}/maister-klasy/${g.city.slug}`, lastmod: now })),
    ...(await makerCities()).map((g) => ({ loc: `${site.url}/vyrobnyky/misto/${g.city.slug}`, lastmod: now })),
    ...(await getCatalog()).map((s) => ({ loc: `${site.url}/vyrobnyky/${s.slug}`, lastmod: s.updatedAt || now })),
  ])
}
