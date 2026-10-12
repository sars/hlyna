import { site } from '@/content/site'

// Sitemap index: the catalogue sitemap is the only one (search engines were given /catalog-sitemap.xml directly too).
export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${site.url}/catalog-sitemap.xml</loc></sitemap>\n</sitemapindex>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
