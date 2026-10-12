import type { Metadata } from 'next'
import { Block, InnerHero, InnerMain } from '@/components/site/Inner'
import { CityList, SmallCities } from '@/components/ui/CityList'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { getAllStudios, groupByCity, pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { cityStats, makerCities } from '@/lib/makers'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи за містами України: студії, бренди, майстри',
  description: 'Українські керамічні студії, бренди й майстри за містами: Київ, Львів, Одеса, Харків, Дніпро, Косів, Опішне та інші. Скільки їх у кожному місті, хто проводить майстер-класи й працює із закладами.',
  alternates: { canonical: '/vyrobnyky/misto' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи за містами', kicker: 'Виробники', sub: 'Студії, бренди й майстри по всій Україні' }) },
}

export default async function CitiesIndex() {
  const big = await makerCities()
  const all = groupByCity((await getAllStudios()).filter((s) => s.type !== 'supplier'))
  const small = all.filter((g) => !big.some((b) => b.city.slug === g.city.slug))
  const total = all.reduce((n, g) => n + g.studios.length, 0)
  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Кераміка ручної роботи за містами України', itemListElement: big.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/vyrobnyky/misto/${g.city.slug}`, name: g.city.name })) }} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'За містами' }]}
        kicker="Виробники"
        title="Кераміка ручної роботи за містами"
        lead={
          <p className="m-0">
            У каталозі — {fmt(total)} {pluralUk(total, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])} у {fmt(all.length)} {pluralUk(all.length, ['місті й селі', 'містах і селах', 'містах і селах'])} України. Найбільше — у Києві й Львові; окремі осередки кераміки — Косів, Опішне, Ужгород.
          </p>
        }
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Block id="cities" title="Міста">
          <CityList
            items={big.map((g) => {
              const st = cityStats(g.studios)
              return { name: g.city.name, href: `/vyrobnyky/misto/${g.city.slug}`, count: g.studios.length, note: st.classes ? `майстер-класи: ${st.classes}` : 'вироби й замовлення' }
            })}
          />
        </Block>
        {small.length > 0 && (
          <Block id="more" title="Ще міста і села">
            <SmallCities groups={small.map((g) => ({ name: g.city.name, studios: g.studios.map((s) => ({ name: cleanName(s.name), href: `/vyrobnyky/${s.slug}` })) }))} />
          </Block>
        )}
      </div>
    </InnerMain>
  )
}
