import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, Epigraph, Updated } from '@/components/site/Bits'
import { verses } from '@/content/verses'
import { RequestForm } from '@/components/site/RequestForm.client'
import { mainNav } from '@/content/navigation'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи для бізнесу: посуд для закладів, подарунки, корпоративи',
  description: 'Посуд для ресторанів, кав’ярень і готелів, чашки з логотипом, корпоративні подарунки й корпоративи з ліплення з глини від українських студій. Один запит — пропозиції від кількох студій.',
  alternates: { canonical: '/dlya-biznesu' },
}

export default function BusinessIndex() {
  const biz = mainNav.find((s) => s.id === 'biz')!
  return (
    <main className={`${container} grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]`}>
      <div className="grid gap-8">
        <div className="grid gap-4">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Для бізнесу' }]} />
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи для бізнесу</h1>
          <p className="m-0 max-w-[70ch] text-lg">
            Українські студії роблять посуд для ресторанів, кав’ярень і готелів, чашки з логотипом і подарунки для команд, а також проводять корпоративи з ліплення з глини. Партію зазвичай виготовляють {site.prices.batchLeadTime}; корпоратив коштує {site.prices.corporate}. {site.model}
          </p>
          <Updated />
          <Epigraph lines={verses.business} />
        </div>
        {biz.columns.map((c) => (
          <section key={c.title} className="grid gap-3">
            <p className="kicker m-0">{c.title}</p>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="grid h-full gap-1 rounded-2xl bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                    <b>{l.label}</b>
                    {l.note && <span className="text-sm text-umber">{l.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <aside className="lg:sticky lg:top-24"><RequestForm sourcePage="/dlya-biznesu" /></aside>
    </main>
  )
}
