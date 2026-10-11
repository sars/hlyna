import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { CASE_LABEL, CASES, casePath, dateUk, KEYSY_INDEX } from '@/editorial/cases'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: KEYSY_INDEX.title,
  description: KEYSY_INDEX.description,
  alternates: { canonical: KEYSY_INDEX.path },
  openGraph: { images: ogImage({ title: 'Кейси: замовлення студій для бізнесу', kicker: 'Для бізнесу', sub: 'Задача, терміни, джерела', pattern: 'keysy' }) },
}

export default function CasesIndex() {
  return (
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Кейси українських студій кераміки',
          numberOfItems: CASES.length,
          itemListElement: CASES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Article', headline: c.title, url: site.url + casePath(c.slug) } })),
        }}
      />
      <div className="grid max-w-[760px] grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Для бізнесу', href: '/dlya-biznesu' }, { label: 'Кейси' }]} />
        <span className="kicker">Для бізнесу</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кейси: як студії виконали замовлення для бізнесу</h1>
        <p className="m-0 text-lg">
          Тарілки для ресторанів, посуд для кав’ярень, подарунки до ювілею компанії: що саме зробили українські студії, для кого й коли. Кожен кейс зібрано з постів студій і замовників та публікацій у медіа, з датою перевірки. Чого студія не оприлюднила — кількості, ціни, терміну, — ми не вгадуємо, а виносимо в список «Що спитати в студії».
        </p>
        <ul className="m-0 grid grid-cols-1 gap-1.5 pl-5 text-[15px] text-umber marker:text-terra">
          <li><b className="text-ink">{CASE_LABEL['open-sources']}</b> — факти з публічних джерел, студія текст ще не підтвердила; фото лише вбудованими постами.</li>
          <li><b className="text-ink">{CASE_LABEL['studio-confirmed']}</b> — студія перевірила текст і додала фото.</li>
          <li><b className="text-ink">{CASE_LABEL['studio-and-client-confirmed']}</b> — підтвердив і замовник.</li>
        </ul>
      </div>

      <section aria-labelledby="list">
        <SectionHead title="Усі кейси" id="list" />
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {CASES.map((c) => (
            <li key={c.slug}>
              <Link href={casePath(c.slug)} className="grid h-full grid-cols-1 content-start gap-2 rounded-2xl bg-card p-5 text-ink no-underline hover:bg-sand hover:text-ink">
                <span className="text-[13px] text-umber">
                  {CASE_LABEL[c.status] ?? c.status} · перевірено {dateUk(c.checked)}
                </span>
                <b className="text-[17px] leading-snug">{c.title}</b>
                <span className="text-[15px] text-umber">
                  <span className="font-semibold text-ink">{c.studio.name}</span> для {c.client.name}
                </span>
                <span className="text-sm text-umber">{c.client.type}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="add" className="grid max-w-[760px] grid-cols-1 gap-2">
        <SectionHead title="Ваша студія робила замовлення для бізнесу?" id="add" />
        <p className="m-0">
          Розкажіть про нього в кабінеті студії або <Link href="/zapyt?vid=studiya">напишіть нам</Link>: що робили, для кого, скільки й за який час, які фото можна показати. Кейс з підтвердженням студії отримує позначку «{CASE_LABEL['studio-confirmed']}».
        </p>
      </section>
    </main>
  )
}
