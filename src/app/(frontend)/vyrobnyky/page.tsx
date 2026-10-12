import type { Metadata } from 'next'
import { InnerHero, InnerMain } from '@/components/site/Inner'
import { CityHead } from '@/components/ui/CityHead'
import Link from 'next/link'
import React from 'react'

import { getAllStudios, groupByCity, offersMasterClasses, pluralUk } from '@/lib/catalog'
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
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        {groups.map((g) => (
          <section key={g.city.slug} aria-labelledby={`c-${g.city.slug}`}>
            <CityHead id={`c-${g.city.slug}`} name={g.city.name} count={g.studios.length} level={2} />
            <ul className="m-0 mt-2 grid list-none grid-cols-1 gap-x-6 gap-y-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {g.studios.map((s) => (
                <li key={s.id} className="border-b border-rule py-1.5 text-[15px] leading-[1.35]">
                  <Link href={`/vyrobnyky/${s.slug}`} className="text-ink no-underline hover:text-cobalt">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </InnerMain>
  )
}
