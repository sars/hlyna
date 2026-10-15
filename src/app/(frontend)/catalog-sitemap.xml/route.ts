import { guides } from '@/content/guides'
import { site } from '@/content/site'
import { topicList } from '@/content/topics'
import { cityPages, getAllStudios, getCatalog, offersMasterClasses } from '@/lib/catalog'
import { makerCities } from '@/lib/makers'
import { certificateCities } from '@/editorial/topics'
import { liveWrittenPages } from '@/editorial/registry'

// Every public catalogue page: hubs, topic and product pages, master-class, certificate and maker cities, studio profiles.
export const revalidate = 3600

const HUBS = ['/', '/zapyt', '/maister-klasy', '/vyrobnyky', '/vyrobnyky/misto', '/vyrobnyky/vyrib', '/dlya-biznesu', '/tsiny-2026', '/hayidy', '/dlya-studiy', '/pro-nas', '/dobirky', '/dobirky/suchasni-keramisty', '/dobirky/kosiv-i-opishne', '/mapa', '/llms.txt']

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const urlset = (urls: { loc: string; lastmod: string }[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`

export async function GET() {
  const studios = await getAllStudios()
  // lastmod = when the data behind the page last changed, not the build time: the newest studio update for
  // catalogue pages, the content date for editorial pages (guides, selections, wave pages).
  const latest = (xs: { updatedAt?: string | null }[]) => xs.reduce((m, x) => (x.updatedAt && x.updatedAt > m ? x.updatedAt : m), site.contentUpdated)
  const now = latest(studios)
  const content = site.contentUpdated
  const cities = cityPages(studios.filter(offersMasterClasses))
  const xml = urlset([
    ...HUBS.map((p) => ({ loc: site.url + p, lastmod: now })),
    ...topicList.map((t) => ({ loc: site.url + t.path, lastmod: now })),
    ...guides.map((g) => ({ loc: site.url + g.path, lastmod: content })),
    ...(await liveWrittenPages()).map((p) => ({ loc: site.url + p.path, lastmod: content })),
    ...(await certificateCities()).map((c) => ({ loc: `${site.url}/sertyfikaty/${c.slug}`, lastmod: latest(studios.filter((s) => s.cityDoc?.slug === c.slug)) })),
    ...cities.map((g) => ({ loc: `${site.url}/maister-klasy/${g.city.slug}`, lastmod: latest(g.studios) })),
    ...(await makerCities()).map((g) => ({ loc: `${site.url}/vyrobnyky/misto/${g.city.slug}`, lastmod: latest(g.studios) })),
    ...(await getCatalog()).map((s) => ({ loc: `${site.url}/vyrobnyky/${s.slug}`, lastmod: s.updatedAt || content })),
  ])
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
