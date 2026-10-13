import type { Metadata } from 'next'
import { Block, HeroRequest, InnerHero, InnerMain, RequestBand } from '@/components/site/Inner'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { DataTable } from '@/components/ui/DataTable'
import { Faq } from '@/components/ui/Faq'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { sitePhotos } from '@/content/photos'
import { site } from '@/content/site'
import { pluralUk } from '@/lib/catalog'
import { displayName } from '@/lib/present'
import { priceIndex, type CategoryStats } from '@/lib/priceIndex'
import { ogImage } from '@/lib/ogImage'
import { fmt } from '@/lib/money'

export const revalidate = 86400

// The aggregated figures are ours to license: anyone may reuse them with a link back (docs/decisions.md, 2026-10-13).
const LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
const grn = (n: number) => `${fmt(n)} грн`
const span = (s: CategoryStats) => (s.p10 === s.p90 ? grn(s.median) : `${fmt(s.p10)}–${grn(s.p90)}`)
const studiosN = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія', 'студії', 'студій'])}`

export async function generateMetadata(): Promise<Metadata> {
  const { stats } = await priceIndex()
  const g = stats.find((s) => s.cat.key === 'group')
  return {
    title: 'Ціни на кераміку ручної роботи і майстер-класи 2026',
    description: `Скільки коштують майстер-класи з кераміки, сертифікати, корпоративи, чашки й тарілки ручної роботи в Україні в 2026 році${g ? `: майстер-клас — здебільшого ${span(g)} з особи` : ''}. Медіани й діапазони за прайсами студій, за містами.`,
    alternates: { canonical: '/tsiny-2026' },
    openGraph: { images: ogImage({ title: 'Ціни на кераміку і майстер-класи 2026', kicker: 'Індекс цін', sub: 'Медіани й діапазони за прайсами студій, за містами' }) },
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

  const priceCell = (v: React.ReactNode) => <span className="font-display font-semibold text-cobalt">{v}</span>
  return (
    <InnerMain>
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
          license: LICENSE,
          variableMeasured: stats.map((s) => ({ '@type': 'PropertyValue', name: `${s.cat.label}, ${s.cat.unit}`, unitText: 'UAH', value: s.median, minValue: s.p10, maxValue: s.p90 })),
        }}
      />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Ціни 2026' }]}
        kicker={`Індекс цін · ${site.dataUpdated}`}
        title="Ціни на кераміку ручної роботи і майстер-класи в Україні — 2026"
        lead={
          <p className="m-0">
                      За прайсами {studiosN(studios)} з каталогу «Глина»
          {g ? `: разовий майстер-клас з кераміки найчастіше коштує ${span(g)} з особи (медіана ${grn(g.median)})` : ''}
          {p ? `, індивідуальне заняття — ${span(p)}` : ''}
          {c ? `, для двох — ${span(c)} за пару` : ''}
          {corp ? `; корпоратив — ${span(corp)} з особи` : ''}
          {cup ? `; чашка ручної роботи — ${span(cup)}` : ''}. Нижче — усі категорії, ціни за містами й як ми рахуємо.
          </p>
        }
        strip={[
          { value: fmt(studios), label: 'студій у вибірці прайсів' },
          { value: fmt(stats.length), label: 'категорій цін' },
          { value: fmt(cities.length), label: 'міст з ціною майстер-класу' },
        ]}
        actions={<HeroRequest path="/tsiny-2026" />}
        photo={sitePhotos.market}
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Block id="table" kicker="Зведена таблиця" title="Скільки коштує" note={<>«Здебільшого» — від 10-го до 90-го перцентиля цін студій; медіана — середина вибірки. Кожна студія рахується один раз.</>}>
          {groups.map(([title, key]) => {
            const rows = stats.filter((s) => s.cat.group === key)
            if (!rows.length) return null
            return (
              <div key={key} className="grid gap-2">
                <h3 className="m-0 font-display text-[17px] leading-[1.15] font-semibold">{title}</h3>
                <DataTable
                  mode="stack"
                  columns={[{ key: 'what', label: 'Що', width: '44%' }, { key: 'median', label: 'Медіана', numeric: true, width: '18%' }, { key: 'range', label: 'Здебільшого', numeric: true, width: '24%' }, { key: 'n', label: 'Студій', numeric: true, align: 'end', width: '14%' }]}
                  rows={rows.map((s) => ({
                    what: (
                      <>
                        <a href={`#${s.cat.key}`} className="!text-ink !no-underline">
                          {s.cat.label}
                        </a>{' '}
                        <span className="text-[13px] text-ink-2">{s.cat.unit}</span>
                      </>
                    ),
                    median: priceCell(grn(s.median)),
                    range: span(s),
                    n: s.n,
                  }))}
                />
              </div>
            )
          })}
        </Block>

        <RequestBand path="/tsiny-2026" tone="cobalt" />

        {cities.length > 0 && (
          <section id="maister-klasy" aria-labelledby="cities">
            <Block id="cities" kicker="За містами" title="Разовий майстер-клас за містами" note={<>Медіана ціни з особи в містах, де ціну публікують щонайменше три студії.</>}>
              <DataTable
                mode="stack"
                columns={[{ key: 'city', label: 'Місто', width: '44%' }, { key: 'median', label: 'Медіана', numeric: true, width: '18%' }, { key: 'range', label: 'Від–до', numeric: true, width: '24%' }, { key: 'n', label: 'Студій', numeric: true, align: 'end', width: '14%' }]}
                rows={cities.map((x) => ({
                  city: <Link href={`/maister-klasy/${x.slug}`}>{x.name}</Link>,
                  median: priceCell(grn(x.median)),
                  range: x.min === x.max ? grn(x.min) : `${fmt(x.min)}–${grn(x.max)}`,
                  n: x.n,
                }))}
              />
            </Block>
          </section>
        )}

        <Block id="examples" kicker="Приклади" title="Типові рядки з прайсів" note={<>Для кожної категорії — студії, чиї ціни найближчі до медіани.</>}>
          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
            {stats.map((s) => (
              <div key={s.cat.key} id={s.cat.key} className="grid content-start gap-1">
                <b className="font-display text-[15.5px] leading-[1.2] font-semibold">
                  {s.cat.label} <span className="font-body font-normal text-ink-2">· медіана {grn(s.median)} {s.cat.unit}</span>
                </b>
                <ul className="m-0 grid list-none border-t border-rule p-0 text-[14.5px] leading-normal">
                  {s.examples.map((e) => (
                    <li key={e.studio.id + e.text} className="border-b border-rule py-2">
                      <Link href={`/vyrobnyky/${e.studio.slug}`} className="text-cobalt underline underline-offset-[3px]">
                        {displayName(e.studio)}
                      </Link>
                      {e.studio.cityDoc && <span className="text-ink-2"> · {e.studio.cityDoc.name}</span>}: {e.text}
                      {e.source && <span className="font-mono text-[11.5px] text-ink-2"> ({e.source})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Block>

        <section id="metodolohiya" aria-labelledby="method">
          <Block id="method" kicker="Методологія" title="Як ми рахуємо">
            <ul className="m-0 grid max-w-read list-none gap-2 p-0">
              <li key={0} className="before:text-terracotta-text before:content-['—_']">Джерело — опубліковані прайси студій: сайти, Instagram, сервіси бронювання й подарунків, маркетплейси. Ціни за {period} роки; старші за 2023 рік не враховуємо.</li>
              <li key={1} className="before:text-terracotta-text before:content-['—_']">Для кожної студії в кожній категорії береться медіана її цін, тож студія з двадцятьма рядками прайсу важить як одна. Категорія показується, коли в ній щонайменше три студії.</li>
              <li key={2} className="before:text-terracotta-text before:content-['—_']">«Здебільшого» — від 10-го до 90-го перцентиля; крайні значення відкидаємо. Суми округлено до 50 чи 100 грн.</li>
              <li key={3} className="before:text-terracotta-text before:content-['—_']">Ціни для бізнесу (партії, логотип) студії рахують під замовлення, тому тут — лише роздрібні ціни окремих виробів і корпоративи з особи.</li>
              <li key={4} className="before:text-terracotta-text before:content-['—_']">Дані оновлюємо щосезону; поточний зріз — {site.dataUpdated}. Ціни встановлюють студії, і вони можуть змінитися — точну ціну підтверджує студія.</li>
              <li key={5} className="before:text-terracotta-text before:content-['—_']">
                Зведені цифри цієї сторінки можна вільно передруковувати й цитувати за ліцензією{' '}
                <a href={LICENSE} target="_blank" rel="noopener license">CC BY 4.0</a> з посиланням на «Глину».
              </li>
            </ul>
          </Block>
        </section>

        <Faq id="faq" kicker="Питання і відповіді" title="Часті питання" items={faq} openFirst jsonLd={false} />

        <ChipGroup as="nav" label="Дивіться також" aria-label="Схожі сторінки">
          {[['Майстер-класи за містами', '/maister-klasy'], ['Сертифікати', '/sertyfikaty'], ['Корпоратив з ліплення з глини', '/dlya-biznesu/korporatyv-lipennya-z-hlyny'], ['Чашки з логотипом', '/dlya-biznesu/chashky-z-lohotypom'], ['Вироби', '/vyrobnyky/vyrib']].map(([l, h]) => (
            <Chip key={h} href={h}>
              {l}
            </Chip>
          ))}
        </ChipGroup>
        <RequestBand path="/tsiny-2026" tone="ink" />
      </div>
      <MobileRequestBar />
    </InnerMain>
  )
}
