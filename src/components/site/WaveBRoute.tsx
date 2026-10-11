import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { MakerRow } from '@/components/site/MakerRow'
import { WavePage } from '@/components/site/WavePage'
import { getAllStudios, groupByCity, type StudioCard } from '@/lib/catalog'
import { cleanName, firstAddress } from '@/lib/present'
import { evidenceLine } from '@/editorial/topics'
import { fillCopy } from '@/editorial/wave-a'
import { makerCities } from '@/lib/makers'
import { EVENT_KIND, eventEnd, WAVE_B, waveBCopy, waveBData, waveBStudios, type EventItem, type WaveBData, type WaveBId } from '@/editorial/wave-b'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'

// Wave B page: reviewed copy (src/content/waveB) around a live block that differs per page.
// Route files are one-liners: `export default () => <WaveBRoute id="…" />` plus waveBMetadata(id).

async function load(id: WaveBId) {
  const raw = waveBCopy(id)
  if (!raw) return null
  const data = await waveBData(id)
  return { data, copy: fillCopy(raw, data.vars) }
}

export async function waveBMetadata(id: WaveBId): Promise<Metadata> {
  const p = await load(id)
  if (!p) return {}
  const meta = WAVE_B[id]
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: meta.path },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: meta.kicker, pattern: meta.pattern }) },
  }
}

const COLLAPSE = 12

function Makers({ studios, title, id, note }: { studios: StudioCard[]; title: string; id: string; note?: string }) {
  if (!studios.length) return null
  const head = studios.slice(0, COLLAPSE)
  const tail = studios.slice(COLLAPSE)
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-3">
      <SectionHead title={title} id={id}>
        {note && <p className="m-0 text-sm text-umber">{note}</p>}
      </SectionHead>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">
        {head.map((s) => <MakerRow key={s.id} s={s} />)}
      </ul>
      {tail.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-bold"><span className="group-open:hidden">{`Показати ще ${tail.length}`}</span><span className="hidden group-open:inline">Згорнути</span></summary>
          <ul className="m-0 mt-2.5 grid list-none grid-cols-1 gap-2.5 p-0">
            {tail.map((s) => <MakerRow key={s.id} s={s} />)}
          </ul>
        </details>
      )}
    </section>
  )
}

