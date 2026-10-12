import type { Metadata } from 'next'
import { Block, InnerHero, InnerMain } from '@/components/site/Inner'
import { CityHead } from '@/components/ui/CityHead'
import { Note } from '@/components/ui/Note'
import { StudioCell, StudioCells } from '@/components/ui/StudioCell'
import Link from 'next/link'
import React from 'react'

import { ldItemList } from '@/lib/ld'
import { JsonLd } from '@/components/site/JsonLd'
import { Faq } from '@/components/site/SelectionFaq'
import { pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { kosivOpishne } from '@/editorial/contemporary'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Косів і Опішне сьогодні: сучасні майстри, студії й де купити кераміку',
  description: 'Хто працює з глиною в Косові й Опішному зараз: майстри, родинні майстерні, бренди, студії з майстер-класами, крамниці, музеї й школи. З посиланнями на профілі.',
  alternates: { canonical: '/dobirky/kosiv-i-opishne' },
  openGraph: { images: ogImage({ title: 'Косів і Опішне сьогодні', kicker: 'Добірка' }) },
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
    <InnerMain>
      <JsonLd data={ldItemList('Косів і Опішне: майстри й студії', all)} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Добірки', href: '/dobirky' }, { label: 'Косів і Опішне' }]}
        kicker="Добірка · традиція сьогодні"
        title="Косів і Опішне сьогодні"
        lead={
          <p className="m-0">
            Косів на Гуцульщині й Опішне на Полтавщині — два найвідоміші гончарні осередки України. У каталозі {many(kosiv.makers.length)} з Косова й довколишніх сіл і {opishne.makers.length} — з Опішного, а ще крамниці, музеї й школи. Нижче — хто працює з глиною зараз, де купити і де повчитися.
          </p>
        }
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <p className="m-0 max-w-read">
          Тут традиція не стоїть у вітрині. Косівські майстри розписують тарілки так само ріжком по ангобу, але сюжети на них бувають іронічні й сьогоднішні; в Опішному поруч зі свищиками й баранцями ліплять скульптуру для виставок і посуд для міських кав’ярень. Молоді родинні майстерні продають через Instagram, а старші майстри — на ярмарках і з власних хат.
        </p>
        {places.map((p) => (
          <Block key={p.key} id={p.key} title={p.title} note={many(p.makers.length)}>
            <StudioCells>
              {p.makers.map((s) => (
                <StudioCell key={s.id} s={s} />
              ))}
            </StudioCells>
            {p.places.length > 0 && (
              <div>
                <CityHead id={`${p.key}-places`} name="Крамниці, музеї, школи" />
                <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
                  {p.places.map((s) => (
                    <li key={s.id} className="before:text-terracotta-text before:content-['—_']">
                      <Link href={`/vyrobnyky/${s.slug}`} className="text-ink underline underline-offset-[3px] hover:text-cobalt">
                        {cleanName(s.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>
        ))}
        <Note>
          Дивіться також: <Link href="/dobirky/suchasni-keramisty">сучасні українські керамісти</Link>, <Link href="/vyrobnyky/misto/kosiv">усі профілі з Косова</Link>, <Link href="/vyrobnyky/misto/opishne">з Опішного</Link>.
        </Note>
        <Faq items={faq} />
      </div>
    </InnerMain>
  )
}
