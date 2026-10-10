import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { fmt, pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { priceIndex, type CategoryStats } from '@/lib/priceIndex'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

const grn = (n: number) => `${fmt(n)} грн`
const span = (s: CategoryStats) => (s.p10 === s.p90 ? grn(s.median) : `${fmt(s.p10)}–${grn(s.p90)}`)
const studiosN = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія', 'студії', 'студій'])}`

export async function generateMetadata(): Promise<Metadata> {
  const { stats } = await priceIndex()
  const g = stats.find((s) => s.cat.key === 'group')
  return {
    title: 'Ціни на кераміку ручної роботи і майстер-класи в Україні — 2026',
    description: `Скільки коштують майстер-класи з кераміки, сертифікати, корпоративи, чашки й тарілки ручної роботи в Україні в 2026 році${g ? `: майстер-клас — здебільшого ${span(g)} з особи` : ''}. Медіани й діапазони за прайсами студій, за містами.`,
    alternates: { canonical: '/tsiny-2026' },
    openGraph: { images: ogImage({ title: 'Ціни на кераміку і майстер-класи 2026', kicker: 'Індекс цін', sub: g ? `Майстер-клас: здебільшого ${span(g)} з особи` : 'За прайсами українських студій', pattern: 'tsiny' }) },
  }
}

export default async function PricesPage() {
  const { stats, cities, studios, years } = await priceIndex()
  const get = (k: string) => stats.find((s) => s.cat.key === k)
  const g = get('group'), p = get('private'), c = get('couple'), cert = get('cert'), corp = get('corporate'), cup = get('cup'), plate = get('plate')
  const period = years ? (years.from === years.to ? `${years.from}` : `${years.from}–${years.to}`) : '2023–2026'
  const groups: [string, CategoryStats['cat']['group']][] = [['Майстер-класи й навчання', 'mk'], ['Для компаній', 'biz'], ['Вироби в роздріб', 'retail']]

  const faq = [
    ...(g ? [{ q: 'Скільки коштує майстер-клас з кераміки в Україні?', a: `Разовий майстер-клас найчастіше коштує ${span(g)} з особи; медіана — ${grn(g.median)} (за прайсами ${studiosN(g.n)}, ${site.dataUpdated}).${p ? ` Індивідуальне заняття — здебільшого ${span(p)}.` : ''}` }] : []),
    ...(c ? [{ q: 'Скільки коштує гончарство для двох?', a: `Здебільшого ${span(c)} за двох; медіана — ${grn(c.median)} (${studiosN(c.n)}).` }] : []),
    ...(cert ? [{ q: 'Скільки коштує сертифікат на гончарство?', a: `Здебільшого ${span(cert)}; медіана — ${grn(cert.median)}. Ціна сертифіката зазвичай дорівнює ціні заняття.` }] : []),
    ...(corp ? [{ q: 'Скільки коштує корпоратив з ліплення з глини?', a: `Здебільшого ${span(corp)} з особи; медіана — ${grn(corp.median)} (${studiosN(corp.n)}). Для групи студія зазвичай рахує окрему пропозицію.` }] : []),
    ...(cup ? [{ q: 'Скільки коштує чашка ручної роботи?', a: `У роздрібних прайсах українських майстрів — здебільшого ${span(cup)}; медіана — ${grn(cup.median)}.${plate ? ` Тарілка, миска чи піала — здебільшого ${span(plate)}.` : ''}` }] : []),
    { q: 'Як рахуються ці ціни?', a: `З опублікованих прайсів студій (сайти, Instagram, сервіси бронювання й маркетплейси) за ${period} роки. Для кожної студії береться медіана її цін у категорії, тож студія з багатьма рядками прайсу важить як одна. Діапазон — від 10-го до 90-го перцентиля, округлений.` },
  ]

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Ціни на кераміку ручної роботи і майстер-класи в Україні, 2026',
          description: `Медіани й типові діапазони цін за прайсами ${studiosN(studios)} з каталогу «Глина».`,
          url: `${site.url}/tsiny-2026`,
          creator: { '@type': 'Organization', name: site.name, url: site.url },
          temporalCoverage: period.replace('–', '/'),
          spatialCoverage: { '@type': 'Place', name: 'Україна' },
          inLanguage: 'uk',
          variableMeasured: stats.map((s) => ({ '@type': 'PropertyValue', name: `${s.cat.label}, ${s.cat.unit}`, unitText: 'UAH', value: s.median, minValue: s.p10, maxValue: s.p90 })),
        }}
      />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Ціни 2026' }]} />
        <span className="kicker">Індекс цін · {site.dataUpdated}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Ціни на кераміку ручної роботи і майстер-класи в Україні — 2026</h1>
        <p className="m-0 max-w-[75ch] text-lg">
          За прайсами {studiosN(studios)} з каталогу «Глина»
          {g ? `: разовий майстер-клас з кераміки найчастіше коштує ${span(g)} з особи (медіана ${grn(g.median)})` : ''}
          {p ? `, індивідуальне заняття — ${span(p)}` : ''}
          {c ? `, для двох — ${span(c)} за пару` : ''}
          {corp ? `; корпоратив — ${span(corp)} з особи` : ''}
          {cup ? `; чашка ручної роботи — ${span(cup)}` : ''}. Нижче — усі категорії, ціни за містами й як ми рахуємо.
        </p>
        <Updated />
      </div>

      <section aria-labelledby="table">
        <SectionHead kicker="Зведена таблиця" title="Скільки коштує" id="table">
          <p className="m-0 text-sm text-umber">«Здебільшого» — від 10-го до 90-го перцентиля цін студій; медіана — середина вибірки. Кожна студія рахується один раз.</p>
        </SectionHead>
        <div className="grid grid-cols-1 gap-6">
          {groups.map(([title, key]) => {
            const rows = stats.filter((s) => s.cat.group === key)
            if (!rows.length) return null
            return (
              <div key={key} className="grid grid-cols-1 gap-2">
                <h3 className="h-display m-0 text-[17px]">{title}</h3>
                <div className="overflow-x-auto rounded-2xl bg-card">
                  <table className="w-full min-w-[520px] border-collapse text-[15px]">
                    <thead>
                      <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                        <th className="border-b border-line px-3.5 py-3">Що</th>
                        <th className="border-b border-line px-3.5 py-3">Здебільшого</th>
                        <th className="border-b border-line px-3.5 py-3">Медіана</th>
                        <th className="border-b border-line px-3.5 py-3 text-right">Студій</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.cat.key}>
                          <td className="border-b border-line px-3.5 py-3">
                            <a href={`#${s.cat.key}`} className="font-semibold text-ink no-underline">{s.cat.label}</a> <span className="text-[13px] text-umber">{s.cat.unit}</span>
                          </td>
                          <td className="border-b border-line px-3.5 py-3 whitespace-nowrap">{span(s)}</td>
                          <td className="border-b border-line px-3.5 py-3 font-semibold whitespace-nowrap text-terra">{grn(s.median)}</td>
                          <td className="border-b border-line px-3.5 py-3 text-right">{s.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {cities.length > 0 && (
        <section aria-labelledby="maister-klasy" id="maister-klasy" className="scroll-mt-24">
          <SectionHead kicker="За містами" title="Разовий майстер-клас за містами" id="cities">
            <p className="m-0 text-sm text-umber">Медіана ціни з особи в містах, де ціну публікують щонайменше три студії.</p>
          </SectionHead>
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full min-w-[440px] border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                  <th className="border-b border-line px-3.5 py-3">Місто</th>
                  <th className="border-b border-line px-3.5 py-3">Медіана</th>
                  <th className="border-b border-line px-3.5 py-3">Від–до</th>
                  <th className="border-b border-line px-3.5 py-3 text-right">Студій</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((x) => (
                  <tr key={x.slug}>
                    <td className="border-b border-line px-3.5 py-3"><Link href={`/maister-klasy/${x.slug}`}>{x.name}</Link></td>
                    <td className="border-b border-line px-3.5 py-3 font-semibold whitespace-nowrap text-terra">{grn(x.median)}</td>
                    <td className="border-b border-line px-3.5 py-3 whitespace-nowrap">{x.min === x.max ? grn(x.min) : `${fmt(x.min)}–${grn(x.max)}`}</td>
                    <td className="border-b border-line px-3.5 py-3 text-right">{x.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="examples">
        <SectionHead kicker="Приклади" title="Типові рядки з прайсів" id="examples">
          <p className="m-0 text-sm text-umber">Для кожної категорії — студії, чиї ціни найближчі до медіани.</p>
        </SectionHead>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {stats.map((s) => (
            <div key={s.cat.key} id={s.cat.key} className="grid scroll-mt-24 grid-cols-1 content-start gap-2 rounded-2xl bg-card p-4">
              <b>
                {s.cat.label} <span className="font-normal text-umber">· медіана {grn(s.median)} {s.cat.unit}</span>
              </b>
              <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 text-[14.5px]">
                {s.examples.map((e) => (
                  <li key={e.studio.id + e.text}>
                    <Link href={`/vyrobnyky/${e.studio.slug}`}>{cleanName(e.studio.name)}</Link>
                    {e.studio.cityDoc && <span className="text-umber"> · {e.studio.cityDoc.name}</span>}: {e.text}
                    {e.source && <span className="text-[12.5px] text-umber"> ({e.source})</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="metodolohiya" id="metodolohiya" className="scroll-mt-24">
        <SectionHead kicker="Методологія" title="Як ми рахуємо" id="method" />
        <ul className="m-0 grid max-w-[75ch] list-disc grid-cols-1 gap-2 pl-5">
          <li>Джерело — опубліковані прайси студій: сайти, Instagram, сервіси бронювання й подарунків, маркетплейси. Ціни за {period} роки; старші за 2023 рік не враховуємо.</li>
          <li>Для кожної студії в кожній категорії береться медіана її цін, тож студія з двадцятьма рядками прайсу важить як одна. Категорія показується, коли в ній щонайменше три студії.</li>
          <li>«Здебільшого» — від 10-го до 90-го перцентиля; крайні значення відкидаємо. Суми округлено до 50 чи 100 грн.</li>
          <li>Ціни для бізнесу (партії, логотип) студії рахують під замовлення, тому тут — лише роздрібні ціни окремих виробів і корпоративи з особи.</li>
          <li>Дані оновлюємо щосезону; поточний зріз — {site.dataUpdated}. Ціни встановлюють студії, і вони можуть змінитися — точну ціну підтверджує студія.</li>
        </ul>
      </section>

      <section aria-labelledby="faq">
        <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
        <div className="grid grid-cols-1 gap-2.5">
          {faq.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
              <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">
                {f.q}
                <span aria-hidden className="font-display text-terra group-open:hidden">+</span>
                <span aria-hidden className="font-display hidden text-terra group-open:inline">–</span>
              </summary>
              <p className="mt-0 mb-3.5">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <nav aria-label="Схожі сторінки" className="grid grid-cols-1 gap-3">
        <p className="kicker m-0">Дивіться також</p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {[['Майстер-класи за містами', '/maister-klasy'], ['Сертифікати', '/sertyfikaty'], ['Корпоратив з ліплення з глини', '/dlya-biznesu/korporatyv-lipennya-z-hlyny'], ['Чашки з логотипом', '/dlya-biznesu/chashky-z-lohotypom'], ['Вироби', '/vyrobnyky/vyrib']].map(([l, h]) => (
            <li key={h}><Link href={h} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">{l}</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
