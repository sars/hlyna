import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { SeasonPromo } from '@/components/site/SeasonPromo'
import { CityHead } from '@/components/ui/CityHead'
import { MoreLink } from '@/components/ui/MoreLink'
import { WavePage } from '@/components/site/WavePage'
import { getAllWithShops } from '@/lib/catalog'
import { displayName } from '@/lib/present'
import { fillCopy, giftsData, waveCopy, type GiftItem } from '@/editorial/wave-a'
import { ogImage } from '@/lib/ogImage'

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
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Подарунки' }) },
  }
}

function Items({ items }: { items: GiftItem[] }) {
  const rows = (list: GiftItem[]) => (
    <InfoList
      items={list.map((it) => ({
        title: <Link href={`/vyrobnyky/${it.studio.slug}`}>{displayName(it.studio)}</Link>,
        kicker: it.studio.cityDoc?.name,
        lines: [<span key="t">{it.text}{it.source && <span className="font-mono text-[11.5px]"> ({it.source})</span>}</span>],
      }))}
    />
  )
  return (
    <>
      {rows(items.slice(0, SHOW))}
      {items.length > SHOW && (
        <details className="group">
          <MoreLink as="summary">
            <span className="group-open:hidden">Показати ще {items.length - SHOW} →</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </MoreLink>
          {rows(items.slice(SHOW))}
        </details>
      )}
    </>
  )
}

export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllWithShops()).map((s) => [s.slug!, s]))
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
        { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' },
        { label: 'Символ 2027 року', href: '/dobirky/symvol-2027-roku' },
        { label: 'Патріотичні подарунки', href: '/dobirky/patriotychni-podarunky' },
        { label: 'Подарунки гостям на весілля', href: '/dobirky/podarunky-gostyam-na-vesillia' },
        { label: 'Посуд для чаю', href: '/dobirky/posud-dlya-chainoi-tseremonii' },
      ]}
    >
      <SeasonPromo place="gifts" />
      <Block id="budget" kicker="За бюджетом" title="Що є в прайсах студій" note={<>Роздрібні ціни з сайтів, Instagram і маркетплейсів студій; по одному найдешевшому варіанту від студії в кожному діапазоні. Наявність уточнюйте в студії.</>}>
        {p.tiers.map((t) =>
          t.items.length ? (
            <div key={t.key}>
              <CityHead id={t.key} name={t.label} />
              <Items items={t.items} />
            </div>
          ) : null,
        )}
      </Block>
      <Block id="occasion" kicker="За приводом" title="Ідеї з прайсів під привід">
        {p.occasions.map((o) =>
          o.items.length ? (
            <div key={o.key}>
              <CityHead id={o.key} name={o.label} />
              <Items items={o.items} />
            </div>
          ) : null,
        )}
      </Block>
    </WavePage>
  )
}
