import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import React from 'react'

import { Block } from '@/components/site/Inner'
import { site } from '@/content/site'
import { DataTable } from '@/components/ui/DataTable'
import { nobreak } from '@/components/ui/NoBreak'
import { QuoteBlock } from '@/components/ui/QuoteBlock'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { WavePage } from '@/components/site/WavePage'
import { MK_CHIPS } from '@/lib/mkChips'
import { getAllStudios, getAllWithShops, groupByCity, hasFormat, MIN_LIST, offersMasterClasses, pluralUk, TYPE_LABEL } from '@/lib/catalog'
import { fmt } from '@/lib/money'
import { displayName } from '@/lib/present'
import { FORMAT_PAGES, fillCopy, formatCityData, formatCityId, isFormatSlug, liveFormatCityPages, waveCopy, type FormatSlug } from '@/editorial/wave-a'
import { ogImage } from '@/lib/ogImage'
import { redirectOldCitySlug } from '@/lib/redirects'

// One master-class format in one city (e.g. /maister-klasy/kyiv/honcharne-kolo). Exists only where the
// city has at least MIN_LIST places for the format AND the page has its own written copy.
export const revalidate = 86400

export async function generateStaticParams() {
  try {
    return (await liveFormatCityPages()).map((p) => ({ city: p.city, format: p.format }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string; format: string }> }

async function load(city: string, format: string) {
  if (!isFormatSlug(format)) return null
  const raw = waveCopy(formatCityId(city, format))
  if (!raw) return null
  const d = await formatCityData(city, format as FormatSlug)
  if (d.data.all.length < MIN_LIST) return null
  return { ...d, copy: fillCopy(raw, d.vars) }
}

// Card title: the format without the word the kicker already says («Майстер-класи для дітей» → «Для дітей»).
const ogTitle = (label: string) => label.replace(/^Майстер-класи\s+/iu, '').replace(/^./u, (c) => c.toUpperCase())

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { city, format } = await params
  const p = await load(city, format)
  if (!p) return {}
  const path = `/maister-klasy/${city}/${format}`
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: path },
    openGraph: { images: ogImage({ title: ogTitle(FORMAT_PAGES[format as FormatSlug].label), kicker: `Майстер-класи · ${p.place}`, sub: 'Студії, адреси, формати й сертифікати' }) },
  }
}

export default async function Page({ params }: Args) {
  const { city, format } = await params
  const p = await load(city, format)
  if (!p) {
    await redirectOldCitySlug(city, (c) => `/maister-klasy/${c}/${format}`)
    // A written format page whose city dropped below three places for this format: the city's own page still
    // answers the same search (same city, every format), so send people there; a city that lost its page is a 404.
    if (isFormatSlug(format) && waveCopy(formatCityId(city, format))) {
      const g = groupByCity((await getAllStudios()).filter(offersMasterClasses)).find((x) => x.city.slug === city)
      if (g && g.studios.length >= MIN_LIST) permanentRedirect(`/maister-klasy/${city}`)
    }
    notFound()
  }
  const known = new Map((await getAllWithShops()).map((s) => [s.slug!, s]))
  const f = FORMAT_PAGES[format as FormatSlug]
  const path = `/maister-klasy/${city}/${format}`
  const others = (Object.keys(FORMAT_PAGES) as FormatSlug[]).filter((x) => x !== format)
  // The price of each row is the studio's own price for THIS format (the value the lead's range is made of), never
  // a price of another format from the same studio.
  const unit = format === 'dlya-dvokh' ? 'за двох' : format === 'kursy' ? undefined : 'з особи'
  const priced = p.data.all.map((s) => ({ s, v: p.data.priceOf.get(s.id) ?? null }))
  const n = p.data.all.length
  const np = p.data.priceOf.size
  const { min, max } = p.data.ctx
  const strip = [
    { value: fmt(n), label: pluralUk(n, ['місце', 'місця', 'місць']) },
    ...(min && max ? [{ value: min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`, label: `грн ${unit ?? ''} за прайсами`.replace('  ', ' ') }] : []),
    { value: fmt(np), label: pluralUk(np, ['студія', 'студії', 'студій']) + ' з ціною в прайсі' },
  ]
  return (
    <WavePage
      copy={p.copy}
      known={known}
      kicker={`${f.label} · ${p.place}`}
      crumbs={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, { label: p.place, href: `/maister-klasy/${city}` }, { label: f.label }]}
      path={path}
      form="master-class"
      city={p.place}
      studios={p.data.all}
      strip={min && max && np ? strip : undefined}
      cityLinks={others.map((x) => ({ label: FORMAT_PAGES[x].label, href: topicsPath(x) }))}
      chipsLabel="Інші формати:"
      related={[
        { label: `Усі майстер-класи ${p.vars.inCity}`, href: `/maister-klasy/${city}` },
        { label: `${f.label}: усі міста`, href: p.topic.path },
      ]}
    >
      <Block id="list" title={`Де ${f.short === 'курси' ? 'пройти курс' : 'записатися'} ${p.vars.inCity}`} note={<>Список за відкритими даними студій (сайти, Instagram, сервіси сертифікатів). Умови кожна студія підтверджує сама.</>}>
        <MakerRows>
          {[...priced].sort((a, b) => Number(!!b.v) - Number(!!a.v) || a.s.name.localeCompare(b.s.name, 'uk')).map(({ s, v }) => (
            <MakerRow key={s.id} s={s} typeLabel={TYPE_LABEL[s.type ?? 'other']} showAbout={false} chips={MK_CHIPS.filter(([fm]) => hasFormat(s, fm)).map(([, label]) => ({ label, tone: 'ink' as const }))} price={v ? { value: `${fmt(v)} грн`, unit } : undefined} />
          ))}
        </MakerRows>
      </Block>
      {p.data.examples.length > 0 && (
        <Block id="prices" kicker="Ціни" title={p.topic.price.title} note={p.topic.price.note}>
          {p.vars.priceRange && (
            <QuoteBlock source={`За прайсами місць з цієї сторінки, ${site.dataUpdated}`}>
              Найчастіше в прайсах {p.vars.inCity} — <b className="font-semibold">{nobreak(String(p.vars.priceRange))}</b>.{' '}
              <span className="text-ink-2">
                Це ціни лише місць із цієї сторінки, по одній на студію; загальну ціну разового майстер-класу в місті дивіться на <Link href={`/maister-klasy/${city}`}>сторінці міста</Link> і в «<Link href="/tsiny-2026">Цінах 2026</Link>».
              </span>
            </QuoteBlock>
          )}
          <DataTable
            columns={[{ key: 'studio', label: 'Студія' }, { key: 'price', label: 'З прайсу' }, { key: 'src', label: 'Джерело', mono: true }]}
            rows={p.data.examples.map((e) => ({ studio: <Link href={`/vyrobnyky/${e.studio.slug}`}>{displayName(e.studio)}</Link>, price: nobreak(e.text), src: e.source ?? '' }))}
          />
        </Block>
      )}
    </WavePage>
  )
}

const topicsPath = (x: FormatSlug) => `/maister-klasy/${x}`
