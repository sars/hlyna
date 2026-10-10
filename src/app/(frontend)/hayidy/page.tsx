import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { guides } from '@/content/guides'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'

export const metadata: Metadata = {
  title: 'Гайди про кераміку ручної роботи: замовлення партії, харчова безпечність, майстер-класи',
  description: 'Практичні гайди: як замовити партію посуду чи подарунків у студії, що спитати про поливу й посудомийку, як дозамовити той самий посуд і як обрати майстер-клас.',
  alternates: { canonical: '/hayidy' },
  openGraph: { images: ogImage({ title: 'Гайди про кераміку ручної роботи', kicker: 'Гайди', pattern: 'hayidy' }) },
}

const more = [
  { label: 'Ціни 2026', href: '/tsiny-2026', note: 'Майстер-класи, сертифікати, посуд: діапазони й медіани за прайсами студій' },
  { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom', note: 'Як ставлять логотип на кераміку і хто це робить' },
  { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny', note: 'Формати, ціни з особи, у студії чи у вас' },
]

export default function GuidesIndex() {
  return (
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Гайди', itemListElement: guides.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: site.url + g.path, name: g.h1 })) }} />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Гайди' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Гайди про кераміку ручної роботи</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          Практично й коротко: як замовити партію посуду чи подарунків у студії, що спитати про поливу й посудомийку, як дозамовити той самий посуд через пів року і як обрати майстер-клас. Цифри — з каталогу й прайсів студій 2026 року.
        </p>
        <Updated />
      </div>
      <section aria-labelledby="all">
        <SectionHead title="Усі гайди" id="all" />
        <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={g.path} className="grid h-full grid-cols-1 content-start gap-1.5 rounded-[18px] bg-card p-5 text-ink no-underline hover:bg-sand hover:text-ink">
                <span className="kicker">{g.kicker}</span>
                <b className="text-[17px] leading-snug">{g.h1}</b>
                <span className="text-[15px] text-umber">{g.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="more">
        <SectionHead title="Корисне на інших сторінках" id="more" />
        <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-3">
          {more.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="grid h-full grid-cols-1 content-start gap-1 rounded-[18px] bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                <b>{m.label}</b>
                <span className="text-sm text-umber">{m.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
