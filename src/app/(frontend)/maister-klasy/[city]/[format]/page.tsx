import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { StudioList } from '@/components/site/TopicPage'
import { WavePage } from '@/components/site/WavePage'
import { getAllStudios, MIN_LIST } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { FORMAT_PAGES, fillCopy, formatCityData, formatCityId, isFormatSlug, liveFormatCityPages, waveCopy, type FormatSlug } from '@/lib/waveA'
import { ogImage } from '@/utilities/ogImage'

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

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { city, format } = await params
  const p = await load(city, format)
  if (!p) return {}
  const path = `/maister-klasy/${city}/${format}`
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: path },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: FORMAT_PAGES[format as FormatSlug].label, sub: p.vars.priceRange ? `${p.vars.places} · ${p.vars.priceRange}` : String(p.vars.places), coa: city, pattern: city }) },
  }
}

export default async function Page({ params }: Args) {
  const { city, format } = await params
  const p = await load(city, format)
  if (!p) notFound()
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  const f = FORMAT_PAGES[format as FormatSlug]
  const path = `/maister-klasy/${city}/${format}`
  const others = (Object.keys(FORMAT_PAGES) as FormatSlug[]).filter((x) => x !== format)
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
      related={[
        { label: `Усі майстер-класи ${p.vars.inCity}`, href: `/maister-klasy/${city}` },
        { label: `${f.label}: усі міста`, href: p.topic.path },
        ...others.map((x) => ({ label: FORMAT_PAGES[x].label, href: topicsPath(x) })),
      ]}
    >
      <section aria-labelledby="list">
        <SectionHead title={`Де ${f.short === 'курси' ? 'пройти курс' : 'записатися'} ${p.vars.inCity}`} id="list">
          <p className="m-0 text-sm text-umber">Список за відкритими даними студій (сайти, Instagram, сервіси сертифікатів). Умови кожна студія підтверджує сама.</p>
        </SectionHead>
        <StudioList studios={p.data.all} re={p.topic.evidence} />
      </section>
      {p.data.examples.length > 0 && (
        <section aria-labelledby="prices">
          <SectionHead kicker="Ціни" title={p.topic.price.title} id="prices">
            <p className="m-0 text-sm text-umber">{p.topic.price.note}</p>
          </SectionHead>
          {p.vars.priceRange && (
            <p className="m-0 mb-3 text-lg">
              Найчастіше в прайсах {p.vars.inCity} — <b>{p.vars.priceRange}</b>.
            </p>
          )}
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
            {p.data.examples.map((e) => (
              <li key={e.studio.id} className="rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                <Link href={`/vyrobnyky/${e.studio.slug}`}>{cleanName(e.studio.name)}</Link>: {e.text}
                {e.source && <span className="text-[12.5px] text-umber"> ({e.source})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </WavePage>
  )
}

const topicsPath = (x: FormatSlug) => `/maister-klasy/${x}`
