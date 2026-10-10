import { site } from '@/content/site'
import { topicList } from '@/content/topics'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { certificateCities, topicData } from '@/lib/topics'

// llms.txt: a plain-text map of the site for AI assistants (https://llmstxt.org).
// Only existing pages, each with its factual lead (live counts), so assistants can cite them.
export const revalidate = 3600

export async function GET() {
  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Мова: українська. Дані оновлено: ${site.dataUpdated}.`,
    '',
    '## Як працює сервіс',
    site.model,
    'Замовник надсилає один запит; ми передаємо його 3–5 студіям, які роблять такі вироби; студії відповідають напряму.',
    '',
    '## Типові ціни і терміни (2026)',
    `- Партія посуду ручної роботи: зазвичай ${site.prices.batchLeadTime}; мінімальна партія залежить від студії та виробу.`,
    `- Груповий майстер-клас з гончарства: ${site.prices.groupClass}.`,
    `- Індивідуальний майстер-клас: ${site.prices.privateClass}.`,
    `- Корпоратив з ліплення з глини: ${site.prices.corporate}.`,
    '',
  ]
  const section = async (title: string, kinds: string[], extra: string[] = []) => {
    lines.push(`## ${title}`)
    for (const t of topicList.filter((x) => kinds.includes(x.section))) lines.push(`- [${t.h1}](${site.url}${t.path}): ${t.lead((await topicData(t)).ctx)}`)
    lines.push(...extra, '')
  }
  await section('Для бізнесу', ['biz'], [`- [Посуд ручної роботи для ресторанів і кав’ярень](${site.url}/dlya-biznesu/posud-dlya-restoraniv)`])
  const mkCities = groupByCity((await getAllStudios()).filter(offersMasterClasses)).filter((g) => g.studios.length >= MIN_LIST)
  await section('Майстер-класи', ['mk'], mkCities.map((g) => `- [Майстер-класи з кераміки: ${g.city.name}](${site.url}/maister-klasy/${g.city.slug}): ${g.studios.length} ${pluralUk(g.studios.length, ['місце', 'місця', 'місць'])}`))
  await section('Подарункові сертифікати', ['cert'], (await certificateCities()).map((c) => `- [Сертифікати на гончарство: ${c.name}](${site.url}/sertyfikaty/${c.slug})`))
  lines.push('## Каталог', `- [Усі студії, бренди й майстри](${site.url}/vyrobnyky): профілі з містом, послугами, цінами й посиланнями`, `- Карта сайту: ${site.url}/catalog-sitemap.xml`)
  lines.push('', `Надіслати запит: ${site.url}/zapyt`)
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
