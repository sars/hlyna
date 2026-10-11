import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { WavePage } from '@/components/site/WavePage'
import { getAllStudios, type StudioCard } from '@/lib/catalog'
import { cleanName, firstAddress } from '@/lib/present'
import { fillCopy, waveCopy, whereToBuyData } from '@/editorial/wave-a'
import { ogImage } from '@/utilities/ogImage'

// Where to buy contemporary Ukrainian ceramics: shops and galleries by city, makers' own online shops, Etsy.
export const revalidate = 86400
const ID = 'de-kupyty-keramiku'
const PATH = '/de-kupyty-keramiku'

async function load() {
  const raw = waveCopy(ID)
  if (!raw) return null
  const d = await whereToBuyData()
  return { ...d, copy: fillCopy(raw, d.vars) }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load()
  if (!p) return {}
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: PATH },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Де купити', pattern: 'shops' }) },
  }
}


function ShopRow({ s, brands }: { s: StudioCard; brands?: string }) {
  const addr = firstAddress(s.address)
  return (
    <li className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
      <Link href={`/vyrobnyky/${s.slug}`} className="font-bold">{cleanName(s.name)}</Link>
      {addr && <span className="text-umber">{addr}</span>}
      {brands && <span className="text-umber">{brands}</span>}
    </li>
  )
}

export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  const brandsBySlug = new Map(p.stockists.filter((x) => x.slug).map((x) => [x.slug!, x.brands]))
  return (
    <WavePage
      copy={p.copy}
      known={known}
      kicker="Де купити"
      crumbs={[{ label: 'Головна', href: '/' }, { label: 'Де купити кераміку' }]}
      path={PATH}
      form="other"
      studios={p.shops}
      related={[
        { label: 'Виробники за містами', href: '/vyrobnyky/misto' },
        { label: 'Вироби', href: '/vyrobnyky/vyrib' },
        { label: 'Ціни 2026', href: '/tsiny-2026' },
        { label: 'Мапа студій', href: '/mapa' },
      ]}
    >
      <section aria-labelledby="shops">
        <SectionHead title="Магазини й галереї за містами" id="shops" />
        <div className="grid grid-cols-1 gap-6">
          {p.shopCities.map((g) => (
            <div key={g.city.slug} id={`misto-${g.city.slug}`} className="grid grid-cols-1 gap-2 scroll-mt-24">
              <h3 className="m-0 text-lg">{g.city.name}</h3>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {g.studios.map((s) => <ShopRow key={s.id} s={s} brands={brandsBySlug.get(s.slug!)} />)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {p.etsy.length > 0 && (
        <section aria-labelledby="etsy">
          <SectionHead title="Українські керамісти на Etsy" id="etsy">
            <p className="m-0 text-sm text-umber">Магазини з локацією в Україні; кількість продажів і відгуків — з вітрини Etsy на момент перевірки.</p>
          </SectionHead>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {p.etsy.map((e) => (
              <li key={e.url} className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                {e.slug && known.has(e.slug) ? <Link href={`/vyrobnyky/${e.slug}`} className="font-bold">{e.name ?? e.shop}</Link> : <b>{e.name ?? e.shop}</b>}
                <span className="text-umber">
                  {[e.location, e.sales ? `${e.sales.toLocaleString('uk-UA')} продажів` : '', e.rating ? `рейтинг ${e.rating}` : ''].filter(Boolean).join(' · ')}
                </span>
                <a href={e.url} target="_blank" rel="noopener nofollow" className="text-sm">Магазин на Etsy</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.online.length > 0 && (
        <section aria-labelledby="online">
          <SectionHead title="Власні онлайн-магазини майстрів і брендів" id="online" />
          <details className="group">
            <summary className="mb-3 cursor-pointer font-bold">{`Показати ${p.online.length}`}</summary>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {p.online.slice(0, 200).map((s) => (
                <li key={s.id} className="rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                  <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                  {s.cityDoc && <span className="text-umber"> · {s.cityDoc.name}</span>}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </WavePage>
  )
}
