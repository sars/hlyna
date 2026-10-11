import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { MakerRow } from '@/components/site/MakerRow'
import { WavePage } from '@/components/site/WavePage'
import { isBuilt } from '@/content/navigation'
import { getAllStudios, type StudioCard } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { fillCopy } from '@/lib/waveA'
import { WAVE_C, waveCCopy, waveCData, waveCFacts, waveCStudios, type FormatRow, type SourceRef, type WaveCData, type WaveCId } from '@/lib/waveC'
import { ogImage } from '@/utilities/ogImage'

// Wave C page: reviewed copy (src/content/waveC) around structured blocks rendered from JSON
// (the formats comparison, the season calendar, studio offers), so the copy never restates a table.

async function load(id: WaveCId) {
  const raw = waveCCopy(id)
  if (!raw) return null
  const data = await waveCData(id)
  return { data, copy: fillCopy(raw, data.vars) }
}

export async function waveCMetadata(id: WaveCId): Promise<Metadata> {
  const p = await load(id)
  if (!p) return {}
  const meta = WAVE_C[id]
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: meta.path },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: meta.kicker, pattern: meta.pattern }) },
  }
}

const date = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('.') : d)

function Sources({ items }: { items: SourceRef[] }) {
  return (
    <span className="text-[12.5px] text-umber">
      {items.map((s, i) => (
        <React.Fragment key={s.url}>
          {i > 0 && ' · '}
          {s.url.startsWith('/') ? <Link href={s.url}>{s.label}</Link> : <a href={s.url} target="_blank" rel="noopener nofollow">{s.label}</a>}
          {s.date && `, ${date(s.date)}`}
        </React.Fragment>
      ))}
    </span>
  )
}

