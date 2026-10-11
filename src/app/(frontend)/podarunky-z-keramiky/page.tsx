import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { WavePage } from '@/components/site/WavePage'
import { getAllStudios } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { fillCopy, giftsData, waveCopy, type GiftItem } from '@/editorial/wave-a'
import { ogImage } from '@/utilities/ogImage'

// Ceramic gifts by budget: every item is a real price line from a studio's price list, linked to the studio.
export const revalidate = 86400
const ID = 'podarunky-z-keramiky'
const PATH = '/podarunky-z-keramiky'
const SHOW = 8

async function load() {
  const raw = waveCopy(ID)
  if (!raw) return null
  const d = await giftsData()
  return { ...d, copy: fillCopy(raw, d.vars) }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load()
  if (!p) return {}
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: PATH },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Подарунки', sub: p.vars.priceRange ? `здебільшого ${p.vars.priceRange}` : undefined, pattern: 'gifts' }) },
  }
}

function Items({ items }: { items: GiftItem[] }) {
  const row = (it: GiftItem) => (
    <li key={`${it.studio.id}-${it.text}`} className="rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
      <Link href={`/vyrobnyky/${it.studio.slug}`}>{cleanName(it.studio.name)}</Link>
      {it.studio.cityDoc && <span className="text-umber"> · {it.studio.cityDoc.name}</span>}: {it.text}
      {it.source && <span className="text-[12.5px] text-umber"> ({it.source})</span>}
    </li>
  )
  return (
    <>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">{items.slice(0, SHOW).map(row)}</ul>
      {items.length > SHOW && (
        <details className="group mt-2">
          <summary className="cursor-pointer font-bold"><span className="group-open:hidden">Показати ще {items.length - SHOW}</span><span className="hidden group-open:inline">Згорнути</span></summary>
          <ul className="mt-2 grid list-none grid-cols-1 gap-2 p-0">{items.slice(SHOW).map(row)}</ul>
        </details>
      )}
    </>
  )
}

export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  return (
    <WavePage
      copy={p.copy}
      known={known}
      kicker="Подарунки"
      crumbs={[{ label: 'Головна', href: '/' }, { label: 'Подарунки з кераміки' }]}
      path={PATH}
      form="corporate-gifts"
      related={[
        { label: 'Сертифікати на майстер-клас', href: '/sertyfikaty' },
        { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky' },
        { label: 'Новорічні подарунки 2026/27', href: '/dlya-biznesu/novorichni-podarunky-2026' },
        { label: 'Чашки', href: '/vyrobnyky/vyrib/chashky' },
      ]}
    >
      <section aria-labelledby="budget">
        <SectionHead kicker="За бюджетом" title="Що є в прайсах студій" id="budget">
          <p className="m-0 text-sm text-umber">Роздрібні ціни з сайтів, Instagram і маркетплейсів студій; по одному найдешевшому варіанту від студії в кожному діапазоні. Наявність уточнюйте в студії.</p>
        </SectionHead>
        <div className="grid grid-cols-1 gap-6">
          {p.tiers.map((t) =>
            t.items.length ? (
              <div key={t.key} id={t.key} className="grid grid-cols-1 gap-2 scroll-mt-24">
                <h3 className="m-0 text-lg">{t.label}</h3>
                <Items items={t.items} />
              </div>
            ) : null,
          )}
        </div>
      </section>
      <section aria-labelledby="occasion">
        <SectionHead kicker="За приводом" title="Ідеї з прайсів під привід" id="occasion" />
        <div className="grid grid-cols-1 gap-6">
          {p.occasions.map((o) =>
            o.items.length ? (
              <div key={o.key} id={o.key} className="grid grid-cols-1 gap-2 scroll-mt-24">
                <h3 className="m-0 text-lg">{o.label}</h3>
                <Items items={o.items} />
              </div>
            ) : null,
          )}
        </div>
      </section>
    </WavePage>
  )
}
