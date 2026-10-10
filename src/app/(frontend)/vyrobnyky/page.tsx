import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { fmt, getAllStudios, groupByCity, pluralUk } from '@/lib/catalog'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Українські керамічні студії, майстри і бренди: каталог за містами',
  description: 'Каталог українських керамічних студій, майстрів і брендів за містами: що роблять, ціни, де продають, контакти.',
  alternates: { canonical: '/vyrobnyky' },
}

export default async function MakersIndex() {
  const studios = await getAllStudios()
  const groups = groupByCity(studios)
  return (
    <main className={`${container} grid gap-10 pt-8 pb-16`}>
      <div className="grid gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Українські керамічні студії, майстри і бренди</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі — {fmt(studios.length)} {pluralUk(studios.length, ['профіль', 'профілі', 'профілів'])} у {groups.length} містах і селах: студії з майстер-класами, авторські бренди посуду, майстри традиційної кераміки й школи. Кожен профіль — що роблять, ціни з прайсу (якщо є), де продають і як зв’язатися.
        </p>
        <Updated />
      </div>
      {groups.map((g) => (
        <section key={g.city.slug} aria-labelledby={`c-${g.city.slug}`}>
          <SectionHead title={`${g.city.name} · ${g.studios.length}`} id={`c-${g.city.slug}`} />
          <ul className="m-0 grid list-none gap-x-6 gap-y-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {g.studios.map((s) => (
              <li key={s.id}>
                <Link href={`/vyrobnyky/${s.slug}`}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
