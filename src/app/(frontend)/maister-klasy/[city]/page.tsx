import type { Metadata } from 'next'
import { Block, InnerCols, InnerHero, InnerMain } from '@/components/site/Inner'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { CtaBand } from '@/components/ui/CtaBand'
import { Epigraph } from '@/components/ui/Epigraph'
import { Faq } from '@/components/ui/Faq'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { SideBox } from '@/components/ui/SideBox'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import { latestUpdate } from '@/lib/catalog'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { facts } from '@/lib/facts'
import { site } from '@/content/site'
import { ogImage } from '@/lib/ogImage'
import { pickVerse } from '@/content/verses'
import { centreOf, cityPages, getAllStudios, giftCertificate, hasFormat, MIN_LIST, offersMasterClasses, pluralUk, TYPE_LABEL, type Format, type StudioCard } from '@/lib/catalog'
import { displayName, firstAddress, inCity, oblastGen, oblastLabel, pageName, pageWhere } from '@/lib/present'
import { scopeSpan, studioPrice } from '@/lib/priceIndex'
import { MK_CHIPS as CHIPS } from '@/lib/mkChips'
import { cityContent } from '@/editorial/places'
import { certificateCities } from '@/editorial/topics'
import { FORMAT_PAGES as WAVE_FORMATS, formatCityData, formatCityId, hasCopy, type FormatSlug } from '@/editorial/wave-a'
import { fmt, type Span } from '@/lib/money'
import { fitTitle } from '@/lib/title'
import { redirectOldCitySlug } from '@/lib/redirects'

export const revalidate = 86400

// Every oblast centre with a class place (its page covers the oblast) and any other town with MIN_LIST places.
const mkPages = async () => cityPages((await getAllStudios()).filter(offersMasterClasses))
const cityData = async (slug: string) => (await mkPages()).find((p) => p.city.slug === slug) ?? null

