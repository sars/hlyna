import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { StudioCard } from '@/components/site/StudioCard'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { pickVerse } from '@/content/verses'
import { fmt, getAllStudios, groupByCity, hryvniaAmounts, igHandle, MIN_LIST, offersMasterClasses, pluralUk, range, TYPE_LABEL } from '@/lib/catalog'

export const revalidate = 86400

async function cityData(slug: string) {
  const groups = groupByCity((await getAllStudios()).filter(offersMasterClasses))
  const g = groups.find((x) => x.city.slug === slug)
  return g && g.studios.length >= MIN_LIST ? g : null
}

export async function generateStaticParams() {
  try {
    return groupByCity((await getAllStudios()).filter(offersMasterClasses))
      .filter((g) => g.studios.length >= MIN_LIST)
      .map((g) => ({ city: g.city.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const g = await cityData((await params).city)
  if (!g) return {}
  const r = range(g.studios.flatMap(hryvniaAmounts))
  return {
    title: `Майстер-класи з кераміки: ${g.city.name} — ${g.studios.length} ${pluralUk(g.studios.length, ['студія', 'студії', 'студій'])} і ціни 2026`,
    description: `${g.studios.length} ${pluralUk(g.studios.length, ['місце', 'місця', 'місць'])} у місті ${g.city.name}, де проводять майстер-класи з гончарства і ліплення з глини${r ? `; ціни в прайсах від ${fmt(r.min)} до ${fmt(r.max)} грн` : ''}. Формати, сертифікати, контакти.`,
    alternates: { canonical: `/maister-klasy/${g.city.slug}` },
    openGraph: { images: ogImage({ title: `Майстер-класи з кераміки: ${g.city.name}`, kicker: 'Майстер-класи · 2026', sub: r ? `${g.studios.length} ${pluralUk(g.studios.length, ['місце', 'місця', 'місць'])}, ціни в прайсах від ${fmt(r.min)} до ${fmt(r.max)} грн` : undefined, pattern: g.city.slug as string, coa: g.city.slug as string }) },
  }
}

export default async function CityMasterClassesPage({ params }: Args) {
  const g = await cityData((await params).city)
  if (!g) notFound()
  const { city, studios } = g
  const amounts = studios.flatMap(hryvniaAmounts)
  const r = range(amounts)
  const withPrices = studios.filter((s) => hryvniaAmounts(s).length).length
  const sorted = [...studios].sort((a, b) => (b.prices?.length ?? 0) - (a.prices?.length ?? 0))

  const faq = [
    {
      q: `Скільки коштує майстер-клас з кераміки: ${city.name}?`,
      a: r
        ? `У прайсах ${withPrices} студій міста трапляються ціни від ${fmt(r.min)} до ${fmt(r.max)} грн; середина діапазону — близько ${fmt(r.median)} грн. Групові заняття зазвичай дешевші за індивідуальні; випал і полива іноді оплачуються окремо.`
        : `Студії міста здебільшого не публікують ціни. По Україні груповий майстер-клас коштує приблизно ${site.prices.groupClass}, індивідуальний — ${site.prices.privateClass}.`,
    },
    { q: 'Коли можна забрати свій виріб?', a: 'Зазвичай через 2–4 тижні: виріб має висохнути і пройти два випали (до і після поливи). Деякі студії надсилають готові вироби Новою поштою.' },
    { q: 'Чи можна подарувати майстер-клас?', a: 'Так, більшість студій продають подарункові сертифікати; термін дії найчастіше 3–6 місяців. Умови — у профілі студії.' },
    { q: 'А для команди?', a: `Корпоратив з ліплення з глини проводять у студії або у вашому офісі; по Україні це ${site.prices.corporate}. Надішліть запит — ми передамо його кільком студіям.` },
  ]

  return (
    <main className={`${container} grid gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Майстер-класи з кераміки: ${city.name}`,
          itemListElement: sorted.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/vyrobnyky/${s.slug}`, name: s.name })),
        }}
      />
      <div className="grid gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, { label: city.name }]} />
        <span className="kicker">Майстер-класи · {city.oblast || 'Україна'}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Майстер-класи з кераміки: {city.name}</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі «Глина» — {studios.length} {pluralUk(studios.length, ['місце', 'місця', 'місць'])} у місті {city.name}, де проводять заняття з гончарства чи ліплення з глини.
          {r ? ` У прайсах студій трапляються ціни від ${fmt(r.min)} до ${fmt(r.max)} грн (дані ${site.dataUpdated}).` : ''} Нижче — студії, формати й контакти; один запит можна надіслати одразу кільком.
        </p>
        <Updated />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid gap-10">
          <Epigraph lines={pickVerse(city.slug as string)} />

          <section aria-labelledby="list">
            <SectionHead title={`Студії: ${city.name}`} id="list" />
            <div className="overflow-x-auto rounded-2xl bg-card">
              <table className="w-full min-w-[560px] border-collapse text-[14.5px] [font-variant-numeric:lining-nums_tabular-nums]">
                <thead>
                  <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                    <th className="border-b border-line px-3.5 py-3">Назва</th>
                    <th className="border-b border-line px-3.5 py-3">Тип</th>
                    <th className="border-b border-line px-3.5 py-3">Ціни з прайсу</th>
                    <th className="border-b border-line px-3.5 py-3">Instagram</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const sr = range(hryvniaAmounts(s))
                    return (
                      <tr key={s.id}>
                        <td className="border-b border-line px-3.5 py-3"><Link href={`/vyrobnyky/${s.slug}`}>{s.name}</Link></td>
                        <td className="border-b border-line px-3.5 py-3">{TYPE_LABEL[s.type ?? 'other']}</td>
                        <td className="border-b border-line px-3.5 py-3">{sr ? (sr.min === sr.max ? `${fmt(sr.min)} грн` : `${fmt(sr.min)}–${fmt(sr.max)} грн`) : '—'}</td>
                        <td className="border-b border-line px-3.5 py-3">{s.instagram ? <a href={s.instagram} target="_blank" rel="noopener nofollow">@{igHandle(s.instagram)}</a> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="cards">
            <SectionHead title="Профілі" id="cards" />
            <div className="grid gap-3 sm:grid-cols-2">{sorted.map((s) => <StudioCard key={s.id} s={s} showCity={false} />)}</div>
          </section>

          <section aria-labelledby="faq">
            <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
            <div className="grid gap-2.5">
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
                  <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">{f.q}<span aria-hidden className="font-display text-terra group-open:hidden">+</span><span aria-hidden className="font-display hidden text-terra group-open:inline">–</span></summary>
                  <p className="mt-0 mb-3.5">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <RequestForm sourcePage={`/maister-klasy/${city.slug}`} />
          <Link href="/dlya-biznesu/korporatyv-lipennya-z-hlyny" className="rounded-[20px] bg-cobalt p-4 text-clay no-underline hover:text-clay">
            <b className="font-display text-sm uppercase">Для команди</b>
            <span className="mt-1 block text-sm">Корпоратив з ліплення з глини: у студії або в офісі, {site.prices.corporate}. →</span>
          </Link>
        </aside>
      </div>
    </main>
  )
}
