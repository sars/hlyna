import type { Metadata } from 'next'
import { Block, HeroRequest, InnerHero, InnerMain, RequestBand } from '@/components/site/Inner'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { CityList, SmallCities } from '@/components/ui/CityList'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import React from 'react'

import { facts } from '@/lib/facts'
import { topicList } from '@/content/topics'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { scopeSpan } from '@/lib/priceIndex'
import { fmt } from '@/lib/money'

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
  const gr = f.get('group') // the same p10–p90 range as the lead
  const facts_ = gr ? { value: `${fmt(gr.min)}–${fmt(gr.max)}`, label: 'грн разовий майстер-клас з особи' } : null

  return (
    <InnerMain>
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи' }]}
        kicker="Майстер-класи"
        title="Майстер-класи з кераміки в Україні"
        lead={
          <p className="m-0">
            У каталозі — {fmt(total)} {pluralUk(total, ['місце', 'місця', 'місць'])} у {groups.length} містах і селах, де проводять заняття з гончарства чи ліплення з глини. Разовий майстер-клас коштує {f.range('group')}, індивідуальний — {f.range('private')}. Оберіть місто, щоб побачити студії, ціни й сертифікати.
          </p>
        }
        strip={[
          { value: fmt(total), label: pluralUk(total, ['місце', 'місця', 'місць']) + ' з майстер-класами' },
          { value: fmt(groups.length), label: pluralUk(groups.length, ['місто чи село', 'міста й села', 'міст і сіл']) },
          ...(facts_ ? [facts_] : []),
        ]}
        actions={<HeroRequest path="/maister-klasy" />}
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Block id="formats" title="Формати">
          <ChipGroup>
            {topicList
              .filter((t) => t.section === 'mk' || t.section === 'cert')
              .map((t) => (
                <Chip key={t.path} href={t.path}>
                  {t.crumb}
                </Chip>
              ))}
          </ChipGroup>
        </Block>
        <RequestBand path="/maister-klasy" tone="cobalt" />
        <Block id="cities" title="Міста">
          <CityList
            items={big.map((g) => {
              const r = scopeSpan(g.studios, 'group')
              return { name: g.city.name, href: `/maister-klasy/${g.city.slug}`, count: g.studios.length, note: r ? `від ${fmt(r.min)} грн` : 'ціни уточнюються' }
            })}
          />
        </Block>
        {small.length > 0 && (
          <Block id="more" title="Ще міста і села">
            <SmallCities groups={small.map((g) => ({ name: g.city.name, studios: g.studios.map((s) => ({ name: s.name, href: `/vyrobnyky/${s.slug}` })) }))} />
          </Block>
        )}
        <RequestBand path="/maister-klasy" tone="ink" />
      </div>
      <MobileRequestBar />
    </InnerMain>
  )
}
