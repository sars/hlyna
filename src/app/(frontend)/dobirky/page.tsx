import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, Updated } from '@/components/site/Bits'
import { ogImage } from '@/utilities/ogImage'

export const metadata: Metadata = {
  title: 'Добірки української кераміки: сучасні керамісти, Косів і Опішне',
  description: 'Редакційні добірки за відкритими даними: сучасні українські бренди й автори кераміки, гончарні осередки Косова й Опішного сьогодні.',
  alternates: { canonical: '/dobirky' },
  openGraph: { images: ogImage({ title: 'Добірки української кераміки', kicker: 'Добірки', pattern: 'dobirky' }) },
}

const items = [
  { href: '/dobirky/suchasni-keramisty', title: 'Сучасні українські керамісти', note: 'Бренди посуду й декору, авторки й автори, студії з власними колекціями' },
  { href: '/dobirky/kosiv-i-opishne', title: 'Косів і Опішне сьогодні', note: 'Хто працює з глиною в двох найвідоміших гончарних осередках зараз' },
  { href: '/vyrobnyky/vyrib', title: 'За виробами', note: 'Тарілки, чашки, вази, світильники, прикраси, плитка' },
  { href: '/vyrobnyky/misto', title: 'За містами', note: 'Студії, бренди й майстри у вашому місті' },
]

export default function Selections() {
  return (
    <main className={`${container} grid w-full grid-cols-1 gap-8 pt-8 pb-16`}>
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Добірки' }]} />
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Добірки</h1>
        <p className="m-0 max-w-[70ch] text-lg">Редакційні добірки української кераміки ручної роботи за відкритими даними студій і майстрів. Не рейтинг і не реклама.</p>
        <Updated />
      </div>
      <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2">
        {items.map((x) => (
          <li key={x.href}>
            <Link href={x.href} className="grid h-full grid-cols-1 content-start gap-1.5 rounded-[18px] bg-card p-5 text-ink no-underline hover:bg-sand hover:text-ink">
              <b className="text-[17px]">{x.title}</b>
              <span className="text-[15px] text-umber">{x.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
