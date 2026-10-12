import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { CityHead } from '@/components/ui/CityHead'
import { WavePage } from '@/components/site/WavePage'
import { getAllWithShops } from '@/lib/catalog'
import { displayName, firstAddress } from '@/lib/present'
import { fillCopy, liveFormatCityPages, partyData, partyLines, waveCopy } from '@/editorial/wave-a'
import { ogImage } from '@/lib/ogImage'

// Birthdays and parties in a clay studio (kids' birthdays, hen parties, renting the studio for a group).
export const revalidate = 86400
const ID = 'mk-den-narodzhennya'
const PATH = '/maister-klasy/den-narodzhennya'

async function load() {
  const raw = waveCopy(ID)
  if (!raw) return null
  const d = await partyData()
  return { ...d, copy: fillCopy(raw, d.vars) }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load()
  if (!p) return {}
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: PATH },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Майстер-класи' }) },
  }
}

export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllWithShops()).map((s) => [s.slug!, s]))
  // Kids' pages by city: where a party usually starts.
  const kidsCities = (await liveFormatCityPages()).filter((x) => x.format === 'dlya-ditey').map((x) => ({ label: x.cityName, href: `/maister-klasy/${x.city}/dlya-ditey` }))
  return (
    <WavePage
      cityLinks={kidsCities}
      copy={p.copy}
      known={known}
      kicker="Майстер-класи"
      crumbs={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, { label: 'День народження в студії' }]}
      path={PATH}
      form="master-class"
      studios={p.studios}
      related={[
        { label: 'Майстер-класи для дітей', href: '/maister-klasy/dlya-ditey' },
        { label: 'Гончарство для двох', href: '/maister-klasy/dlya-dvokh' },
        { label: 'Сертифікати', href: '/sertyfikaty' },
        { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
      ]}
    >
      <Block id="list" title="Студії, де проводять свята" note={<>За прайсами й описами студій; формат, кількість гостей і вік уточнюйте при бронюванні.</>}>
        {p.groups.map((g) => (
          <div key={g.city.slug}>
            <CityHead id={`misto-${g.city.slug}`} name={g.city.name} />
            <InfoList
              items={g.studios.map((s) => {
                const l = partyLines(s)
                const line = l.prices[0]?.text ?? l.services[0]
                return { title: <Link href={`/vyrobnyky/${s.slug}`}>{displayName(s)}</Link>, lines: [line || null, firstAddress(s.address) || null] }
              })}
            />
          </div>
        ))}
      </Block>
    </WavePage>
  )
}
