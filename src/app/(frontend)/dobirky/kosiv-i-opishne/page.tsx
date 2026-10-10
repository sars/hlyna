import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { ldItemList } from '@/lib/ld'
import { JsonLd } from '@/components/site/JsonLd'
import { Faq } from '@/components/site/SelectionFaq'
import { StudioCard } from '@/components/site/StudioCard'
import { pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { kosivOpishne } from '@/lib/selections'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Косів і Опішне сьогодні: сучасні майстри, студії й де купити кераміку',
  description: 'Хто працює з глиною в Косові й Опішному зараз: майстри, родинні майстерні, бренди, студії з майстер-класами, крамниці, музеї й школи. З посиланнями на профілі.',
  alternates: { canonical: '/dobirky/kosiv-i-opishne' },
  openGraph: { images: ogImage({ title: 'Косів і Опішне сьогодні', kicker: 'Добірка', pattern: 'kosiv-i-opishne' }) },
}

const many = (n: number) => `${n} ${pluralUk(n, ['майстер, бренд чи студія', 'майстри, бренди й студії', 'майстрів, брендів і студій'])}`

export default async function KosivOpishne() {
  const places = await kosivOpishne()
  const [kosiv, opishne] = places
  const all = places.flatMap((p) => [...p.makers, ...p.places])
  const faq = [
    { q: 'Чим відрізняється косівська кераміка?', a: 'Мальованим посудом і кахлями: розпис ріжком по світлому ангобу, зелені, жовті й коричневі барви, сюжети гуцульського життя. Традиція косівської мальованої кераміки з 2019 року — у Репрезентативному списку нематеріальної культурної спадщини людства ЮНЕСКО.' },
    { q: 'Чим відоме Опішне?', a: 'Фігурним посудом, декоративною скульптурою й глиняною іграшкою-свищиком. В Опішному працює Національний музей-заповідник українського гончарства, а гончарство вчать з дитинства в художньому ліцеї.' },
    { q: 'Де купити кераміку з Косова чи Опішного?', a: 'Напряму в майстрів — через Instagram, сайти й майстерні, а також у місцевих крамницях і крамниці музею-заповідника. Посилання — у профілях нижче.' },
    { q: 'Чи можна там спробувати гончарство?', a: 'Так: у Косові й Опішному є студії й майстерні з майстер-класами на гончарному колі й розписом. Шукайте позначку «майстер-класи» у профілях.' },
  ]
  return (
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={ldItemList('Косів і Опішне: майстри й студії', all)} />
      <div className="grid grid-cols-1 items-start gap-8">
        <div className="grid grid-cols-1 gap-4">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Добірки', href: '/dobirky' }, { label: 'Косів і Опішне' }]} />
          <span className="kicker">Добірка · традиція сьогодні</span>
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Косів і Опішне сьогодні</h1>
          <p className="m-0 max-w-[70ch] text-lg">
            Косів на Гуцульщині й Опішне на Полтавщині — два найвідоміші гончарні осередки України. У каталозі {many(kosiv.makers.length)} з Косова й довколишніх сіл і {opishne.makers.length} — з Опішного, а ще крамниці, музеї й школи. Нижче — хто працює з глиною зараз, де купити і де повчитися.
          </p>
          <Updated />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-10">
        <p className="m-0 max-w-[70ch]">
          Тут традиція не стоїть у вітрині. Косівські майстри розписують тарілки так само ріжком по ангобу, але сюжети на них бувають іронічні й сьогоднішні; в Опішному поруч зі свищиками й баранцями ліплять скульптуру для виставок і посуд для міських кав’ярень. Молоді родинні майстерні продають через Instagram, а старші майстри — на ярмарках і з власних хат.
        </p>
        {places.map((p) => (
          <section key={p.key} aria-labelledby={p.key} className="grid grid-cols-1 gap-6">
            <SectionHead title={p.title} id={p.key}>
              <p className="m-0 text-sm text-umber">{many(p.makers.length)}</p>
            </SectionHead>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.makers.map((s) => (
                <StudioCard key={s.id} s={s} />
              ))}
            </div>
            {p.places.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                <h3 className="h-display m-0 text-[17px]">Крамниці, музеї, школи</h3>
                <ul className="m-0 grid grid-cols-1 gap-1.5 pl-5 marker:text-terra">
                  {p.places.map((s) => (
                    <li key={s.id}>
                      <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
        <p className="m-0 max-w-[860px] rounded-2xl bg-card p-4">
          Дивіться також: <Link href="/dobirky/suchasni-keramisty">сучасні українські керамісти</Link>, <Link href="/vyrobnyky/misto/kosiv">усі профілі з Косова</Link>, <Link href="/vyrobnyky/misto/opishne">з Опішного</Link>.
        </p>
        <div className="max-w-[860px]"><Faq items={faq} /></div>
      </div>
    </main>
  )
}
