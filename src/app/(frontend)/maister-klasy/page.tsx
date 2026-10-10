import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { site } from '@/content/site'
import { fmt, getAllStudios, groupByCity, hryvniaAmounts, MIN_LIST, offersMasterClasses, range } from '@/lib/catalog'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Майстер-класи з кераміки в Україні: студії за містами і ціни 2026',
  description: `Де спробувати гончарство і ліплення з глини: студії в ${site.stats.cities} містах і селах, ціни, сертифікати, формати для двох, для дітей і для команди.`,
  alternates: { canonical: '/maister-klasy' },
}

export default async function MasterClassesIndex() {
  const groups = groupByCity((await getAllStudios()).filter(offersMasterClasses))
  const big = groups.filter((g) => g.studios.length >= MIN_LIST)
  const small = groups.filter((g) => g.studios.length < MIN_LIST)
  const total = groups.reduce((n, g) => n + g.studios.length, 0)

  return (
    <main className={`${container} grid gap-10 pt-8 pb-16`}>
      <div className="grid gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Майстер-класи з кераміки в Україні</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі — {fmt(total)} місць у {groups.length} містах і селах, де проводять заняття з гончарства чи ліплення з глини. Груповий майстер-клас коштує приблизно {site.prices.groupClass}, індивідуальний — {site.prices.privateClass}. Оберіть місто, щоб побачити студії, ціни й сертифікати.
        </p>
        <Updated />
      </div>
      <section aria-labelledby="cities">
        <SectionHead title="Міста" id="cities" />
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 p-0">
          {big.map((g) => {
            const r = range(g.studios.flatMap(hryvniaAmounts))
            return (
              <li key={g.city.slug}>
                <Link href={`/maister-klasy/${g.city.slug}`} className="grid gap-0.5 rounded-[14px] bg-card px-3.5 py-3 text-ink no-underline hover:bg-sand hover:text-ink">
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
          <p className="m-0 leading-8">
            {small.map((g, i) => (
              <React.Fragment key={g.city.slug}>
                {i > 0 && ' · '}
                {g.studios.map((s, j) => (
                  <React.Fragment key={s.id}>
                    {j > 0 && ', '}
                    <Link href={`/vyrobnyky/${s.slug}`}>{s.name}</Link>
                  </React.Fragment>
                ))}{' '}
                <span className="text-umber">({g.city.name})</span>
              </React.Fragment>
            ))}
          </p>
        </section>
      )}
    </main>
  )
}
