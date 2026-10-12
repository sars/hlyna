import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { CityHead } from '@/components/ui/CityHead'
import { MoreLink } from '@/components/ui/MoreLink'
import { WavePage } from '@/components/site/WavePage'
import { getAllWithShops } from '@/lib/catalog'
import { cleanName, firstAddress } from '@/lib/present'
import { fillCopy, waveCopy, whereToBuyData } from '@/editorial/wave-a'
import { sitePhotos } from '@/content/photos'
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
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Де купити' }) },
  }
}


export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllWithShops()).map((s) => [s.slug!, s]))
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
      photo={sitePhotos.shopShelf}
      related={[
        { label: 'Виробники за містами', href: '/vyrobnyky/misto' },
        { label: 'Вироби', href: '/vyrobnyky/vyrib' },
        { label: 'Ціни 2026', href: '/tsiny-2026' },
        { label: 'Мапа студій', href: '/mapa' },
      ]}
    >
      <Block id="shops" title="Магазини й галереї за містами">
        {p.shopCities.map((g) => (
          <div key={g.city.slug}>
            <CityHead id={`misto-${g.city.slug}`} name={g.city.name} />
            <InfoList
              columns={2}
              items={g.studios.map((s) => ({ title: <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>, lines: [firstAddress(s.address) || null, brandsBySlug.get(s.slug!) || null] }))}
            />
          </div>
        ))}
      </Block>

      {p.etsy.length > 0 && (
        <Block id="etsy" title="Українські керамісти на Etsy" note={<>Магазини з локацією в Україні; кількість продажів і відгуків — з вітрини Etsy на момент перевірки.</>}>
          <InfoList
            columns={2}
            items={p.etsy.map((e) => ({
              title: e.slug && known.has(e.slug) ? <Link href={`/vyrobnyky/${e.slug}`}>{e.name ?? e.shop}</Link> : (e.name ?? e.shop),
              lines: [
                [e.location, e.sales ? `${e.sales.toLocaleString('uk-UA')} продажів` : '', e.rating ? `рейтинг ${e.rating}` : ''].filter(Boolean).join(' · ') || null,
                <a key="etsy" href={e.url} target="_blank" rel="noopener nofollow">
                  Магазин на Etsy
                </a>,
              ],
            }))}
          />
        </Block>
      )}

      {p.online.length > 0 && (
        <Block id="online" title="Власні онлайн-магазини майстрів і брендів">
          <details className="group">
            <MoreLink as="summary">{`Показати ${p.online.length} →`}</MoreLink>
            <InfoList
              columns={2}
              items={p.online.slice(0, 200).map((s) => ({ title: <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>, lines: [s.cityDoc?.name ?? null] }))}
            />
          </details>
        </Block>
      )}
    </WavePage>
  )
}
