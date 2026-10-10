import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { facts } from '@/lib/facts'
import { topicList } from '@/content/topics'
import { fmt, getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { singleClassAmounts, typicalRange } from '@/lib/present'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Майстер-класи з кераміки в Україні: студії за містами і ціни 2026',
  description: `Де спробувати гончарство і ліплення з глини: студії по всій Україні, ціни, сертифікати, формати для двох, для дітей і для команди.`,
  alternates: { canonical: '/maister-klasy' },
}

export default async function MasterClassesIndex() {
  const f = await facts()
  const groups = groupByCity((await getAllStudios()).filter(offersMasterClasses))
  const big = groups.filter((g) => g.studios.length >= MIN_LIST)
  const small = groups.filter((g) => g.studios.length < MIN_LIST)
  const total = groups.reduce((n, g) => n + g.studios.length, 0)

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Майстер-класи з кераміки в Україні</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі — {fmt(total)} {pluralUk(total, ['місце', 'місця', 'місць'])} у {groups.length} містах і селах, де проводять заняття з гончарства чи ліплення з глини. Разовий майстер-клас коштує {f.range('group')}, індивідуальний — {f.range('private')}. Оберіть місто, щоб побачити студії, ціни й сертифікати.
        </p>
        <Updated />
      </div>
      <section aria-labelledby="formats">
        <SectionHead title="Формати" id="formats" />
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {topicList
            .filter((t) => t.section === 'mk' || t.section === 'cert')
            .map((t) => (
              <li key={t.path}>
                <Link href={t.path} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                  {t.crumb}
                </Link>
              </li>
            ))}
        </ul>
      </section>
      <section aria-labelledby="cities">
        <SectionHead title="Міста" id="cities" />
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 p-0">
          {big.map((g) => {
            const r = typicalRange(g.studios.flatMap(singleClassAmounts))
            return (
              <li key={g.city.slug}>
                <Link href={`/maister-klasy/${g.city.slug}`} className="grid grid-cols-1 gap-0.5 rounded-[14px] bg-card px-3.5 py-3 text-ink no-underline hover:bg-sand hover:text-ink">
                  <span className="flex justify-between font-semibold">{g.city.name}<span className="text-terra">{g.studios.length}</span></span>
                  <span className="text-[13px] text-umber">{r ? `від ${fmt(r.min)} грн` : 'ціни уточнюються'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      {small.length > 0 && (
        <section aria-labelledby="more">
          <SectionHead title="Ще міста і села" id="more" />
          <ul className="m-0 grid grid-cols-1 list-none gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {small.map((g) => (
              <li key={g.city.slug} className="text-[15px] leading-snug">
                <b>{g.city.name}:</b>{' '}
                {g.studios.map((s, j) => (
                  <React.Fragment key={s.id}>
                    {j > 0 && ', '}
                    <Link href={`/vyrobnyky/${s.slug}`}>{s.name}</Link>
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
