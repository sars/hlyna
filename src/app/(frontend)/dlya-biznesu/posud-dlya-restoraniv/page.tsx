import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { StudioCard } from '@/components/site/StudioCard'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { verses } from '@/content/verses'
import { getAllStudios, groupByCity, igHandle, pluralUk, TYPE_LABEL, worksWithVenues } from '@/lib/catalog'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Посуд ручної роботи для ресторанів і кав’ярень від українських студій',
  description:
    'Українські керамічні студії, які роблять посуд для ресторанів, кав’ярень і готелів: хто вони, де працюють, як замовити партію, терміни 3–8 тижнів. Один запит — пропозиції від кількох студій.',
  alternates: { canonical: '/dlya-biznesu/posud-dlya-restoraniv' },
  openGraph: { images: ogImage({ title: 'Посуд ручної роботи для ресторанів і кав’ярень', kicker: 'Для бізнесу', sub: 'Українські студії, терміни 3–8 тижнів', img: 'restaurant-table' }) },
}

const checklist = [
  ['Зразок до партії', 'Попросіть 1–3 вироби з тієї ж глини й поливи (глазурі), що й уся партія. Так ви побачите колір, вагу і край ще до оплати.'],
  ['Харчова полива', 'Уточніть, що полива харчова і без свинцю. Добросовісна студія скаже, яку глазур використовує.'],
  ['Посудомийка і мікрохвильовка', 'Ручний посуд буває різним: щільний черепок (випалений матеріал) витримує щоденне миття, пористий — гірше.'],
  ['Дозамовлення', 'Спитайте, чи зможе студія зробити ту саму тарілку через пів року. Кожна партія трохи відрізняється, і це варто обговорити заздалегідь.'],
  ['Терміни', `Зазвичай ${site.prices.batchLeadTime}: формування, сушіння, два випали. До відкриття закладу закладайте запас.`],
  ['Доставка і бій', 'Як пакують і хто відповідає за бій у дорозі — краще домовитися письмово.'],
]

const faq = [
  { q: 'Скільки коштує посуд ручної роботи для ресторану?', a: 'Ціну рахують під замовлення: вона залежить від виробу, розміру, поливи, кількості й терміну. Надішліть запит із кількістю і бюджетом за штуку — студії відповідять пропозиціями.' },
  { q: 'Яка мінімальна партія?', a: 'Залежить від студії та виробу: одні беруть і невеликі замовлення, інші працюють з більшими партіями. Умови кожної студії — у профілі або у відповіді на запит.' },
  { q: 'Скільки часу займає виготовлення?', a: `Зазвичай ${site.prices.batchLeadTime}. Перед відкриттям закладу чи святковим сезоном замовляйте заздалегідь.` },
  { q: 'Скільки коштує ваш сервіс?', a: site.model },
]

export default async function HorecaTablewarePage() {
  const studios = (await getAllStudios()).filter(worksWithVenues)
  const cities = groupByCity(studios)
  const sorted = [...studios].sort((a, b) => (b.prices?.length ?? 0) - (a.prices?.length ?? 0))

  return (
    <main className={`${container} grid gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Посуд ручної роботи для ресторанів: українські студії', itemListElement: sorted.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/vyrobnyky/${s.slug}`, name: s.name })) }} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <div className="grid gap-4">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Для бізнесу', href: '/dlya-biznesu' }, { label: 'Посуд для ресторанів' }]} />
          <span className="kicker">Для ресторанів, кав’ярень і готелів</span>
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Посуд ручної роботи для ресторанів і кав’ярень</h1>
          <p className="m-0 max-w-[70ch] text-lg">
            У каталозі — {studios.length} {pluralUk(studios.length, ['українська студія чи майстер', 'українські студії й майстри', 'українських студій і майстрів'])} у {cities.length} містах, які згадують роботу із закладами або посуд на замовлення. Мінімальна партія залежить від студії, виготовлення зазвичай займає {site.prices.batchLeadTime}. Нижче — студії, що варто перевірити перед замовленням, і запит одразу кільком.
          </p>
          <Updated />
        </div>
        <Image src="/images/stock/restaurant-table.jpg" alt="Керамічні тарілки на столі ресторану" width={1400} height={933} priority sizes="(min-width:1024px) 520px, 100vw" className="aspect-[16/10] w-full rounded-[26px] object-cover" />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid gap-10">
          <Epigraph lines={verses.horeca} />

          <section aria-labelledby="check">
            <SectionHead kicker="Перед замовленням" title="Що перевірити у студії" id="check" />
            <ol className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
              {checklist.map(([t, d], i) => (
                <li key={t} className="grid gap-1 rounded-2xl bg-card p-4">
                  <span className="font-display text-sm text-terra">{i + 1}</span>
                  <b>{t}</b>
                  <span className="text-[15px] text-umber">{d}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="list">
            <SectionHead title="Студії, які працюють із закладами" id="list">
              <p className="m-0 text-sm text-umber">Список за відкритими даними студій (сайти, Instagram, медіа). Умови для бізнесу кожна студія підтверджує у відповіді на запит.</p>
            </SectionHead>
            <div className="overflow-x-auto rounded-2xl bg-card">
              <table className="w-full min-w-[560px] border-collapse text-[14.5px]">
                <thead>
                  <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                    <th className="border-b border-line px-3.5 py-3">Назва</th>
                    <th className="border-b border-line px-3.5 py-3">Місто</th>
                    <th className="border-b border-line px-3.5 py-3">Тип</th>
                    <th className="border-b border-line px-3.5 py-3">Instagram</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => (
                    <tr key={s.id}>
                      <td className="border-b border-line px-3.5 py-3"><Link href={`/vyrobnyky/${s.slug}`}>{s.name}</Link></td>
                      <td className="border-b border-line px-3.5 py-3">{s.cityDoc?.name ?? '—'}</td>
                      <td className="border-b border-line px-3.5 py-3">{TYPE_LABEL[s.type ?? 'other']}</td>
                      <td className="border-b border-line px-3.5 py-3">{s.instagram ? <a href={s.instagram} target="_blank" rel="noopener nofollow">@{igHandle(s.instagram)}</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="cards">
            <SectionHead title="Профілі" id="cards" />
            <div className="grid gap-3 sm:grid-cols-2">{sorted.slice(0, 12).map((s) => <StudioCard key={s.id} s={s} />)}</div>
          </section>

          <section aria-labelledby="faq">
            <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
            <div className="grid gap-2.5">
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
                  <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">{f.q}<span aria-hidden className="font-display text-terra group-open:hidden">+</span><span aria-hidden className="font-display hidden text-terra group-open:inline">–</span></summary>
                  <p className="mt-0 mb-3.5">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <RequestForm sourcePage="/dlya-biznesu/posud-dlya-restoraniv" />
        </aside>
      </div>
    </main>
  )
}
