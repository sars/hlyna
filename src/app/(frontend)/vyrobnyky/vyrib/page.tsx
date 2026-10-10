import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { productTopics } from '@/content/topics'
import { fmt, MIN_LIST, pluralUk } from '@/lib/catalog'
import { topicData } from '@/lib/topics'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи за виробами: посуд, чашки, вази, світильники, прикраси, плитка',
  description: 'Українські майстри і студії кераміки за тим, що вони роблять: тарілки й миски, чашки, вази й декор, світильники, прикраси, плитка й панно. Кількість майстрів і ціни з прайсів.',
  alternates: { canonical: '/vyrobnyky/vyrib' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи за виробами', kicker: 'Виробники', sub: 'Посуд, чашки, вази, світильники, прикраси, плитка', img: 'glazed-bottles' }) },
}

export default async function ProductsIndex() {
  const rows = (await Promise.all(Object.values(productTopics).map(async (t) => ({ t, d: await topicData(t) })))).filter((r) => r.d.ctx.n >= MIN_LIST)
  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Кераміка ручної роботи за виробами', itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: site.url + r.t.path, name: r.t.crumb })) }} />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'Вироби' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи за виробами</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          Що роблять українські майстри і студії кераміки — від тарілок і чашок до світильників і плитки. Біля кожного виробу — скільки майстрів його роблять і за скільки він найчастіше продається в їхніх прайсах.
        </p>
        <Updated />
      </div>
      <section aria-labelledby="list">
        <SectionHead title="Вироби" id="list" />
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ t, d }) => (
            <li key={t.path}>
              <Link href={t.path} className="grid h-full grid-cols-1 content-start gap-1 rounded-[18px] bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                <b className="text-[17px]">{t.crumb}</b>
                <span className="text-sm text-umber">
                  {fmt(d.ctx.n)} {pluralUk(d.ctx.n, ['майстер чи студія', 'майстри й студії', 'майстрів і студій'])} у {fmt(d.ctx.cities)} {pluralUk(d.ctx.cities, ['місті', 'містах', 'містах'])}
                </span>
                {d.ctx.min && d.ctx.max ? <span className="text-sm font-semibold text-terra">здебільшого {fmt(d.ctx.min)}–{fmt(d.ctx.max)} грн</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <nav aria-label="Також" className="grid grid-cols-1 gap-3">
        <p className="kicker m-0">Також</p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {[['Виробники за містами', '/vyrobnyky/misto'], ['Ціни 2026', '/tsiny-2026'], ['Посуд для ресторанів', '/dlya-biznesu/posud-dlya-restoraniv'], ['Корпоративні подарунки', '/dlya-biznesu/korporatyvni-podarunky']].map(([l, h]) => (
            <li key={h}><Link href={h} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">{l}</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
