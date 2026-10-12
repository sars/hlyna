import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { WavePage } from '@/components/site/WavePage'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { MoreLink } from '@/components/ui/MoreLink'
import { isBuilt } from '@/content/navigation'
import { getAllStudios, type StudioCard } from '@/lib/catalog'
import { displayName } from '@/lib/present'
import { fillCopy } from '@/editorial/wave-a'
import { WAVE_C, waveCCopy, waveCData, waveCFacts, waveCStudios, type FormatRow, type SourceRef, type WaveCData, type WaveCId } from '@/editorial/wave-c'
import { sitePhotos } from '@/content/photos'
import { ogImage, ogPhoto } from '@/utilities/ogImage'

// Wave C page: reviewed copy (src/content/waveC) around structured blocks rendered from JSON
// (the formats comparison, the season calendar, studio offers), so the copy never restates a table.

async function load(id: WaveCId) {
  const raw = waveCCopy(id)
  if (!raw) return null
  const data = await waveCData(id)
  return { data, copy: fillCopy(raw, data.vars) }
}

// The page photo is also the share-card photo.
const pagePhoto = (id: WaveCId) => (id === 'novyi-rik-i-rizdvo' ? sitePhotos.bizNewYear : undefined)

export async function waveCMetadata(id: WaveCId): Promise<Metadata> {
  const p = await load(id)
  if (!p) return {}
  const meta = WAVE_C[id]
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: meta.path },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: meta.kicker, ...ogPhoto(pagePhoto(id)) }) },
  }
}

const date = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('.') : d)

function Sources({ items }: { items: SourceRef[] }) {
  return (
    <span className="font-mono text-[11.5px] text-ink-2">
      {items.map((s, i) => (
        <React.Fragment key={s.url}>
          {i > 0 && ' · '}
          {s.url.startsWith('/') ? (
            <Link href={s.url} className="text-ink-2 underline underline-offset-[3px]">{s.label}</Link>
          ) : (
            <a href={s.url} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">{s.label}</a>
          )}
          {s.date && `, ${date(s.date)}`}
        </React.Fragment>
      ))}
    </span>
  )
}

