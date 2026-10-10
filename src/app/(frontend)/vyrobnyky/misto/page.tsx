import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { fmt, getAllStudios, groupByCity, pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { cityStats, makerCities } from '@/lib/makers'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи за містами України: студії, бренди, майстри',
  description: 'Українські керамічні студії, бренди й майстри за містами: Київ, Львів, Одеса, Харків, Дніпро, Косів, Опішне та інші. Скільки їх у кожному місті, хто проводить майстер-класи й працює із закладами.',
  alternates: { canonical: '/vyrobnyky/misto' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи за містами', kicker: 'Виробники', sub: 'Студії, бренди й майстри по всій Україні', pattern: 'misto' }) },
}

export default async function CitiesIndex() {
  const big = await makerCities()
  const all = groupByCity((await getAllStudios()).filter((s) => s.type !== 'supplier'))
  const small = all.filter((g) => !big.some((b) => b.city.slug === g.city.slug))
  const total = all.reduce((n, g) => n + g.studios.length, 0)
  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Кераміка ручної роботи за містами України', itemListElement: big.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/vyrobnyky/misto/${g.city.slug}`, name: g.city.name })) }} />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'За містами' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи за містами</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі — {fmt(total)} {pluralUk(total, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])} у {fmt(all.length)} {pluralUk(all.length, ['місті й селі', 'містах і селах', 'містах і селах'])} України. Найбільше — у Києві й Львові; окремі осередки кераміки — Косів, Опішне, Ужгород.
        </p>
        <Updated />
      </div>
      <section aria-labelledby="cities">
        <SectionHead title="Міста" id="cities" />
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 p-0">
          {big.map((g) => {
            const st = cityStats(g.studios)
            return (
              <li key={g.city.slug}>
                <Link href={`/vyrobnyky/misto/${g.city.slug}`} className="grid grid-cols-1 gap-0.5 rounded-[14px] bg-card px-3.5 py-3 text-ink no-underline hover:bg-sand hover:text-ink">
                  <span className="flex justify-between font-semibold">{g.city.name}<span className="text-terra">{g.studios.length}</span></span>
                  <span className="text-[13px] text-umber">{st.classes ? `майстер-класи: ${st.classes}` : 'вироби й замовлення'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      {small.length > 0 && (
        <section aria-labelledby="more">
          <SectionHead title="Ще міста і села" id="more" />
          <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2">
            {small.map((g) => (
              <li key={g.city.slug} className="text-[15px] leading-snug">
                <b>{g.city.name}:</b>{' '}
                {g.studios.map((s, j) => (
                  <React.Fragment key={s.id}>
                    {j > 0 && ', '}
                    <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                  </React.Fragment>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
