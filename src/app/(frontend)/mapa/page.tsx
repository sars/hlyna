import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { StudioMap } from '@/components/site/StudioMap.client'
import { site } from '@/content/site'
import { fmt, groupByCity, pluralUk, TYPE_LABEL } from '@/lib/catalog'
import { MAP_FILTERS, mapStudios } from '@/lib/mapData'
import { cleanName } from '@/lib/present'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Мапа керамічних студій України: майстер-класи, гончарне коло, посуд на замовлення',
  description: 'Інтерактивна мапа українських керамічних студій, брендів і майстрів: де пройти майстер-клас, спробувати гончарне коло, купити сертифікат чи замовити посуд для закладу. Фільтри за форматами.',
  alternates: { canonical: '/mapa' },
  openGraph: { images: ogImage({ title: 'Мапа керамічних студій України', kicker: 'Мапа', sub: 'Майстер-класи, гончарне коло, посуд на замовлення', pattern: 'mapa' }) },
}

export default async function MapPage() {
  const { all, placed } = await mapStudios()
  const precise = placed.filter((s) => s.geo?.precision !== 'settlement').length
  const groups = groupByCity(placed)
  const faq = [
    { q: 'Як знайти керамічну студію поруч?', a: 'Наблизьте мапу до свого міста або відкрийте сторінку міста й натисніть «Показати на мапі». Фільтри зверху залишають лише студії з потрібним форматом: майстер-класи, гончарне коло, заняття для дітей, сертифікати чи посуд для закладів.' },
    { q: 'Чому деякі студії стоять у центрі міста?', a: 'Якщо студія не вказала адресу публічно (працює за записом або з дому), ми показуємо її жовтою позначкою в центрі населеного пункту. Точну адресу студія повідомляє під час запису.' },
    { q: 'Звідки дані?', a: `Адреси — з сайтів і сторінок самих студій, координати — з OpenStreetMap. Дані оновлено: ${site.dataUpdated}.` },
    { q: 'Моєї студії немає на мапі. Як додати?', a: 'Заповніть коротку форму на сторінці «Додати студію» — профіль і позначка на мапі безкоштовні.' },
  ]
  return (
    <main className={`${container} grid grid-cols-1 gap-8 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Мапа' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Мапа керамічних студій України</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          На мапі — {fmt(placed.length)} {pluralUk(placed.length, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])} у {fmt(groups.length)} {pluralUk(groups.length, ['місті й селі', 'містах і селах', 'містах і селах'])}. {fmt(precise)} — за точною адресою, решта — у центрі свого міста, бо працюють за записом. Оберіть формат, щоб побачити, де пройти майстер-клас, спробувати гончарне коло чи замовити посуд для закладу.
        </p>
        <Updated />
      </div>

      <StudioMap filters={MAP_FILTERS} />

      <section aria-labelledby="list">
        <SectionHead title="Усі студії за містами" id="list">
          <p className="m-0 text-sm text-umber">Той самий перелік без мапи. {all.length > placed.length ? `${fmt(all.length - placed.length)} ще без координат — їх можна знайти в каталозі.` : ''}</p>
        </SectionHead>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <details key={g.city.slug} open={g.studios.length <= 3} className="group">
              <summary className="cursor-pointer list-none font-semibold">
                {g.city.name} <span className="text-terra">{g.studios.length}</span>
              </summary>
              <ul className="mt-1.5 mb-0 grid list-none gap-1 p-0 text-[15px]">
                {g.studios.map((s) => (
                  <li key={s.id}>
                    <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link> <span className="text-[13px] text-umber">{TYPE_LABEL[s.type ?? 'other']}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq">
        <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
        <div className="grid grid-cols-1 gap-2.5">
          {faq.map((f, i) => (
            <details key={f.q} open={i === 0} className="rounded-2xl bg-card px-[18px] py-1">
              <summary className="cursor-pointer list-none py-3.5 font-bold">{f.q}</summary>
              <p className="mt-0 mb-3.5">{f.q.startsWith('Моєї') ? <>Заповніть коротку форму на сторінці <Link href="/dlya-studiy">«Додати студію»</Link> — профіль і позначка на мапі безкоштовні.</> : f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
