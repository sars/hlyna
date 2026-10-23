import { site } from '@/content/site'
import { getShopItems } from '@/lib/shopData'
import { ITEM_CATEGORY_LABEL } from '@/shared/options'

// Google Merchant Center product feed (RSS 2.0 with the g: namespace; research/seo-llm.md §2): every listed, priced item
// of a partner studio; sold-out ones are left out. The same file serves any program that reads the Google spec.
export const revalidate = 3600

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const availability = (state: string) => (state === 'to_order' ? 'preorder' : state === 'reserved' ? 'out_of_stock' : 'in_stock')

export async function GET() {
  const items = (await getShopItems()).filter((i) => i.state !== 'sold' && i.priceMin)
  const entries = items
    .map((i) => {
      const desc = (i.description ?? '').split(/\n{2,}/)[0] || `${i.title} — кераміка ручної роботи студії «${i.studio.name}».`
      const photos = i.photos.map((p) => `${site.url}${p.url}`)
      return [
        '<item>',
        `<g:id>${esc(`${i.studio.slug}/${i.slug}`)}</g:id>`,
        `<g:title>${esc(`${i.title} — ${i.studio.name}`)}</g:title>`,
        `<g:description>${esc(desc)}</g:description>`,
        `<g:link>${esc(`${site.url}${i.path}`)}</g:link>`,
        ...(photos[0] ? [`<g:image_link>${esc(photos[0])}</g:image_link>`] : []),
        ...photos.slice(1, 10).map((p) => `<g:additional_image_link>${esc(p)}</g:additional_image_link>`),
        `<g:availability>${availability(i.state)}</g:availability>`,
        `<g:price>${i.priceMin!.toFixed(2)} UAH</g:price>`,
        `<g:brand>${esc(i.studio.name)}</g:brand>`,
        `<g:condition>new</g:condition>`,
        `<g:product_type>${esc(ITEM_CATEGORY_LABEL[i.category])}</g:product_type>`,
        `<g:identifier_exists>no</g:identifier_exists>`,
        `<g:shipping><g:country>UA</g:country><g:service>Нова пошта</g:service></g:shipping>`,
        '</item>',
      ].join('')
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>${esc(`${site.name} · Крамниця`)}</title>\n<link>${site.url}/kramnytsia</link>\n<description>${esc('Вироби українських керамічних студій: відправляє сама майстерня, ціни студій.')}</description>\n${entries}\n</channel>\n</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
