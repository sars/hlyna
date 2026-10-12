import type { Metadata } from 'next'
import { Block, InnerHero, InnerMain } from '@/components/site/Inner'
import { Epigraph } from '@/components/ui/Epigraph'
import { Note } from '@/components/ui/Note'
import { StudioCell, StudioCells } from '@/components/ui/StudioCell'
import Link from 'next/link'
import React from 'react'

import { site } from '@/content/site'
import { ldItemList } from '@/lib/ld'
import { JsonLd } from '@/components/site/JsonLd'
import { Faq } from '@/components/site/SelectionFaq'
import { verses } from '@/content/verses'
import { groupByCity, pluralUk } from '@/lib/catalog'
import { contemporaryPicks } from '@/editorial/contemporary'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Сучасні українські керамісти 2026: бренди, авторки й автори, студії',
  description: 'Добірка сучасної української кераміки за відкритими даними: бренди посуду й декору, авторська скульптура, прикраси, студії з власними колекціями. З містами й посиланнями на профілі.',
  alternates: { canonical: '/dobirky/suchasni-keramisty' },
  openGraph: { images: ogImage({ title: 'Сучасні українські керамісти', kicker: 'Добірка', img: 'glazed-bottles', credit: 'Фото: Jessica Ruscello, CC0' }) },
}

export default async function Contemporary() {
  const groups = await contemporaryPicks()
  const all = groups.flatMap((g) => g.studios)
  const cities = groupByCity(all).length
  const faq = [
    { q: 'Хто такі сучасні українські керамісти?', a: `Це невеликі бренди посуду й декору, авторки й автори керамічної скульптури та прикрас, студії з власними колекціями. У цій добірці — ${all.length} з ${cities} ${pluralUk(cities, ['міста', 'міст', 'міст'])}; повний каталог — понад ${Math.floor(site.stats.makers / 100) * 100} профілів.` },
    { q: 'Де купити сучасну українську кераміку?', a: 'Здебільшого в Instagram і на власних сайтах майстрів, на Etsy, у концепт-сторах і на маркетах. Посилання — у профілі кожного.' },
    { q: 'Як потрапити в добірку?', a: 'Ми обираємо за відкритими даними: колекції, виставки, сучасні форми, активність в Instagram. Студія може оновити свій профіль — це безкоштовно.' },
  ]
  return (
    <InnerMain>
      <JsonLd data={ldItemList('Сучасні українські керамісти', all)} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Добірки', href: '/dobirky' }, { label: 'Сучасні керамісти' }]}
        kicker="Добірка · 2026"
        title="Сучасні українські керамісти"
        lead={
          <p className="m-0">
            {all.length} сучасних українських брендів, авторок, авторів і студій кераміки з {cities} {pluralUk(cities, ['міста', 'міст', 'міст'])}: посуд і декор у власних колекціях, керамічна скульптура, прикраси. Добірку зроблено за відкритими даними — колекції, виставки, активний Instagram. Це не рейтинг і не реклама: за місце в ній ніхто не платить.
          </p>
        }
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Epigraph lines={verses.contemporary} />
        <p className="m-0 max-w-read">
          Сучасна українська кераміка живе одразу в кількох світах. Невеликі бренди роблять посуд для щоденного столу й ресторанів, художниці й художники — скульптуру для виставок, а молоді майстри — прикраси, які носять щодня. Багато хто переосмислює косівський розпис, опішнянську пластику чи давні форми: у профілях видно, як саме.
        </p>
        {groups.map((g) => (
          <Block key={g.key} id={g.key} title={g.title} note={`${g.studios.length} у добірці`}>
            <StudioCells>
              {g.studios.map((s) => (
                <StudioCell key={s.id} s={s} />
              ))}
            </StudioCells>
          </Block>
        ))}
        <Note>
          Більше — у <Link href="/vyrobnyky/misto">каталозі за містами</Link> і <Link href="/vyrobnyky/vyrib">за виробами</Link>. Окремо: <Link href="/dobirky/kosiv-i-opishne">Косів і Опішне сьогодні</Link>.
        </Note>
        <Faq items={faq} />
      </div>
    </InnerMain>
  )
}
