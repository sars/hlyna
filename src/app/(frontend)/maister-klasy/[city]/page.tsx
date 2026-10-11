import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { latestUpdate } from '@/lib/catalog'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { facts } from '@/lib/facts'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { pickVerse } from '@/content/verses'
import { fmt, getAllStudios, groupByCity, hasFormat, igHandle, MIN_LIST, offersMasterClasses, pluralUk, TYPE_LABEL, type Format, type StudioCard } from '@/lib/catalog'
import { cleanName, firstAddress, inCity, oblastLabel, staleNote, type Span } from '@/lib/present'
import { scopeSpan, studioPrice } from '@/lib/priceIndex'
import { cityContent } from '@/lib/places'
import { certificateCities } from '@/lib/topics'
import { FORMAT_PAGES as WAVE_FORMATS, formatCityData, formatCityId, hasCopy, type FormatSlug } from '@/lib/waveA'

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

const places = (n: number) => `${fmt(n)} ${pluralUk(n, ['місце', 'місця', 'місць'])}`
const priceText = (r: Span | null) => r?.text ?? ''

// Format chips per studio (from tags), in the order people choose by.
const CHIPS: [Format, string][] = [
  ['wheel', 'гончарне коло'],
  ['handbuilding', 'ліплення'],
  ['painting', 'розпис'],
  ['couples', 'для двох'],
  ['kids', 'для дітей'],
  ['courses', 'курси'],
  ['certificates', 'сертифікати'],
  ['corporate-workshop', 'корпоративи'],
]
// Tag → wave A format slug (/maister-klasy/<city>/<slug>).
const SLUG_OF: Partial<Record<Format, FormatSlug>> = { wheel: 'honcharne-kolo', handbuilding: 'lipennya', painting: 'rozpys', couples: 'dlya-dvokh', kids: 'dlya-ditey', courses: 'kursy' }
const FORMAT_PAGES: [Format, string, string][] = [
  ['wheel', 'Гончарне коло', '/maister-klasy/honcharne-kolo'],
  ['handbuilding', 'Ліплення з глини', '/maister-klasy/lipennya'],
  ['painting', 'Розпис кераміки', '/maister-klasy/rozpys'],
  ['couples', 'Для двох', '/maister-klasy/dlya-dvokh'],
  ['kids', 'Для дітей', '/maister-klasy/dlya-ditey'],
  ['courses', 'Курси й абонементи', '/maister-klasy/kursy'],
]

// The studio's own single-class price (adults, per person): the same number /tsiny-2026 counts for it.
const minClass = (s: StudioCard) => studioPrice(s, 'group')

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const g = await cityData((await params).city)
  if (!g) return {}
  const r = scopeSpan(g.studios, 'group')
  const n = g.studios.length
  return {
    title: `Майстер-класи з кераміки ${inCity(g.city.name)}: ${places(n)} і ціни 2026`,
    description: `${places(n)} ${inCity(g.city.name)}, де проводять майстер-класи з гончарства, ліплення і розпису${r ? `; разове заняття коштує ${priceText(r)}` : ''}. Формати, адреси, сертифікати.`,
    alternates: { canonical: `/maister-klasy/${g.city.slug}` },
    openGraph: { images: ogImage({ title: `Майстер-класи з кераміки: ${g.city.name}`, kicker: 'Майстер-класи · 2026', sub: r ? `${places(n)}, ${priceText(r)}` : places(n), pattern: g.city.slug as string, coa: g.city.slug as string }) },
  }
}

