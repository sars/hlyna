import type { Metadata } from 'next'
import { InnerHero, InnerMain } from '@/components/site/Inner'
import { IndexCell, StudioCells } from '@/components/ui/StudioCell'
import React from 'react'

import { liveWaveBPages } from '@/editorial/wave-b'
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

export const revalidate = 86400

export default async function Selections() {
  const extra = (await liveWaveBPages()).filter((p) => p.section === 'dobirky').map((p) => ({ href: p.path, title: p.title, note: p.summary }))
  const list = [...items.slice(0, 2), ...extra, ...items.slice(2)]
  return (
    <InnerMain>
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Добірки' }]}
        kicker="Добірки"
        title="Добірки"
        lead={
          <p className="m-0">
            Редакційні добірки української кераміки ручної роботи за відкритими даними студій і майстрів. Не рейтинг і не реклама.
          </p>
        }
      />
      <div className="pt-[clamp(24px,3vw,40px)]">
        <StudioCells>
          {list.map((x) => (
            <IndexCell key={x.href} href={x.href} title={x.title} text={x.note} cta="Відкрити" />
          ))}
        </StudioCells>
      </div>
    </InnerMain>
  )
}
