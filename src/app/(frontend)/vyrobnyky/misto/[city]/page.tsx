import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { MakerRow } from '@/components/site/MakerRow'
import { RequestForm } from '@/components/site/RequestForm.client'
import { site } from '@/content/site'
import { fmt, getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk, type StudioCard } from '@/lib/catalog'
import { cityStats, makerCities, makerCity, TYPE_GROUPS } from '@/lib/makers'
import { cleanName, firstAddress, inCity, oblastLabel } from '@/lib/present'
import { certificateCities } from '@/lib/topics'
import { ogImage } from '@/utilities/ogImage'

export const revalidate = 86400

export async function generateStaticParams() {
  try {
    return (await makerCities()).map((g) => ({ city: g.city.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string }> }

const who = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])}`
const SHOW = 12

// Studios with Instagram and a summary first: they are the ones a visitor can actually check and contact.
const rank = (s: StudioCard) => (s.instagram ? 2 : 0) + (s.summary ? 1 : 0)

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const g = await makerCity((await params).city)
  if (!g) return {}
  return {
    title: `Кераміка ручної роботи ${inCity(g.city.name)}: ${who(g.studios.length)}`,
    description: `Керамічні студії, бренди й майстри ${inCity(g.city.name)}: ${who(g.studios.length)} — посуд, декор, майстер-класи, замовлення для закладів і компаній. Адреси, Instagram, що роблять.`,
    alternates: { canonical: `/vyrobnyky/misto/${g.city.slug}` },
    openGraph: { images: ogImage({ title: `Кераміка ручної роботи: ${g.city.name}`, kicker: 'Виробники', sub: who(g.studios.length), pattern: g.city.slug as string, coa: g.city.slug as string }) },
  }
}

export default async function CityMakersPage({ params }: Args) {
  const g = await makerCity((await params).city)
  if (!g) notFound()
  const { city, studios } = g
  const where = inCity(city.name)
  const region = oblastLabel(city)
  const st = cityStats(studios)
  const mkPage = groupByCity((await getAllStudios()).filter(offersMasterClasses)).some((x) => x.city.slug === city.slug && x.studios.length >= MIN_LIST)
  const certPage = (await certificateCities()).some((c) => c.slug === city.slug)
  const groups = TYPE_GROUPS.map((t) => ({ ...t, studios: studios.filter((s) => t.types.includes(s.type ?? '')).sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'uk')) })).filter((t) => t.studios.length)
  const counts = groups.map((t) => `${t.title.toLowerCase()} — ${t.studios.length}`).join(', ')

  const faq = [
    { q: `Де купити кераміку ручної роботи ${where}?`, a: `У каталозі — ${who(studios.length)} ${where}. Більшість продають напряму: через Instagram, власний сайт, Etsy чи у своїй майстерні; посилання — у профілях. Частина брендів має шоуруми або продається в концепт-сторах.` },
    ...(st.classes ? [{ q: `Де пройти майстер-клас з кераміки ${where}?`, a: `Майстер-класи проводять ${st.classes} ${pluralUk(st.classes, ['місце', 'місця', 'місць'])} з цього списку${mkPage ? ' — окремий перелік з цінами на сторінці майстер-класів міста' : ''}.` }] : []),
    { q: 'Чи можна замовити посуд для закладу чи подарунки для компанії?', a: `${st.venues ? `${st.venues} ${pluralUk(st.venues, ['студія тут згадує', 'студії тут згадують', 'студій тут згадують'])} роботу із закладами. ` : ''}Надішліть один запит — ми передамо його студіям, які роблять подібні вироби, у цьому місті й поруч. ${site.model}` },
  ]

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Кераміка ручної роботи: ${city.name}`,
          numberOfItems: studios.length,
          itemListElement: groups.flatMap((t) => t.studios).map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': s.type === 'maker' ? 'Person' : 'LocalBusiness',
              name: cleanName(s.name),
              url: `${site.url}/vyrobnyky/${s.slug}`,
              ...(s.type === 'maker' ? {} : { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(firstAddress(s.address) ? { streetAddress: firstAddress(s.address) } : {}) } }),
            },
          })),
        }}
      />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'За містами', href: '/vyrobnyky/misto' }, { label: city.name }]} />
        <span className="kicker">Виробники{region ? ` · ${region}` : ''}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи: {city.name}</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі «Глина» — {who(studios.length)} {where}: {counts}.
          {st.classes ? ` ${st.classes} ${pluralUk(st.classes, ['проводить', 'проводять', 'проводять'])} майстер-класи` : ''}
          {st.classes && st.venues ? ', ' : st.venues ? ' ' : ''}
          {st.venues ? `${st.venues} ${pluralUk(st.venues, ['працює', 'працюють', 'працюють'])} із закладами` : ''}
          {st.classes || st.venues ? '.' : ''} Біля кожного — що робить, адреса й Instagram.
        </p>
        <Updated />
        {(mkPage || certPage) && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {mkPage && <li><Link href={`/maister-klasy/${city.slug}`} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:bg-sand hover:text-ink">Майстер-класи: {city.name} →</Link></li>}
            {certPage && <li><Link href={`/sertyfikaty/${city.slug}`} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:bg-sand hover:text-ink">Сертифікати: {city.name} →</Link></li>}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {groups.map((t, k) => (
            <section key={t.title} aria-labelledby={`g${k}`}>
              <SectionHead title={`${t.title} ${t.studios.length > 1 ? `· ${t.studios.length}` : ''}`} id={`g${k}`} />
              <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">{t.studios.slice(0, t.studios.length > SHOW + 2 ? SHOW : undefined).map((s) => <MakerRow key={s.id} s={s} />)}</ul>
              {t.studios.length > SHOW + 2 && (
                <details className="group mt-2.5 grid grid-cols-1">
                  <summary className="cursor-pointer list-none justify-self-start rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-cobalt group-open:mb-2.5">
                    <span className="group-open:hidden">Показати ще {t.studios.length - SHOW}</span>
                    <span className="hidden group-open:inline">Згорнути</span>
                  </summary>
                  <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">{t.studios.slice(SHOW).map((s) => <MakerRow key={s.id} s={s} />)}</ul>
                </details>
              )}
            </section>
          ))}

          <section aria-labelledby="faq">
            <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
            <div className="grid grid-cols-1 gap-2.5">
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
                  <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">
                    {f.q}
                    <span aria-hidden className="font-display text-terra group-open:hidden">+</span>
                    <span aria-hidden className="font-display hidden text-terra group-open:inline">–</span>
                  </summary>
                  <p className="mt-0 mb-3.5">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <aside className="grid grid-cols-1 gap-4 lg:sticky lg:top-24">
          <RequestForm sourcePage={`/vyrobnyky/misto/${city.slug}`} defaultWhat="tableware" defaultCity={city.name} />
        </aside>
      </div>
    </main>
  )
}
