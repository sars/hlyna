import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { mainNav } from '@/content/navigation'
import { facts } from '@/lib/facts'
import { site } from '@/content/site'
import { verses } from '@/content/verses'
import { getAllStudios, groupByCity, hasFormat, pluralUk, TYPE_LABEL, worksWithCompanies, worksWithVenues, type StudioCard } from '@/lib/catalog'
import { cleanName, stripPersonal } from '@/lib/present'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи для бізнесу: посуд для закладів, подарунки, корпоративи',
  description: 'Посуд для ресторанів, кав’ярень і готелів, чашки з логотипом, корпоративні подарунки й корпоративи з ліплення з глини від українських студій. Терміни, ціни, хто працює з бізнесом. Один запит — пропозиції від кількох студій.',
  alternates: { canonical: '/dlya-biznesu' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи для бізнесу', kicker: 'Для бізнесу', sub: 'Посуд для закладів, чашки з логотипом, подарунки, корпоративи', img: 'restaurant-table' }) },
}

const faqFor = (corporate: string) => [
  { q: 'Яка мінімальна партія посуду чи чашок?', a: 'Залежить від студії та виробу: одні беруть і кілька штук, інші працюють з більшими партіями. Умови кожної студії — у її профілі або у відповіді на запит.' },
  { q: 'Скільки часу займає виготовлення партії?', a: `Зазвичай ${site.lead.batch}: формування, сушіння і два випали. Для чашок з логотипом — ${site.lead.logoDetail}.` },
  { q: 'Чи можна мити такий посуд у посудомийці?', a: 'Залежить від глини, поливи й температури випалу. Перед партією попросіть у студії зразок і спитайте про харчову поливу без свинцю та посудомийку.' },
  { q: 'Скільки коштує корпоратив з ліплення з глини?', a: `У прайсах студій — ${corporate}; ціна залежить від кількості людей, формату і місця.` },
  { q: 'Скільки коштує ваш сервіс?', a: site.model },
]

// Studios with the most to show a business buyer: business tags, then prices, then Instagram.
const bizScore = (s: StudioCard) =>
  (hasFormat(s, 'horeca') ? 2 : 0) + (hasFormat(s, 'logo') ? 2 : 0) + (hasFormat(s, 'corporate-gifts') ? 1 : 0) + (s.prices?.length ? 1 : 0) + (s.instagram ? 1 : 0)

const what = (s: StudioCard) =>
  [hasFormat(s, 'horeca') && 'посуд для закладів', hasFormat(s, 'logo') && 'логотип і персоналізація', hasFormat(s, 'corporate-gifts') && 'корпоративні подарунки', hasFormat(s, 'corporate-workshop') && 'корпоративи']
    .filter(Boolean)
    .join(' · ')

export default async function BusinessIndex() {
  const faq = faqFor((await facts()).range('corporate'))
  const biz = mainNav.find((s) => s.id === 'biz')!
  const all = (await getAllStudios()).filter((s) => worksWithVenues(s) || worksWithCompanies(s))
  const top = [...all].filter((s) => s.type !== 'school').sort((a, b) => bizScore(b) - bizScore(a) || a.name.localeCompare(b.name, 'uk')).slice(0, 8)
  const cities = groupByCity(all).length

  return (
    <main className={`${container} grid grid-cols-1 items-start gap-10 pt-8 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Українські керамічні студії, які працюють з бізнесом',
          numberOfItems: top.length,
          itemListElement: top.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: { '@type': 'LocalBusiness', name: cleanName(s.name), url: `${site.url}/vyrobnyky/${s.slug}`, ...(s.cityDoc ? { address: { '@type': 'PostalAddress', addressLocality: s.cityDoc.name, addressCountry: 'UA' } } : {}) },
          })),
        }}
      />
      <div className="grid grid-cols-1 gap-10">
        <div className="grid grid-cols-1 gap-4">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Для бізнесу' }]} />
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи для бізнесу</h1>
          <p className="m-0 max-w-[70ch] text-lg">
            У каталозі — {fmt(all.length)} {pluralUk(all.length, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])} у {fmt(cities)} {pluralUk(cities, ['місті', 'містах', 'містах'])}, які роблять посуд для ресторанів, кав’ярень і готелів, чашки з логотипом і подарунки для команд або проводять корпоративи з ліплення з глини. Партію зазвичай виготовляють {site.lead.batch}; корпоратив коштує {(await facts()).range('corporate')}. {site.model}
          </p>
          <Updated />
          <Epigraph lines={verses.business} />
        </div>
        {biz.columns.map((c) => (
          <section key={c.title} className="grid grid-cols-1 gap-3">
            <p className="kicker m-0">{c.title}</p>
            <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2">
              {c.links.map((l) => (
                <li key={l.href} className="sm:[&:last-child:nth-child(odd)]:col-span-2">
                  <Link href={l.href} className="grid grid-cols-1 h-full gap-1 rounded-2xl bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                    <b>{l.label}</b>
                    {l.note && <span className="text-sm text-umber">{l.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="top">
          <SectionHead kicker="Хто працює з бізнесом" title="Студії, з яких варто почати" id="top">
            <p className="m-0 text-sm text-umber">За відкритими даними: заклади, логотип, корпоративні подарунки. Умови кожна студія підтверджує у відповіді на запит.</p>
          </SectionHead>
          <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2">
            {top.map((s) => (
              <li key={s.id}>
                <Link href={`/vyrobnyky/${s.slug}`} className="grid grid-cols-1 h-full content-start gap-1.5 rounded-[18px] bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                  <span className="text-[12px] font-bold text-umber">{[TYPE_LABEL[s.type ?? 'other'], s.cityDoc?.name].filter(Boolean).join(' · ')}</span>
                  <span className="text-[16.5px] leading-snug font-semibold">{cleanName(s.name)}</span>
                  <span className="text-sm text-terra">{what(s)}</span>
                  {s.summary && <span className="line-clamp-2 text-sm text-umber">{stripPersonal(s.summary)}</span>}
                </Link>
              </li>
            ))}
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
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <RequestForm sourcePage="/dlya-biznesu" />
      </aside>
    </main>
  )
}
