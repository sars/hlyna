import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import { latestUpdate } from '@/lib/catalog'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { MakerRow } from '@/components/site/MakerRow'
import { PlacePicks, PlaceSeeAlso, PlaceSources, PlaceStory } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { site } from '@/content/site'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk, type StudioCard } from '@/lib/catalog'
import { cityStats, makerCities, makerCity, TYPE_GROUPS } from '@/lib/makers'
import { cleanName, firstAddress, inCity, oblastLabel } from '@/lib/present'
import { cityContent, fixPriceRef, mergeFaq } from '@/editorial/places'
import { localPrices } from '@/lib/priceIndex'
import { certificateCities } from '@/editorial/topics'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'

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
    description: (cityContent(g.city.slug as string)?.lead || `Керамічні студії, бренди й майстри ${inCity(g.city.name)}: ${who(g.studios.length)} — посуд, декор, майстер-класи, замовлення для закладів і компаній.`).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 300),
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
  const content = cityContent(city.slug as string)
  const known = new Map((await getAllStudios()).map((s) => [s.slug as string, s]))
  const prices = localPrices(studios)
  const priceWhere = prices.length ? 'у розділі «Ціни» на цій сторінці' : 'на сторінці «Ціни 2026»'

  const baseFaq = [
    { q: `Де купити кераміку ручної роботи ${where}?`, a: `У каталозі — ${who(studios.length)} ${where}. Більшість продають напряму: через Instagram, власний сайт, Etsy чи у своїй майстерні; посилання — у профілях. Частина брендів має шоуруми або продається в концепт-сторах.` },
    ...(st.classes ? [{ q: `Де пройти майстер-клас з кераміки ${where}?`, a: `Майстер-класи проводять ${st.classes} ${pluralUk(st.classes, ['місце', 'місця', 'місць'])} з цього списку${mkPage ? ' — окремий перелік з цінами на сторінці майстер-класів міста' : ''}.` }] : []),
    { q: 'Чи можна замовити посуд для закладу чи подарунки для компанії?', a: `${st.venues ? `${st.venues} ${pluralUk(st.venues, ['студія тут згадує', 'студії тут згадують', 'студій тут згадують'])} роботу із закладами. ` : ''}Надішліть один запит — ми передамо його студіям, які роблять подібні вироби, у цьому місті й поруч. Для замовника це безкоштовно.` },
  ]
  const faq = mergeFaq(baseFaq, (content?.faq ?? []).map((f) => ({ q: f.q, a: fixPriceRef(f.a, priceWhere) })))

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-28 lg:pb-16`}>
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
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'За містами', href: '/vyrobnyky/misto' }, { label: city.name }]} modified={latestUpdate(studios)} />
        <span className="kicker">Виробники{region ? ` · ${region}` : ''}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Кераміка ручної роботи: {city.name}</h1>
        {content?.lead && <p className="m-0 max-w-[70ch] text-lg">{content.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</p>}
        <p className={`m-0 max-w-[70ch] ${content?.lead ? '' : 'text-lg'}`}>
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
            <li><Link href={`/mapa?misto=${city.slug}`} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:bg-sand hover:text-ink">Показати на мапі →</Link></li>
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {content && <PlaceStory c={content} known={known} title={`Кераміка ${where}: що тут роблять`} />}
          {content && <PlacePicks c={content} known={known} />}
          {prices.length > 0 && (
            <section aria-labelledby="prices">
              <SectionHead kicker="Ціни" title={`Ціни ${where}`} id="prices">
                <p className="m-0 text-sm text-umber">З прайсів студій цього міста: одна ціна на студію, від найнижчої до найвищої. Порівняння з усією Україною — на сторінці <Link href="/tsiny-2026">«Ціни 2026»</Link>.</p>
              </SectionHead>
              <div className="overflow-x-auto rounded-2xl bg-card">
                <table className="w-full border-collapse text-[14.5px]">
                  <thead>
                    <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                      <th className="border-b border-line px-3.5 py-3">Що</th>
                      <th className="border-b border-line px-3.5 py-3 whitespace-nowrap">Ціни</th>
                      <th className="border-b border-line px-3.5 py-3">Медіана</th>
                      <th className="hidden border-b border-line px-3.5 py-3 sm:table-cell">Студій</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => (
                      <tr key={p.cat.key}>
                        <td className="border-b border-line px-3.5 py-2.5">{p.cat.label} <span className="text-[12.5px] text-umber">{p.cat.unit}<span className="sm:hidden"> · {p.n} {pluralUk(p.n, ['студія', 'студії', 'студій'])}</span></span></td>
                        <td className="border-b border-line px-3.5 py-2.5 whitespace-nowrap">{p.text}</td>
                        <td className="border-b border-line px-3.5 py-2.5 whitespace-nowrap">{p.median ? `${fmt(p.median)} грн` : '—'}</td>
                        <td className="hidden border-b border-line px-3.5 py-2.5 sm:table-cell">{p.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
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

          {content && <PlaceSeeAlso c={content} known={known} />}

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
          {content && <PlaceSources c={content} />}
        </div>
        <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24 lg:self-start">
          <RequestForm sourcePage={`/vyrobnyky/misto/${city.slug}`} defaultWhat="tableware" defaultCity={city.name} />
        </aside>
      </div>
      <MobileRequestBar />
    </main>
  )
}