export default async function CityMasterClassesPage({ params }: Args) {
  const g = await cityData((await params).city)
  if (!g) notFound()
  const { city, studios } = g
  const where = inCity(city.name)
  const region = oblastLabel(city)
  const r = scopeSpan(studios, 'group')
  const priced = r?.n ?? 0
  // Studios with a known class price first, then those with Instagram, then by name.
  const sorted = [...studios].sort((a, b) => Number(minClass(b) !== null) - Number(minClass(a) !== null) || Number(!!b.instagram) - Number(!!a.instagram) || a.name.localeCompare(b.name, 'uk'))
  const hasCertPage = (await certificateCities()).some((c) => c.slug === city.slug)
  const count = (f: Format) => studios.filter((s) => hasFormat(s, f)).length
  const formatLinks = FORMAT_PAGES.filter(([f]) => count(f) >= 2)
  // A format with its own page for this city (wave A copy written, enough places) links there instead.
  const cityFormat = new Set<FormatSlug>()
  for (const slug of Object.keys(WAVE_FORMATS) as FormatSlug[])
    if (hasCopy(formatCityId(city.slug!, slug)) && (await formatCityData(city.slug!, slug)).data.all.length >= MIN_LIST) cityFormat.add(slug)
  const breakdown = ([['wheel', 'на гончарному колі'], ['couples', 'для двох'], ['kids', 'для дітей']] as [Format, string][])
    .filter(([f]) => count(f))
    .map(([f, label]) => `${label} — ${count(f)}`)

  const f = await facts()
  const faq = [
    {
      q: `Скільки коштує майстер-клас з кераміки ${where}?`,
      a: r
        ? `За прайсами ${priced} ${pluralUk(priced, ['студії', 'студій', 'студій'])} міста разовий майстер-клас коштує ${priceText(r)}. Групове заняття дешевше за індивідуальне; випал і полива іноді оплачуються окремо. Курси й абонементи рахуються окремо.`
        : `Студії міста здебільшого не публікують ціни. По Україні разовий майстер-клас коштує ${f.range('group')}, індивідуальний — ${f.range('private')}.`,
    },
    { q: 'Коли можна забрати свій виріб?', a: `Зазвичай через ${site.lead.pickup}: виріб має висохнути і пройти два випали (до і після поливи). Деякі студії надсилають готові вироби Новою поштою.` },
    { q: 'Чи можна подарувати майстер-клас?', a: 'Так, більшість студій продають подарункові сертифікати; термін дії найчастіше 3–6 місяців. Умови — у профілі студії.' },
    { q: 'А для команди?', a: `Корпоратив з ліплення з глини проводять у студії або у вашому офісі; по Україні — ${f.range('corporate')}. Надішліть запит — ми передамо його кільком студіям.` },
  ]

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Майстер-класи з кераміки: ${city.name}`,
          numberOfItems: sorted.length,
          itemListElement: sorted.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'LocalBusiness',
              name: cleanName(s.name),
              url: `${site.url}/vyrobnyky/${s.slug}`,
              address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(firstAddress(s.address) ? { streetAddress: firstAddress(s.address) } : {}) },
            },
          })),
        }}
      />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, { label: city.name }]} modified={latestUpdate(studios)} />
        <span className="kicker">Майстер-класи{region ? ` · ${region}` : ''}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Майстер-класи з кераміки: {city.name}</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          У каталозі «Глина» — {places(studios.length)} {where}, де проводять заняття з гончарства, ліплення чи розпису кераміки
          {breakdown.length ? `: ${breakdown.join(', ')}` : ''}.
          {r ? ` Разовий майстер-клас коштує ${priceText(r)} (за прайсами ${priced} ${pluralUk(priced, ['студії', 'студій', 'студій'])}, ${site.dataUpdated}).` : ''} Нижче — кожна студія з форматами й цінами; один запит можна надіслати одразу кільком.
        </p>
        {cityContent(city.slug as string)?.lead && (
          <p className="m-0 max-w-[70ch] text-[15.5px] text-umber">
            {cityContent(city.slug as string)!.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}{' '}
            <Link href={`/vyrobnyky/misto/${city.slug}`}>Більше про кераміку {where} →</Link>
          </p>
        )}
        <Updated />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {studios.length >= 8 && <Epigraph lines={pickVerse(city.slug as string)} />}

          <section aria-labelledby="list">
            <SectionHead title={`Де пройти майстер-клас ${where}`} id="list">
              <p className="m-0 text-sm text-umber">«Від» — найнижча ціна разового заняття з прайсу студії. Курси, абонементи й корпоративи — у профілі.</p>
            </SectionHead>
            <ul className="m-0 grid grid-cols-1 list-none gap-2.5 p-0">
              {sorted.map((s) => {
                const from = minClass(s)
                const chips = CHIPS.filter(([f]) => hasFormat(s, f))
                const addr = firstAddress(s.address)
                const stale = staleNote(s)
                return (
                  <li key={s.id} className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-2xl bg-card px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid grid-cols-1 gap-1">
                      <Link href={`/vyrobnyky/${s.slug}`} className="text-[16.5px] leading-snug font-semibold">
                        {cleanName(s.name)}
                      </Link>
                      <span className="text-[13px] break-words text-umber">
                        {TYPE_LABEL[s.type ?? 'other']}
                        {addr ? ` · ${addr}` : ''}
                        {s.instagram ? (
                          <>
                            {' · '}
                            <a href={s.instagram} target="_blank" rel="noopener nofollow" className="text-umber">
                              @{igHandle(s.instagram)}
                            </a>
                          </>
                        ) : null}
                      </span>
                      {stale && <span className="text-[12.5px] text-terra">{stale}</span>}
                      {chips.length > 0 && (
                        <span className="flex flex-wrap gap-1.5 pt-0.5">
                          {chips.map(([f, label]) => (
                            <span key={f} className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-umber">
                              {label}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    {from ? <span className="text-[15px] font-semibold whitespace-nowrap text-terra sm:text-right">від {fmt(from)} грн</span> : null}
                  </li>
                )
              })}
            </ul>
          </section>

          {(formatLinks.length > 0 || hasCertPage) && (
            <nav aria-label="Формати" className="grid grid-cols-1 gap-3">
              <p className="kicker m-0">За форматом</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {hasCertPage && (
                  <li>
                    <Link href={`/sertyfikaty/${city.slug}`} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                      Сертифікати: {city.name}
                    </Link>
                  </li>
                )}
                {formatLinks.map(([f, label, href]) => (
                  <li key={f}>
                    <Link href={SLUG_OF[f] && cityFormat.has(SLUG_OF[f]!) ? `/maister-klasy/${city.slug}/${SLUG_OF[f]}` : href} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

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
          <RequestForm sourcePage={`/maister-klasy/${city.slug}`} defaultWhat="master-class" defaultCity={city.name} />
          <Link href="/dlya-biznesu/korporatyv-lipennya-z-hlyny" className="rounded-[20px] bg-cobalt p-4 text-clay no-underline hover:text-clay">
            <b className="font-display text-sm uppercase">Для команди</b>
            <span className="mt-1 block text-sm">Корпоратив з ліплення з глини: у студії або в офісі, {f.range('corporate')}. →</span>
          </Link>
        </aside>
      </div>
    </main>
  )
}
