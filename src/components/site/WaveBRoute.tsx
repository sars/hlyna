import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { Makers } from '@/components/site/Makers'
import { WavePage } from '@/components/site/WavePage'
import { CityHead } from '@/components/ui/CityHead'
import { DataTable } from '@/components/ui/DataTable'
import { FaqItem } from '@/components/ui/Faq'
import { StudioCell, StudioCells } from '@/components/ui/StudioCell'
import { getAllWithShops, groupByCity, type StudioCard } from '@/lib/catalog'
import { displayName, firstAddress } from '@/lib/present'
import { evidenceLine } from '@/editorial/topics'
import { fillCopy } from '@/editorial/wave-a'
import { makerCities } from '@/lib/makers'
import { EVENT_KIND, eventWhen, WAVE_B, waveBCopy, waveBData, waveBStudios, type EventItem, type WaveBData, type WaveBId } from '@/editorial/wave-b'
import { sitePhotos } from '@/content/photos'
import { site } from '@/content/site'
import { ogImage, ogPhoto } from '@/lib/ogImage'
import { fmt } from '@/lib/money'

// Wave B page: reviewed copy (src/content/waveB) around a live block that differs per page.
// Route files are one-liners: `export default () => <WaveBRoute id="…" />` plus waveBMetadata(id).

async function load(id: WaveBId) {
  const raw = waveBCopy(id)
  if (!raw) return null
  const data = await waveBData(id)
  return { data, copy: fillCopy(raw, data.vars) }
}

// The page photo is also the share-card photo.
const pagePhoto = (id: WaveBId) => (id === 'vydy-keramiky' ? sitePhotos.guideVydy : undefined)

export async function waveBMetadata(id: WaveBId): Promise<Metadata> {
  const p = await load(id)
  if (!p) return {}
  const meta = WAVE_B[id]
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: meta.path },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: meta.kicker, ...ogPhoto(pagePhoto(id)) }) },
  }
}



function EvidenceList({ items, title, id }: { items: { s: StudioCard; line: string }[]; title: string; id: string }) {
  if (!items.length) return null
  return (
    <Block id={id} title={title}>
      <StudioCells>
        {items.map(({ s, line }) => (
          <StudioCell key={s.id} s={s} line={line} showCity />
        ))}
      </StudioCells>
    </Block>
  )
}

function eventItem(e: EventItem) {
  const when = eventWhen(e)
  return {
    kicker: `${EVENT_KIND[e.kind] ?? 'Подія'}${e.city ? ` · ${e.city}` : ''}`,
    title: e.link ? (
      <a href={e.link} target="_blank" rel="noopener nofollow">
        {e.name}
      </a>
    ) : (
      e.name
    ),
    lines: [when || null, e.venue || null, e.entry ? `Вхід: ${e.entry}` : null],
  }
}