/** One block per format: easier to read on a phone than a 7-column table, and every row keeps its sources. */
function Formats({ rows }: { rows: FormatRow[] }) {
  return (
    <Block id="formats" title="Формати поруч: ціна, група, терміни" note="Ціни — як їх публікують сервіси й студії, з датою перевірки. Кераміка позначена окремо.">
      <ul className="m-0 grid list-none p-0">
        {rows.map((r) => (
          <li key={r.key} className="grid gap-2 border-b border-rule py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <b className="font-display text-base leading-[1.2] font-semibold">{r.name}</b>
              {r.ceramics && <span className="font-mono text-[11px] tracking-[.06em] text-terracotta-text uppercase">кераміка</span>}
            </div>
            <dl className="m-0 grid gap-x-4 gap-y-1 text-[15px] sm:grid-cols-[150px_minmax(0,1fr)]">
              {[
                ['Ціна', <>{r.price}{r.priceNote && <span className="text-ink-2"> ({r.priceNote})</span>}</>],
                ['Група', r.group],
                ['Тривалість', r.duration],
                ['Бронювання', r.booking],
                ['Кому підходить', r.fits],
                ['Плюси', r.pros],
                ['Мінуси', r.cons],
              ].map(([k, v]) => (
                <React.Fragment key={k as string}>
                  <dt className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase sm:pt-[3px]">{k}</dt>
                  <dd className="m-0">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <Sources items={r.sources} />
          </li>
        ))}
      </ul>
    </Block>
  )
}

function Makers({ studios, title, id, note }: { studios: StudioCard[]; title: string; id: string; note?: string }) {
  if (!studios.length) return null
  const head = studios.slice(0, 12)
  const tail = studios.slice(12)
  return (
    <Block id={id} title={title} note={note}>
      <div>
        <MakerRows>
          {head.map((s) => (
            <MakerRow key={s.id} s={s} />
          ))}
        </MakerRows>
        {tail.length > 0 && (
          <details className="group">
            <MoreLink as="summary">
              <span className="group-open:hidden">{`Показати ще ${tail.length} →`}</span>
              <span className="hidden group-open:inline">Згорнути</span>
            </MoreLink>
            <MakerRows>
              {tail.map((s) => (
                <MakerRow key={s.id} s={s} />
              ))}
            </MakerRows>
          </details>
        )}
      </div>
    </Block>
  )
}

const studioLink = (s: StudioCard) => (
  <Link href={`/vyrobnyky/${s.slug}`}>{displayName(s)}</Link>
)

function LiveBlock({ d }: { d: WaveCData }) {
  switch (d.id) {
    case 'richnytsya-kompaniyi':
      return (
        <>
          <Formats rows={d.rows} />
          <Makers studios={d.studios} title="Студії, що проводять корпоративи з глиною" id="studios" note="За відкритими даними студій; умови й дати кожна підтверджує у відповіді на запит." />
        </>
      )
    case 'podarunky-spivrobitnykam':
      return (
        <>
          <Block id="tax" title="Подарунок без податку у 2026 році">
            <p className="m-0 max-w-read">{`До ${waveCFacts.taxFreeGift.value}: ${waveCFacts.taxFreeGift.rule}. Звірте з бухгалтером перед покупкою.`}</p>
            <Sources items={[{ label: '7eminar', url: waveCFacts.taxFreeGift.source, date: waveCFacts.taxFreeGift.date }]} />
          </Block>
          <Makers studios={d.gifts} title="Корпоративні подарунки з кераміки" id="gifts" />
          <Makers studios={d.logo} title="Логотип і персоналізація" id="logo" />
        </>
      )
    case 'novyi-rik-i-rizdvo':
      return (
        <>
          <Block id="calendar" title="Календар сезону" note={`Перевірено ${date(d.ny.checked)}. ${waveCFacts.holidaysMartialLaw.value}`}>
            <InfoList columns={2} items={d.ny.calendar.map((c) => ({ kicker: c.date, title: c.what, lines: [c.note] }))} />
          </Block>
          <Block id="deadlines" title="Коли замовляти (наша оцінка)" note={d.ny.deadlinesNote}>
            <InfoList items={d.ny.deadlinesEstimate.map((x) => ({ title: x.what, lines: [x.by, x.why] }))} />
          </Block>
          <Block id="offers" title="Що вже пропонують студії" note="Сезонні пропозиції з сайтів і постів студій, з датою джерела.">
            <InfoList
              columns={2}
              items={d.offers.map((o) => ({
                kicker: o.studio.cityDoc?.name,
                title: studioLink(o.studio),
                lines: [
                  o.what,
                  o.price || null,
                  o.deadline || null,
                  <span key="src" className="font-mono text-[11.5px]">
                    {o.source ? <a href={o.source} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">джерело</a> : 'джерело: профіль студії'}
                    {o.date && `, ${date(o.date)}`}
                  </span>,
                ],
              }))}
            />
          </Block>
          {d.more.length > 0 && (
            <Block id="more" title="Ще майстри з новорічною керамікою">
              <InfoList columns={2} items={d.more.map(({ s, line }) => ({ kicker: s.cityDoc?.name, title: studioLink(s), lines: [line || null] }))} />
            </Block>
          )}
          <Block id="markets" title="Зимові ярмарки: дати минулого сезону" note={d.ny.marketsNote}>
            <InfoList
              columns={2}
              items={d.ny.marketsLastSeason.map((m) => ({
                kicker: m.city,
                title: <a href={m.source} target="_blank" rel="noopener nofollow">{m.name}</a>,
                lines: [m.dates, m.note],
              }))}
            />
          </Block>
        </>
      )
  }
}

const RELATED: Record<WaveCId, { label: string; href: string }[]> = {
  'richnytsya-kompaniyi': [{ label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' }, { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' }, { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' }, { label: 'Ціни 2026', href: '/tsiny-2026' }],
  'podarunky-spivrobitnykam': [{ label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' }, { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky' }, { label: 'Сертифікати на гончарство', href: '/sertyfikaty' }, { label: 'Новорічні подарунки 2026/27', href: '/dlya-biznesu/novorichni-podarunky-2026' }],
  'novyi-rik-i-rizdvo': [{ label: 'Новорічні подарунки 2026/27', href: '/dlya-biznesu/novorichni-podarunky-2026' }, { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy' }, { label: 'Сертифікати на гончарство', href: '/sertyfikaty' }, { label: 'Ярмарки й події', href: '/podiyi' }],
}

export async function WaveCRoute({ id }: { id: WaveCId }) {
  const p = await load(id)
  if (!p) notFound()
  const meta = WAVE_C[id]
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  const crumbs = [{ label: 'Головна', href: '/' }, ...(meta.section === 'biz' ? [{ label: 'Для бізнесу', href: '/dlya-biznesu' }] : []), { label: meta.crumb }]
  return (
    <WavePage copy={p.copy} known={known} kicker={meta.kicker} crumbs={crumbs} path={meta.path} form={meta.form} studios={waveCStudios(p.data)} photo={pagePhoto(id)} related={RELATED[id].filter((r) => r.href !== meta.path && isBuilt(r.href))}>
      <LiveBlock d={p.data} />
    </WavePage>
  )
}