/** One card per format: easier to read on a phone than a 7-column table, and every row keeps its sources. */
function Formats({ rows }: { rows: FormatRow[] }) {
  return (
    <section aria-labelledby="formats" className="grid grid-cols-1 gap-3">
      <SectionHead title="Формати поруч: ціна, група, терміни" id="formats">
        <p className="m-0 text-sm text-umber">Ціни — як їх публікують сервіси й студії, з датою перевірки. Кераміка позначена окремо.</p>
      </SectionHead>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">
        {rows.map((r) => (
          <li key={r.key} className={`grid grid-cols-1 gap-2 rounded-2xl p-4 ${r.ceramics ? 'border-2 border-terra/40 bg-card' : 'bg-card'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <b className="text-[16.5px]">{r.name}</b>
              {r.ceramics && <span className="rounded-full bg-sand px-2.5 py-0.5 text-[12px] font-bold text-umber">кераміка</span>}
            </div>
            <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 text-[14.5px] sm:grid-cols-[150px_minmax(0,1fr)]">
              <dt className="font-semibold text-umber">Ціна</dt>
              <dd className="m-0">{r.price}{r.priceNote && <span className="text-umber"> ({r.priceNote})</span>}</dd>
              <dt className="font-semibold text-umber">Група</dt>
              <dd className="m-0">{r.group}</dd>
              <dt className="font-semibold text-umber">Тривалість</dt>
              <dd className="m-0">{r.duration}</dd>
              <dt className="font-semibold text-umber">Бронювання</dt>
              <dd className="m-0">{r.booking}</dd>
              <dt className="font-semibold text-umber">Кому підходить</dt>
              <dd className="m-0">{r.fits}</dd>
              <dt className="font-semibold text-umber">Плюси</dt>
              <dd className="m-0">{r.pros}</dd>
              <dt className="font-semibold text-umber">Мінуси</dt>
              <dd className="m-0">{r.cons}</dd>
            </dl>
            <Sources items={r.sources} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Makers({ studios, title, id, note }: { studios: StudioCard[]; title: string; id: string; note?: string }) {
  if (!studios.length) return null
  const head = studios.slice(0, 12)
  const tail = studios.slice(12)
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-3">
      <SectionHead title={title} id={id}>{note && <p className="m-0 text-sm text-umber">{note}</p>}</SectionHead>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">{head.map((s) => <MakerRow key={s.id} s={s} />)}</ul>
      {tail.length > 0 && (
        <details>
          <summary className="cursor-pointer font-bold">{`Показати ще ${tail.length}`}</summary>
          <ul className="m-0 mt-2.5 grid list-none grid-cols-1 gap-2.5 p-0">{tail.map((s) => <MakerRow key={s.id} s={s} />)}</ul>
        </details>
      )}
    </section>
  )
}

function Block({ d }: { d: WaveCData }) {
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
          <section aria-labelledby="tax" className="grid grid-cols-1 gap-2 rounded-2xl bg-card p-4">
            <h2 id="tax" className="m-0 text-[17px]">Подарунок без податку у 2026 році</h2>
            <p className="m-0">{`До ${waveCFacts.taxFreeGift.value}: ${waveCFacts.taxFreeGift.rule}. Звірте з бухгалтером перед покупкою.`}</p>
            <Sources items={[{ label: '7eminar', url: waveCFacts.taxFreeGift.source, date: waveCFacts.taxFreeGift.date }]} />
          </section>
          <Makers studios={d.gifts} title="Корпоративні подарунки з кераміки" id="gifts" />
          <Makers studios={d.logo} title="Логотип і персоналізація" id="logo" />
        </>
      )
    case 'novyi-rik-i-rizdvo':
      return (
        <>
          <section aria-labelledby="calendar" className="grid grid-cols-1 gap-3">
            <SectionHead title="Календар сезону" id="calendar">
              <p className="m-0 text-sm text-umber">{`Перевірено ${date(d.ny.checked)}. ${waveCFacts.holidaysMartialLaw.value}`}</p>
            </SectionHead>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {d.ny.calendar.map((c) => (
                <li key={c.date} className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                  <span className="font-display text-terra">{c.date}</span>
                  <b>{c.what}</b>
                  <span className="text-umber">{c.note}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="deadlines" className="grid grid-cols-1 gap-3">
            <SectionHead title="Коли замовляти (наша оцінка)" id="deadlines">
              <p className="m-0 text-sm text-umber">{d.ny.deadlinesNote}</p>
            </SectionHead>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
              {d.ny.deadlinesEstimate.map((x) => (
                <li key={x.what} className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                  <b>{x.what}</b>
                  <span>{x.by}</span>
                  <span className="text-umber">{x.why}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="offers" className="grid grid-cols-1 gap-3">
            <SectionHead title="Що вже пропонують студії" id="offers">
              <p className="m-0 text-sm text-umber">Сезонні пропозиції з сайтів і постів студій, з датою джерела.</p>
            </SectionHead>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {d.offers.map((o) => (
                <li key={o.slug} className="grid grid-cols-1 content-start gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                  <Link href={`/vyrobnyky/${o.studio.slug}`} className="font-bold">{cleanName(o.studio.name)}</Link>
                  {o.studio.cityDoc && <span className="text-[13px] text-umber">{o.studio.cityDoc.name}</span>}
                  <span>{o.what}</span>
                  {o.price && <span className="text-umber">{o.price}</span>}
                  {o.deadline && <span className="text-umber">{o.deadline}</span>}
                  <span className="text-[12.5px] text-umber">
                    {o.source ? <a href={o.source} target="_blank" rel="noopener nofollow">джерело</a> : 'джерело: профіль студії'}
                    {o.date && `, ${date(o.date)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {d.more.length > 0 && (
            <section aria-labelledby="more" className="grid grid-cols-1 gap-3">
              <SectionHead title="Ще майстри з новорічною керамікою" id="more" />
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {d.more.map(({ s, line }) => (
                  <li key={s.id} className="grid grid-cols-1 content-start gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                    <Link href={`/vyrobnyky/${s.slug}`} className="font-bold">{cleanName(s.name)}</Link>
                    {s.cityDoc && <span className="text-[13px] text-umber">{s.cityDoc.name}</span>}
                    {line && <span className="text-umber">{line}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="markets" className="grid grid-cols-1 gap-3">
            <SectionHead title="Зимові ярмарки: дати минулого сезону" id="markets">
              <p className="m-0 text-sm text-umber">{d.ny.marketsNote}</p>
            </SectionHead>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {d.ny.marketsLastSeason.map((m) => (
                <li key={m.name} className="grid grid-cols-1 content-start gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                  <span className="text-[12.5px] font-semibold tracking-wide text-terra uppercase">{m.city}</span>
                  <a href={m.source} target="_blank" rel="noopener nofollow" className="font-bold">{m.name}</a>
                  <span>{m.dates}</span>
                  <span className="text-umber">{m.note}</span>
                </li>
              ))}
            </ul>
          </section>
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
    <WavePage copy={p.copy} known={known} kicker={meta.kicker} crumbs={crumbs} path={meta.path} form={meta.form} studios={waveCStudios(p.data)} related={RELATED[id].filter((r) => r.href !== meta.path && isBuilt(r.href))}>
      <Block d={p.data} />
    </WavePage>
  )
}
