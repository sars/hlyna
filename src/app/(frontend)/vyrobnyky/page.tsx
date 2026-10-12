import type { Metadata } from 'next'
import { Block, HeroRequest, InnerHero, InnerMain, RequestBand } from '@/components/site/Inner'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { CityHead } from '@/components/ui/CityHead'
import { CityStudioLinks, SmallCities } from '@/components/ui/CityList'
import React from 'react'

import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { fmt } from '@/lib/money'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Українські керамічні студії, майстри і бренди: каталог за містами',
  description: 'Каталог українських керамічних студій, майстрів і брендів за містами: що роблять, ціни, де продають, контакти.',
  alternates: { canonical: '/vyrobnyky' },
}

export default async function MakersIndex() {
  const studios = await getAllStudios()
  const groups = groupByCity(studios)
  const classes = studios.filter(offersMasterClasses).length
  const big = groups.filter((g) => g.studios.length >= MIN_LIST)
  const small = groups.filter((g) => g.studios.length < MIN_LIST)
  return (
    <InnerMain>
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Виробники' }]}
        kicker="Каталог"
        title="Українські керамічні студії, майстри і бренди"
        lead={
          <p className="m-0">
            У каталозі — {fmt(studios.length)} {pluralUk(studios.length, ['профіль', 'профілі', 'профілів'])} у {groups.length} містах і селах: студії з майстер-класами, авторські бренди посуду, майстри традиційної кераміки й школи. Кожен профіль — що роблять, ціни з прайсу (якщо є), де продають і як зв’язатися.
          </p>
        }
        strip={[
          { value: fmt(studios.length), label: 'профілів у каталозі' },
          { value: fmt(groups.length), label: 'міст і сіл' },
          { value: fmt(classes), label: 'місць з майстер-класами' },
        ]}
        chips={big.slice(0, 16).map((g) => ({ label: g.city.name, href: `#c-${g.city.slug}`, count: g.studios.length }))}
        moreChip={small.length > 0 ? { label: 'Усі міста й села', href: '#more' } : undefined}
        actions={<HeroRequest path="/vyrobnyky" />}
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        {big.map((g, i) => (
          <React.Fragment key={g.city.slug}>
            <section aria-labelledby={`c-${g.city.slug}`}>
              <CityHead id={`c-${g.city.slug}`} name={g.city.name} count={g.studios.length} level={2} />
              <CityStudioLinks studios={g.studios.map((s) => ({ id: s.id, name: s.name, href: `/vyrobnyky/${s.slug}` }))} />
            </section>
            {i === 3 && <RequestBand path="/vyrobnyky" tone="cobalt" />}
          </React.Fragment>
        ))}
        {small.length > 0 && (
          <Block id="more" title="Ще міста і села">
            <SmallCities groups={small.map((g) => ({ name: g.city.name, studios: g.studios.map((s) => ({ name: s.name, href: `/vyrobnyky/${s.slug}` })) }))} />
          </Block>
        )}
        <RequestBand path="/vyrobnyky" tone="ink" />
      </div>
      <MobileRequestBar />
    </InnerMain>
  )
}