export async function generateStaticParams() {
  try {
    return (await mkPages()).map((g) => ({ city: g.city.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string }> }

const places = (n: number) => `${fmt(n)} ${pluralUk(n, ['місце', 'місця', 'місць'])}`
const priceText = (r: Span | null) => r?.text ?? ''

// Format chips per studio (from tags), in the order people choose by.
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
  const where = pageWhere(g)
  return {
    title: fitTitle([`Майстер-класи з кераміки ${where}: ${places(n)} і ціни 2026`, `Майстер-класи з кераміки ${where}: ${places(n)}`, `Майстер-класи з кераміки ${where}`]),
    description: `${places(n)} ${where}, де проводять майстер-класи з гончарства, ліплення і розпису${r ? `; разове заняття коштує ${priceText(r)}` : ''}. Формати, адреси, сертифікати.`,
    alternates: { canonical: `/maister-klasy/${g.city.slug}` },
    openGraph: { images: ogImage({ title: `Майстер-класи з кераміки: ${pageName(g)}`, kicker: 'Майстер-класи', sub: 'Гончарне коло, ліплення і розпис: студії, адреси, формати й сертифікати', img: 'og-318-1' }) },
  }
}

export default async function CityMasterClassesPage({ params }: Args) {
  const citySlug = (await params).city
  const g = await cityData(citySlug)
  if (!g) {
    await redirectOldCitySlug(citySlug, (c) => `/maister-klasy/${c}`)
    notFound()
  }
  const { city, studios, towns } = g
  const name = pageName(g)
  const where = pageWhere(g)
  const region = oblastLabel(city)
  // On a centre's page the centre's own places come first, then the rest of the oblast with the town on each row.
  const own = studios.filter((s) => s.cityDoc?.slug === city.slug)
  const rest = towns.flatMap((t) => t.studios)
  const pages = await mkPages()
  const hasPage = new Set(pages.map((p) => p.city.slug))
  const hub = towns.length || centreOf(city) === city.slug ? null : (pages.find((p) => p.city.slug === centreOf(city)) ?? null)
  const r = scopeSpan(studios, 'group')
  const priced = r?.n ?? 0
  // Studios with a known class price first, then those with Instagram, then by name.
  const byPrice = (a: StudioCard, b: StudioCard) => Number(minClass(b) !== null) - Number(minClass(a) !== null) || Number(!!b.instagram) - Number(!!a.instagram) || a.name.localeCompare(b.name, 'uk')
  const sorted = [...own].sort(byPrice)
  const sortedRest = towns.flatMap((t) => [...t.studios].sort(byPrice))
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

  // Who on this page sells gift certificates, from the studios' own texts (never a claim about «most studios»).
  const certs = [...sorted, ...sortedRest].flatMap((st) => {
    const c = giftCertificate(st)
    return c ? [`${displayName(st)}${c.valid ? ` (дійсний ${c.valid})` : ''}`] : []
  })
  const CERT_NAMES = 6
  const certAnswer = certs.length
    ? `Так. Подарункові сертифікати згадано в профілях ${certs.length} з ${studios.length} ${pluralUk(studios.length, ['місця', 'місць', 'місць'])} на цій сторінці: ${certs.slice(0, CERT_NAMES).join(', ')}${certs.length > CERT_NAMES ? ` і ще ${certs.length - CERT_NAMES}` : ''}. Суми й умови — у профілях.${hasCertPage ? ` Усі сертифікати ${inCity(city.name)} — на сторінці «Сертифікати: ${city.name}».` : ''}`
    : `У профілях студій ${where} сертифікати не згадано — запитайте студію напряму. Сертифікати на гончарство по всій Україні — на сторінці «Сертифікати».`
  const f = await facts()
  const faq = [
    {
      q: `Скільки коштує майстер-клас з кераміки ${where}?`,
      a: r
        ? `За прайсами ${priced} ${pluralUk(priced, ['студії', 'студій', 'студій'])} ${where} разовий майстер-клас коштує ${priceText(r)}. Групове заняття дешевше за індивідуальне; випал і полива іноді оплачуються окремо. Курси й абонементи рахуються окремо.`
        : `Студії ${where} здебільшого не публікують ціни. По Україні разовий майстер-клас коштує ${f.range('group')}, індивідуальний — ${f.range('private')}.`,
    },
    { q: 'Коли можна забрати свій виріб?', a: `Зазвичай через ${site.lead.pickup}: виріб має висохнути і пройти два випали (до і після поливи). Деякі студії надсилають готові вироби Новою поштою.` },
    { q: 'Чи можна подарувати майстер-клас?', a: certAnswer },
    { q: 'А для команди?', a: `Корпоратив з ліплення з глини проводять у студії або у вашому офісі; по Україні — ${f.range('corporate')}. Надішліть запит — ми передамо його кільком студіям.` },
  ]

  const chipsOf = (st: StudioCard) => CHIPS.filter(([fm]) => hasFormat(st, fm)).map(([, label]) => ({ label, tone: 'ink' as const }))
  const placeLead = cityContent(city.slug as string)?.lead
  const strip = r
    ? [
        { value: fmt(studios.length), label: pluralUk(studios.length, ['місце', 'місця', 'місць']) + ' з майстер-класами' },
        { value: `${fmt(r.min)}–${fmt(r.max)}`, label: 'грн разовий майстер-клас з особи' },
        { value: fmt(priced), label: pluralUk(priced, ['студія', 'студії', 'студій']) + ' з ціною в прайсі' },
      ]
    : undefined
  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Майстер-класи з кераміки: ${name}`,
          numberOfItems: studios.length,
          itemListElement: [...sorted, ...sortedRest].map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'LocalBusiness',
              name: displayName(s),
              url: `${site.url}/vyrobnyky/${s.slug}`,
              address: { '@type': 'PostalAddress', addressLocality: s.cityDoc?.name ?? city.name, addressCountry: 'UA', ...(firstAddress(s.address) ? { streetAddress: firstAddress(s.address) } : {}) },
            },
          })),
        }}
      />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, ...(hub ? [{ label: pageName(hub), href: `/maister-klasy/${hub.city.slug}` }] : []), { label: name }]}
        modified={latestUpdate(studios)}
        kicker={`Майстер-класи${region ? ` · ${region}` : ''}`}
        title={`Майстер-класи з кераміки: ${name}`}
        lead={
          <>
            <p className="m-0">
              У каталозі «Глина» — {places(studios.length)} {where}, де проводять заняття з гончарства, ліплення чи розпису кераміки
          {breakdown.length ? `: ${breakdown.join(', ')}` : ''}.
          {rest.length ? ` З них ${fmt(own.length)} — ${inCity(city.name)}, ${fmt(rest.length)} — в області: ${towns.map((t) => (t.studios.length > 1 ? `${t.city.name} (${t.studios.length})` : t.city.name)).join(', ')}.` : ''}
          {r ? ` Разовий майстер-клас коштує ${priceText(r)} (за прайсами ${priced} ${pluralUk(priced, ['студії', 'студій', 'студій'])}, ${site.dataUpdated}).` : ''} Нижче — кожна студія з форматами й цінами; один запит можна надіслати одразу кільком.
            </p>
            {placeLead && (
              <p className="m-0 text-[15.5px] text-ink-2">
                {placeLead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}{' '}
                <Link href={`/vyrobnyky/misto/${city.slug}`}>Більше про кераміку {inCity(city.name)} →</Link>
              </p>
            )}
          </>
        }
        strip={strip}
        chips={[]}
        actions={
          <>
            <Button href="#zapyt-forma" variant="cobalt" arrow>
              Отримати пропозиції
            </Button>
            <Button href={`/mapa?misto=${city.slug}`} variant="ghost">
              Показати на мапі
            </Button>
          </>
        }
      />

      <InnerCols
        aside={
          <>
            <RequestForm sourcePage={`/maister-klasy/${city.slug}`} defaultWhat="master-class" defaultCity={city.name} />
            <SideBox title="Для команди">
              <p className="m-0">
                <Link href="/dlya-biznesu/korporatyv-lipennya-z-hlyny">Корпоратив з ліплення з глини: у студії або в офісі, {f.range('corporate')}. →</Link>
              </p>
            </SideBox>
          </>
        }
      >
        {studios.length >= 8 && <Epigraph lines={pickVerse(city.slug as string)} />}

        <Block id="list" title={`Де пройти майстер-клас ${inCity(city.name)}`} note={<>Ціна — разове групове заняття для дорослих з прайсу студії. Курси, абонементи й корпоративи — у профілі.</>}>
          <MakerRows>
            {sorted.map((st) => {
              const from = minClass(st)
              return <MakerRow key={st.id} s={st} typeLabel={TYPE_LABEL[st.type ?? 'other']} showAbout={false} chips={chipsOf(st)} price={from ? { value: `${fmt(from)} грн`, unit: 'з особи' } : undefined} />
            })}
          </MakerRows>
        </Block>

        {rest.length > 0 && (
          <Block
            id="oblast"
            title={`Ще в області · ${rest.length}`}
            note={
              <>
                {oblastGen(towns)}: біля кожного місця — його місто чи село.
                {towns
                  .filter((t) => hasPage.has(t.city.slug))
                  .map((t) => (
                    <React.Fragment key={t.city.slug}>
                      {' '}
                      <Link href={`/maister-klasy/${t.city.slug}`}>Окрема сторінка: {t.city.name} →</Link>
                    </React.Fragment>
                  ))}
              </>
            }
          >
            <MakerRows>
              {sortedRest.map((st) => {
                const from = minClass(st)
                return <MakerRow key={st.id} s={st} place={st.cityDoc?.name ?? undefined} typeLabel={TYPE_LABEL[st.type ?? 'other']} showAbout={false} chips={chipsOf(st)} price={from ? { value: `${fmt(from)} грн`, unit: 'з особи' } : undefined} />
              })}
            </MakerRows>
          </Block>
        )}

        {(formatLinks.length > 0 || hasCertPage) && (
          <ChipGroup as="nav" label="За форматом" aria-label="Формати">
            {hasCertPage && <Chip href={`/sertyfikaty/${city.slug}`}>Сертифікати: {city.name}</Chip>}
            {formatLinks.map(([fm, label, href]) => (
              <Chip key={fm} href={SLUG_OF[fm] && cityFormat.has(SLUG_OF[fm]!) ? `/maister-klasy/${city.slug}/${SLUG_OF[fm]}` : href}>
                {label}
              </Chip>
            ))}
          </ChipGroup>
        )}

        <Faq id="faq" kicker="Питання і відповіді" title="Часті питання" items={faq} openFirst jsonLd={false} />
        <CtaBand tone="ink" className="max-lg:hidden" title="Опишіть, що потрібно, — передамо студіям, які роблять подібне" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />
      </InnerCols>
      <MobileRequestBar />
    </InnerMain>
  )
}
