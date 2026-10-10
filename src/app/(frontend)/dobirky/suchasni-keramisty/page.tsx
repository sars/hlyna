import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { Faq } from '@/components/site/SelectionFaq'
import { StudioCard } from '@/components/site/StudioCard'
import { site } from '@/content/site'
import { verses } from '@/content/verses'
import { groupByCity, pluralUk } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { contemporaryPicks } from '@/lib/selections'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Сучасні українські керамісти 2026: бренди, авторки й автори, студії',
  description: 'Добірка сучасної української кераміки за відкритими даними: бренди посуду й декору, авторська скульптура, прикраси, студії з власними колекціями. З містами й посиланнями на профілі.',
  alternates: { canonical: '/dobirky/suchasni-keramisty' },
  openGraph: { images: ogImage({ title: 'Сучасні українські керамісти', kicker: 'Добірка', img: 'glazed-bottles', credit: 'Фото: Unsplash, CC0' }) },
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
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Сучасні українські керамісти', numberOfItems: all.length, itemListElement: all.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/vyrobnyky/${s.slug}`, name: cleanName(s.name) })) }} />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Добірки', href: '/dobirky' }, { label: 'Сучасні керамісти' }]} />
        <span className="kicker">Добірка · 2026</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Сучасні українські керамісти</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          {all.length} сучасних українських брендів, авторок, авторів і студій кераміки з {cities} {pluralUk(cities, ['міста', 'міст', 'міст'])}: посуд і декор у власних колекціях, керамічна скульптура, прикраси. Добірку зроблено за відкритими даними — колекції, виставки, активний Instagram. Це не рейтинг і не реклама: за місце в ній ніхто не платить.
        </p>
        <Updated />
      </div>
      <div className="grid grid-cols-1 gap-10">
        <Epigraph lines={verses.contemporary} />
        <p className="m-0 max-w-[70ch]">
          Сучасна українська кераміка живе одразу в кількох світах. Невеликі бренди роблять посуд для щоденного столу й ресторанів, художниці й художники — скульптуру для виставок, а молоді майстри — прикраси, які носять щодня. Багато хто переосмислює косівський розпис, опішнянську пластику чи давні форми: у профілях видно, як саме.
        </p>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={g.key}>
            <SectionHead title={g.title} id={g.key}>
              <p className="m-0 text-sm text-umber">{g.studios.length} у добірці</p>
            </SectionHead>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.studios.map((s) => (
                <StudioCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        ))}
        <p className="m-0 max-w-[860px] rounded-2xl bg-card p-4">
          Більше — у <Link href="/vyrobnyky/misto">каталозі за містами</Link> і <Link href="/vyrobnyky/vyrib">за виробами</Link>. Окремо: <Link href="/dobirky/kosiv-i-opishne">Косів і Опішне сьогодні</Link>.
        </p>
        <div className="max-w-[860px]"><Faq items={faq} /></div>
      </div>
    </main>
  )
}