function LiveBlock({ d }: { d: WaveBData }) {
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
        <Block id="shops" title="Магазини з України на Etsy" note={`Продажі, відгуки й рейтинг — з вітрини Etsy на момент перевірки (${site.dataUpdated}).`}>
          <DataTable
            mode="scroll"
            columns={[{ key: 'shop', label: 'Магазин' }, { key: 'sales', label: 'Продажі', numeric: true, align: 'end' }, { key: 'reviews', label: 'Відгуки', numeric: true, align: 'end' }, { key: 'rating', label: 'Рейтинг', numeric: true, align: 'end' }, { key: 'years', label: 'На Etsy' }]}
            rows={d.shops.map((e) => ({
              shop: e.slug ? <Link href={`/vyrobnyky/${e.slug}`}>{e.name ?? e.shop}</Link> : <a href={e.url} target="_blank" rel="noopener nofollow">{e.name ?? e.shop}</a>,
              sales: e.sales ? fmt(e.sales) : '—',
              reviews: e.reviews ? fmt(e.reviews) : '—',
              rating: e.rating ? String(e.rating).replace('.', ',') : '—',
              years: e.years ?? '—',
            }))}
          />
        </Block>
      )
    case 'podiyi':
      return (
        <>
          {d.upcoming.length > 0 && (
            <Block id="soon" title="Найближчі">
              <InfoList columns={2} items={d.upcoming.map(eventItem)} />
            </Block>
          )}
          {d.recurring.length > 0 && (
            <Block id="yearly" title="Щороку й щосезону">
              <InfoList columns={2} items={d.recurring.map(eventItem)} />
            </Block>
          )}
          {d.past.length > 0 && (
            <Block id="past" title="Минулі за останній рік">
              <InfoList columns={2} items={d.past.map(eventItem)} />
            </Block>
          )}
          {d.paused.length > 0 && (
            <Block id="paused" title="Призупинені або завершені">
              <InfoList columns={2} items={d.paused.map(eventItem)} />
            </Block>
          )}
        </>
      )
    case 'muzei-keramiky':
      return (
        <Block id="venues" title="Музеї й галереї за містами">
          {d.groups.map((g, gi) => (
            <div key={g.city}>
              <CityHead id={`venue-${gi}`} name={g.city} />
              <InfoList
                columns={2}
                items={g.list.map((m) => ({
                  title: m.slug ? <Link href={`/vyrobnyky/${m.slug}`}>{m.name}</Link> : m.website ? <a href={m.website} target="_blank" rel="noopener nofollow">{m.name}</a> : m.name,
                  lines: [m.address ? firstAddress(m.address) || m.address : null, m.what || null],
                }))}
              />
            </div>
          ))}
        </Block>
      )
    case 'yalynkovi-prykrasy':
      return <EvidenceList items={d.lines} title="Хто робить новорічну кераміку" id="who" />
    case 'symvol-2027':
      return <EvidenceList items={d.lines} title="Хто робить козів і баранців із кераміки" id="who" />
    case 'svichnyky':
      return <EvidenceList items={d.lines} title="Хто робить керамічні свічники" id="who" />
    case 'rizdvianyi-posud':
      return <EvidenceList items={d.lines} title="Хто робить посуд до різдвяного столу" id="who" />
    case 'patriotychni-podarunky':
      return <EvidenceList items={d.lines} title="Хто робить кераміку з українською символікою" id="who" />
    case 'chaini-tseremonii':
      return <EvidenceList items={d.lines} title="Хто робить посуд для чаю" id="who" />
    case 'vesillia':
      return <EvidenceList items={d.lines} title="Хто робить весільну кераміку" id="who" />
    case 'khellovin':
      return <EvidenceList items={d.lines} title="Хто ще робить кераміку до Хелловіна" id="who" />
    case 'vypal':
      return <EvidenceList items={d.lines} title="Студії, що згадують випал, коворкінг чи оренду" id="who" />
    case 'interyer':
      return <EvidenceList items={d.lines} title="Хто ще робить плитку, кахлі, панно й світильники" id="who" />
    case 'vydy-keramiky':
      return (
        <Block id="who" title="Хто з українських майстрів працює з чим">
          <div className="ui-faq">
            {d.groups
              .filter((g) => g.studios.length)
              .map((g) => (
                <FaqItem key={g.key} q={`${g.label}: ${g.studios.length}`}>
                  <ul className="m-0 mb-3 grid list-none gap-1.5 p-0 sm:grid-cols-2">
                    {g.studios.slice(0, 40).map((s) => (
                      <li key={s.id} className="text-[15px]">
                        <Link href={`/vyrobnyky/${s.slug}`} className="text-cobalt underline underline-offset-[3px]">
                          {displayName(s)}
                        </Link>
                        {s.cityDoc && <span className="text-ink-2"> · {s.cityDoc.name}</span>}
                      </li>
                    ))}
                  </ul>
                </FaqItem>
              ))}
          </div>
        </Block>
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
  'brendy-posudu': [{ label: 'Посуд для чайної церемонії', href: '/dobirky/posud-dlya-chainoi-tseremonii' }, { label: 'Тарілки й миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' }, { label: 'Чашки', href: '/vyrobnyky/vyrib/chashky' }, { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }, { label: 'Ціни 2026', href: '/tsiny-2026' }],
  etsy: [{ label: 'Де купити кераміку', href: '/de-kupyty-keramiku' }, { label: 'Бренди посуду', href: '/dobirky/brendy-posudu' }, { label: 'Ціни 2026', href: '/tsiny-2026' }],
  podiyi: [{ label: 'Музеї й галереї', href: '/muzei-keramiky' }, { label: 'Де купити кераміку', href: '/de-kupyty-keramiku' }, { label: 'Мапа студій', href: '/mapa' }],
  'muzei-keramiky': [{ label: 'Ярмарки й події', href: '/podiyi' }, { label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne' }, { label: 'Мапа студій', href: '/mapa' }],
  'yalynkovi-prykrasy': [{ label: 'Символ 2027 року', href: '/dobirky/symvol-2027-roku' }, { label: 'Керамічні свічники', href: '/dobirky/keramichni-svichnyky' }, { label: 'Різдвяний посуд', href: '/dobirky/rizdvianyi-posud' }, { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Новий рік і Різдво', href: '/novyi-rik-i-rizdvo' }, { label: 'Ярмарки й події', href: '/podiyi' }],
  'vydy-keramiky': [{ label: 'Харчова безпечність', href: '/hayidy/kharchova-bezpechnist' }, { label: 'Догляд за керамікою', href: '/hayidy/dohliad-za-keramikoyu' }, { label: 'Чорнодимлена й молочена', href: '/hayidy/chornodymlena-i-molochena' }],
  'dohliad-za-keramikoyu': [{ label: 'Харчова безпечність', href: '/hayidy/kharchova-bezpechnist' }, { label: 'Види кераміки', href: '/hayidy/vydy-keramiky' }, { label: 'Тарілки й миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' }],
  'chornodymlena-i-molochena': [{ label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne' }, { label: 'Види кераміки', href: '/hayidy/vydy-keramiky' }, { label: 'Музеї й галереї', href: '/muzei-keramiky' }],
  'pratsyuyut-z-biznesom': [{ label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }, { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' }, { label: 'Як замовити партію', href: '/hayidy/yak-zamovyty-partiyu' }],
  'symvol-2027': [{ label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' }, { label: 'Керамічні свічники', href: '/dobirky/keramichni-svichnyky' }, { label: 'Різдвяний посуд', href: '/dobirky/rizdvianyi-posud' }, { label: 'Новий рік і Різдво', href: '/novyi-rik-i-rizdvo' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }],
  svichnyky: [{ label: 'Подарунки гостям на весілля', href: '/dobirky/podarunky-gostyam-na-vesillia' }, { label: 'Різдвяний посуд', href: '/dobirky/rizdvianyi-posud' }, { label: 'Символ 2027 року', href: '/dobirky/symvol-2027-roku' }, { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' }, { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Новий рік і Різдво', href: '/novyi-rik-i-rizdvo' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }],
  'rizdvianyi-posud': [{ label: 'Керамічні свічники', href: '/dobirky/keramichni-svichnyky' }, { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' }, { label: 'Символ 2027 року', href: '/dobirky/symvol-2027-roku' }, { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Новий рік і Різдво', href: '/novyi-rik-i-rizdvo' }, { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }],
  'patriotychni-podarunky': [{ label: 'Подарунки партнерам і колегам', href: '/dlya-biznesu/korporatyvni-podarunky' }, { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne' }, { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }],
  'chaini-tseremonii': [{ label: 'Чашки', href: '/vyrobnyky/vyrib/chashky' }, { label: 'Бренди посуду', href: '/dobirky/brendy-posudu' }, { label: 'Посуд для кав’ярень', href: '/dlya-biznesu/posud-dlya-kavyaren' }, { label: 'Види кераміки', href: '/hayidy/vydy-keramiky' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }],
  vesillia: [{ label: 'Керамічні свічники', href: '/dobirky/keramichni-svichnyky' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }, { label: 'Гончарство для двох', href: '/maister-klasy/dlya-dvokh' }, { label: 'Як замовити партію', href: '/hayidy/yak-zamovyty-partiyu' }],
  'khellovin': [{ label: 'Майстер-класи для дітей', href: '/maister-klasy/dlya-ditey' }, { label: 'Керамічні свічники', href: '/dobirky/keramichni-svichnyky' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }, { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' }],
  vypal: [{ label: 'Курси гончарства', href: '/maister-klasy/kursy' }, { label: 'Гончарне коло', href: '/maister-klasy/honcharne-kolo' }, { label: 'Для студій', href: '/dlya-studiy' }, { label: 'Мапа студій', href: '/mapa' }],
  interyer: [{ label: 'Плитка й панно', href: '/vyrobnyky/vyrib/plytka-i-panno' }, { label: 'Світильники', href: '/vyrobnyky/vyrib/svitylnyky' }, { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' }, { label: 'Посуд для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv' }, { label: 'Як замовити партію', href: '/hayidy/yak-zamovyty-partiyu' }],
}

export async function WaveBRoute({ id }: { id: WaveBId }) {
  const p = await load(id)
  if (!p) notFound()
  const meta = WAVE_B[id]
  const known = new Map((await getAllWithShops()).map((s) => [s.slug!, s]))
  const crumbs = [
    { label: 'Головна', href: '/' },
    ...(meta.section === 'dobirky' ? [{ label: 'Добірки', href: '/dobirky' }] : meta.section === 'hayidy' ? [{ label: 'Гайди', href: '/hayidy' }] : []),
    { label: meta.crumb },
  ]
  const studios = waveBStudios(p.data)
  // Selections of makers link to the makers pages of the cities they cover.
  const makerSlugs = new Set((await makerCities()).map((g) => g.city.slug))
  const cityLinks = ['brendy-posudu', 'pratsyuyut-z-biznesom', 'yalynkovi-prykrasy', 'symvol-2027', 'svichnyky', 'rizdvianyi-posud', 'patriotychni-podarunky', 'chaini-tseremonii', 'vesillia', 'khellovin', 'vypal', 'interyer'].includes(id)
    ? groupByCity(studios).filter((g) => g.studios.length >= 2 && makerSlugs.has(g.city.slug)).map((g) => ({ label: g.city.name, href: `/vyrobnyky/misto/${g.city.slug}` }))
    : []
  return (
    <WavePage copy={p.copy} known={known} kicker={meta.kicker} crumbs={crumbs} path={meta.path} form={meta.form} studios={studios} cityLinks={cityLinks} photo={pagePhoto(id)} related={(RELATED[id] ?? []).filter((r) => r.href !== meta.path)}>
      <LiveBlock d={p.data} />
    </WavePage>
  )
}

