import { aboutPage, guides, studioPage } from '@/content/guides'
import { liveWrittenPages } from '@/editorial/registry'
import { site } from '@/content/site'
import { topicList } from '@/content/topics'
import { cityPages, getAllStudios, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { makerCities } from '@/lib/makers'
import { pageName } from '@/lib/present'
import { priceIndex } from '@/lib/priceIndex'
import { certificateCities, topicData } from '@/editorial/topics'

// llms.txt: a plain-text map of the site for AI assistants (https://llmstxt.org).
// Only existing pages, each with its factual lead (live counts), so assistants can cite them.
export const revalidate = 86400

export async function GET() {
  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Мова: українська. Дані оновлено: ${site.dataUpdated} (${site.contentUpdated}).`,
    'Одна студія може бути на кількох сторінках форматів (гончарне коло, ліплення, для дітей…), тож суми за форматами більші за кількість студій у місті.',
    '',
    '## Як працює сервіс',
    site.model,
    'Замовник надсилає один запит; ми передаємо його 3–5 студіям, які роблять такі вироби; студії відповідають напряму.',
    '',
  ]
  const { stats, studios: priced } = await priceIndex()
  lines.push(`## Ціни 2026 (за прайсами ${priced} ${pluralUk(priced, ['студії', 'студій', 'студій'])}; «здебільшого» = 10–90-й перцентиль)`)
  for (const x of stats) lines.push(`- ${x.cat.label}, ${x.cat.unit}: здебільшого ${x.p10}–${x.p90} грн, медіана ${x.median} грн (${x.n} ${pluralUk(x.n, ['студія', 'студії', 'студій'])})`)
  lines.push(`- Партія посуду на замовлення: зазвичай ${site.lead.batch}; з логотипом — ${site.lead.logo} (${site.lead.logoDetail}); окрема річ на замовлення — ${site.lead.customItem}; забрати виріб після майстер-класу — через ${site.lead.pickup}.`, `- Докладно: ${site.url}/tsiny-2026`, '')
  const section = async (title: string, kinds: string[], extra: string[] = []) => {
    lines.push(`## ${title}`)
    for (const t of topicList.filter((x) => kinds.includes(x.section))) lines.push(`- [${t.h1}](${site.url}${t.path}): ${t.lead((await topicData(t)).ctx)}`)
    lines.push(...extra, '')
  }
  await section('Для бізнесу', ['biz'])
  const mkCities = cityPages((await getAllStudios()).filter(offersMasterClasses))
  await section('Майстер-класи', ['mk'], mkCities.map((g) => `- [Майстер-класи з кераміки: ${pageName(g)}](${site.url}/maister-klasy/${g.city.slug}): ${g.studios.length} ${pluralUk(g.studios.length, ['місце', 'місця', 'місць'])}`))
  await section('Подарункові сертифікати', ['cert'], (await certificateCities()).map((c) => `- [Сертифікати на гончарство: ${c.name}](${site.url}/sertyfikaty/${c.slug})`))
  await section('Вироби', ['makers'])
  lines.push('## Виробники за містами', ...(await makerCities()).map((g) => `- [Кераміка ручної роботи: ${pageName(g)}](${site.url}/vyrobnyky/misto/${g.city.slug}): ${g.studios.length} студій, брендів і майстрів`), '')
  const written = await liveWrittenPages()
  const wave = written.filter((w) => w.section !== 'keysy')
  const cases = written.filter((w) => w.section === 'keysy')
  if (wave.length) lines.push('## Детальні добірки', ...wave.map((w) => `- [${w.title}](${site.url}${w.path}): ${w.summary}`), '')
  if (cases.length) lines.push('## Кейси студій (за відкритими джерелами, з датою перевірки)', ...cases.map((w) => `- [${w.title}](${site.url}${w.path}): ${w.summary}`), '')
  lines.push('## Гайди', ...guides.map((g) => `- [${g.h1}](${site.url}${g.path}): ${g.short}`), '')
  lines.push('## Добірки', `- [Сучасні українські керамісти](${site.url}/dobirky/suchasni-keramisty): бренди, авторки й автори, студії за відкритими даними (не рейтинг)`, `- [Косів і Опішне сьогодні](${site.url}/dobirky/kosiv-i-opishne): хто працює з глиною в двох гончарних осередках`, '')
  lines.push('## Для студій', `- [${studioPage.h1}](${site.url}${studioPage.path}): ${studioPage.short}`, '')
  lines.push('## Про проєкт', `- [${aboutPage.h1}](${site.url}${aboutPage.path}): ${aboutPage.short}`, '')
  lines.push('## Каталог', `- [Усі студії, бренди й майстри](${site.url}/vyrobnyky): профілі з містом, послугами, цінами й посиланнями`, `- [Мапа студій](${site.url}/mapa): інтерактивна мапа з фільтрами за форматами (дані: ${site.url}/mapa/studios.geojson)`, `- Карта сайту: ${site.url}/catalog-sitemap.xml`)
  lines.push('', `Надіслати запит: ${site.url}/zapyt`)
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