function EvidenceList({ items, title, id }: { items: { s: StudioCard; line: string }[]; title: string; id: string }) {
  if (!items.length) return null
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-3">
      <SectionHead title={title} id={id} />
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {items.map(({ s, line }) => (
          <li key={s.id} className="grid grid-cols-1 content-start gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
            <Link href={`/vyrobnyky/${s.slug}`} className="font-bold">{cleanName(s.name)}</Link>
            {s.cityDoc && <span className="text-[13px] text-umber">{s.cityDoc.name}</span>}
            {line && <span className="text-umber">{line}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventRow({ e }: { e: EventItem }) {
  return (
    <li className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
      <span className="text-[12.5px] font-semibold tracking-wide text-terra uppercase">{EVENT_KIND[e.kind] ?? 'Подія'}{e.city ? ` · ${e.city}` : ''}</span>
      {e.link ? <a href={e.link} target="_blank" rel="noopener nofollow" className="font-bold">{e.name}</a> : <b>{e.name}</b>}
      {(e.nextDate || e.months) && (
        <span className="text-umber">
          {e.nextDate
            ? e.nextDate <= new Date().toISOString().slice(0, 10)
              ? `Триває до ${eventEnd(e).split('-').reverse().join('.')}`
              : `${e.approx ? 'Орієнтовно' : 'Дата'}: ${e.nextDate.split('-').reverse().join('.')}`
            : e.months}
        </span>
      )}
      {e.venue && <span className="text-umber">{e.venue}</span>}
      {e.entry && <span className="text-umber">Вхід: {e.entry}</span>}
    </li>
  )
}

function Block({ d }: { d: WaveBData }) {
  switch (d.id) {
    case 'brendy-posudu':
      return (
        <>
          <Makers studios={d.brands} title="Бренди" id="brands" note="Бренди з власними колекціями посуду; адреса — шоурум або майстерня, якщо вони публічні." />
          <Makers studios={d.others} title="Студії й майстри, що роблять посуд" id="makers" />
        </>
      )
    case 'etsy':
      return (
        <section aria-labelledby="shops" className="grid grid-cols-1 gap-3">
          <SectionHead title="Магазини з України на Etsy" id="shops">
            <p className="m-0 text-sm text-umber">Продажі, відгуки й рейтинг — з вітрини Etsy на момент перевірки (жовтень 2026).</p>
          </SectionHead>
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full min-w-[520px] border-collapse text-[14.5px]">
              <thead>
                <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
                  <th className="border-b border-line px-3.5 py-3">Магазин</th>
                  <th className="border-b border-line px-3.5 py-3">Продажі</th>
                  <th className="border-b border-line px-3.5 py-3">Відгуки</th>
                  <th className="border-b border-line px-3.5 py-3">Рейтинг</th>
                  <th className="border-b border-line px-3.5 py-3">На Etsy</th>
                </tr>
              </thead>
              <tbody>
                {d.shops.map((e) => (
                  <tr key={e.url}>
                    <td className="border-b border-line px-3.5 py-2.5">
                      {e.slug ? <Link href={`/vyrobnyky/${e.slug}`}>{e.name ?? e.shop}</Link> : <a href={e.url} target="_blank" rel="noopener nofollow">{e.name ?? e.shop}</a>}
                    </td>
                    <td className="border-b border-line px-3.5 py-2.5">{e.sales ? fmt(e.sales) : '—'}</td>
                    <td className="border-b border-line px-3.5 py-2.5">{e.reviews ? fmt(e.reviews) : '—'}</td>
                    <td className="border-b border-line px-3.5 py-2.5">{e.rating ? String(e.rating).replace('.', ',') : '—'}</td>
                    <td className="border-b border-line px-3.5 py-2.5">{e.years ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )
    case 'podiyi':
      return (
        <>
          {d.upcoming.length > 0 && (
            <section aria-labelledby="soon" className="grid grid-cols-1 gap-3">
              <SectionHead title="Найближчі" id="soon" />
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">{d.upcoming.map((e) => <EventRow key={e.name} e={e} />)}</ul>
            </section>
          )}
          {d.recurring.length > 0 && (
            <section aria-labelledby="yearly" className="grid grid-cols-1 gap-3">
              <SectionHead title="Щороку й щосезону" id="yearly" />
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">{d.recurring.map((e) => <EventRow key={e.name} e={e} />)}</ul>
            </section>
          )}
          {d.paused.length > 0 && (
            <section aria-labelledby="paused" className="grid grid-cols-1 gap-3">
              <SectionHead title="Призупинені або завершені" id="paused" />
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">{d.paused.map((e) => <EventRow key={e.name} e={e} />)}</ul>
            </section>
          )}
        </>
      )
    case 'muzei-keramiky':
      return (
        <section aria-labelledby="venues" className="grid grid-cols-1 gap-5">
          <SectionHead title="Музеї й галереї за містами" id="venues" />
          {d.groups.map((g) => (
            <div key={g.city} className="grid grid-cols-1 gap-2">
              <h3 className="m-0 text-lg">{g.city}</h3>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {g.list.map((m) => (
                  <li key={m.name} className="grid grid-cols-1 content-start gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                    {m.slug ? <Link href={`/vyrobnyky/${m.slug}`} className="font-bold">{m.name}</Link> : m.website ? <a href={m.website} target="_blank" rel="noopener nofollow" className="font-bold">{m.name}</a> : <b>{m.name}</b>}
                    {m.address && <span className="text-umber">{firstAddress(m.address) || m.address}</span>}
                    {m.what && <span className="text-umber">{m.what}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )
    case 'yalynkovi-prykrasy':
      return <EvidenceList items={d.lines} title="Хто робить новорічну кераміку" id="who" />
    case 'vydy-keramiky':
      return (
        <section aria-labelledby="who" className="grid grid-cols-1 gap-4">
          <SectionHead title="Хто з українських майстрів працює з чим" id="who" />
          {d.groups.filter((g) => g.studios.length).map((g) => (
            <details key={g.key} className="rounded-2xl bg-card px-4 py-1">
              <summary className="cursor-pointer py-3 font-bold">{`${g.label}: ${g.studios.length}`}</summary>
              <ul className="m-0 mb-3 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
                {g.studios.slice(0, 40).map((s) => (
                  <li key={s.id}>
                    <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                    {s.cityDoc && <span className="text-umber"> · {s.cityDoc.name}</span>}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )
    case 'dohliad-za-keramikoyu':
      return d.studios.length < 3 ? null : <EvidenceList items={d.studios.slice(0, 24).map((s) => ({ s, line: evidenceLine(s, /посудомий|мікрохвил|духов|руками|догляд|полив/iu) }))} title="Що кажуть самі студії" id="studios" />
    case 'chornodymlena-i-molochena':
      return (
        <>
          <EvidenceList items={d.black.map((s) => ({ s, line: evidenceLine(s, /чорнодим|димлен|задимлен/iu) }))} title="Чорнодимлена кераміка" id="black" />
          <EvidenceList items={d.milk.map((s) => ({ s, line: evidenceLine(s, /молочен|молочн|обвар/iu) }))} title="Молочена кераміка" id="milk" />
        </>
      )
    case 'pratsyuyut-z-biznesom':
      return (
        <>
          <Makers studios={d.horeca} title="Посуд для закладів" id="horeca" note="Ресторани, кав’ярні, готелі: студії, які згадують таку роботу або партії на замовлення." />
          <Makers studios={d.logo.filter((s) => !d.horeca.includes(s))} title="Логотип і персоналізація" id="logo" />
          <Makers studios={d.gifts.filter((s) => !d.horeca.includes(s) && !d.logo.includes(s))} title="Корпоративні подарунки" id="gifts" />
        </>
      )
  }
}

const RELATED: Record<WaveBId, { label: string; href: string }[]> = {
  'brendy-posudu': [{ label: 'Тарілки й миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' }, { label: 'Чашки', href: '/vyrobnyky/vyrib/chashky' }, { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }, { label: 'Ціни 2026', href: '/tsiny-2026' }],
  etsy: [{ label: 'Де купити кераміку', href: '/de-kupyty-keramiku' }, { label: 'Бренди посуду', href: '/dobirky/brendy-posudu' }, { label: 'Ціни 2026', href: '/tsiny-2026' }],
  podiyi: [{ label: 'Музеї й галереї', href: '/muzei-keramiky' }, { label: 'Де купити кераміку', href: '/de-kupyty-keramiku' }, { label: 'Мапа студій', href: '/mapa' }],
  'muzei-keramiky': [{ label: 'Ярмарки й події', href: '/podiyi' }, { label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne' }, { label: 'Мапа студій', href: '/mapa' }],
  'yalynkovi-prykrasy': [{ label: 'Новорічні подарунки 2026/27', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }, { label: 'Ярмарки й події', href: '/podiyi' }],
  'vydy-keramiky': [{ label: 'Харчова безпечність', href: '/hayidy/kharchova-bezpechnist' }, { label: 'Догляд за керамікою', href: '/hayidy/dohliad-za-keramikoyu' }, { label: 'Чорнодимлена й молочена', href: '/hayidy/chornodymlena-i-molochena' }],
  'dohliad-za-keramikoyu': [{ label: 'Харчова безпечність', href: '/hayidy/kharchova-bezpechnist' }, { label: 'Види кераміки', href: '/hayidy/vydy-keramiky' }, { label: 'Тарілки й миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' }],
  'chornodymlena-i-molochena': [{ label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne' }, { label: 'Види кераміки', href: '/hayidy/vydy-keramiky' }, { label: 'Музеї й галереї', href: '/muzei-keramiky' }],
  'pratsyuyut-z-biznesom': [{ label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }, { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' }, { label: 'Як замовити партію', href: '/hayidy/yak-zamovyty-partiyu' }],
}

export async function WaveBRoute({ id }: { id: WaveBId }) {
  const p = await load(id)
  if (!p) notFound()
  const meta = WAVE_B[id]
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  const crumbs = [
    { label: 'Головна', href: '/' },
    ...(meta.section === 'dobirky' ? [{ label: 'Добірки', href: '/dobirky' }] : meta.section === 'hayidy' ? [{ label: 'Гайди', href: '/hayidy' }] : []),
    { label: meta.crumb },
  ]
  const studios = waveBStudios(p.data)
  // Selections of makers link to the makers pages of the cities they cover.
  const makerSlugs = new Set((await makerCities()).map((g) => g.city.slug))
  const cityLinks = ['brendy-posudu', 'pratsyuyut-z-biznesom', 'yalynkovi-prykrasy'].includes(id)
    ? groupByCity(studios).filter((g) => g.studios.length >= 2 && makerSlugs.has(g.city.slug)).map((g) => ({ label: g.city.name, href: `/vyrobnyky/misto/${g.city.slug}` }))
    : []
  return (
    <WavePage copy={p.copy} known={known} kicker={meta.kicker} crumbs={crumbs} path={meta.path} form={meta.form} studios={studios} cityLinks={cityLinks} related={(RELATED[id] ?? []).filter((r) => r.href !== meta.path)}>
      <Block d={p.data} />
    </WavePage>
  )
}

