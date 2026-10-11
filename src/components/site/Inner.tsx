import Image from 'next/image'
import React from 'react'

import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { FactStrip } from '@/components/ui/FactStrip'
import { FaqItem } from '@/components/ui/Faq'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { SectionHead } from '@/components/ui/SectionHead'
import { Updated } from '@/components/ui/Updated'
import type { DocPhoto, SitePhoto } from '@/content/photos'

// Shared skeleton of the inner pages (SYSTEM.md §4.2, §5): TopicPage, WavePage, GuidePage and the wave routes all
// compose these. Pages with a request bar keep a 76px bottom padding so the footer is never covered.
export function InnerMain({ bar, children }: { bar?: boolean; children: React.ReactNode }) {
  return <main className={cx(wrap, 'grid w-full', bar ? 'pb-[76px] lg:pb-section' : 'pb-section')}>{children}</main>
}

// The photo of an inner page: archive photos (SitePhoto) have no caption; Wikimedia and stock photos (DocPhoto) show their credit.
export function HeroPhoto({ photo, priority }: { photo: DocPhoto | SitePhoto; priority?: boolean }) {
  const credit = 'author' in photo ? photo : null
  return (
    <figure className="m-0">
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} priority={priority} sizes="(min-width:960px) 40vw, 100vw" className="aspect-[16/11] w-full object-cover" />
      {credit && (
        <figcaption className="pt-2 font-mono text-[11.5px] tracking-[.05em] text-ink-2 uppercase">
          Фото: {credit.author},{' '}
          <a href={credit.href} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">
            {credit.license}
          </a>
          , {credit.source ?? 'Wikimedia Commons'}
        </figcaption>
      )}
    </figure>
  )
}

// Hero: breadcrumbs, kicker, H1, lead, fact strip, city chips, buttons, «Оновлено» on the left; the photo on the right.
export function InnerHero({
  crumbs,
  modified,
  kicker,
  title,
  lead,
  strip,
  chips,
  actions,
  photo,
}: {
  crumbs: { label: string; href?: string }[]
  modified?: string | null
  kicker: string
  title: string
  lead: React.ReactNode
  strip?: { value: string; label: string }[]
  chips?: { label: string; href: string }[]
  actions?: React.ReactNode
  photo?: DocPhoto | SitePhoto
}) {
  return (
    <div className={cx('grid items-start gap-[clamp(20px,3vw,40px)] border-b-2 border-ink pt-hero pb-[clamp(24px,3vw,40px)]', photo && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]')}>
      <div className="grid min-w-0 gap-3.5">
        <Breadcrumbs items={crumbs} modified={modified} />
        <Kicker>{kicker}</Kicker>
        <h1 className="m-0 font-display text-h1">{title}</h1>
        <div className="grid max-w-read gap-3 text-lead">{lead}</div>
        {strip && strip.length >= 3 && <FactStrip items={strip} />}
        {chips && chips.length > 0 && (
          <ChipGroup as="nav" label="У містах:" aria-label="У містах">
            {chips.map((l) => (
              <Chip key={l.href} href={l.href}>
                {l.label}
              </Chip>
            ))}
          </ChipGroup>
        )}
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        <Updated />
      </div>
      {photo && <HeroPhoto photo={photo} priority />}
    </div>
  )
}

// Two columns from lg: the content and a sticky aside (the request form, or a box of links). Without an aside one column.
export function InnerCols({ aside, children }: { aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cx('grid items-start gap-[clamp(28px,4vw,56px)] pt-[clamp(24px,3vw,40px)]', aside ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]' : undefined)}>
      <div className="grid min-w-0 gap-block">{children}</div>
      {aside && (
        <aside id="zapyt-forma" className="grid min-w-0 gap-[22px] lg:sticky lg:top-[84px] lg:max-h-[calc(100dvh-100px)] lg:self-start lg:overflow-y-auto">
          {aside}
        </aside>
      )}
    </div>
  )
}

// A section of the content column: ruled head (kicker, title, note) and the body.
export function Block({ id, title, kicker, note, children }: { id: string; title: string; kicker?: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <SectionHead id={id} title={title} kicker={kicker} note={note} />
      <div className="grid gap-4 [&_.ui-cells]:border-t-0 [&_.ui-makers]:border-t-0">{children}</div>
    </section>
  )
}

// «Дивіться також»: chips to sibling pages.
export function Related({ items }: { items: { label: string; href: string }[] }) {
  if (!items.length) return null
  return (
    <ChipGroup as="nav" label="Дивіться також" aria-label="Схожі сторінки">
      {items.map((r) => (
        <Chip key={r.href} href={r.href}>
          {r.label}
        </Chip>
      ))}
    </ChipGroup>
  )
}

// Rows of small editorial entries (events, calendar dates, offers…): ruled, no cards.
export function InfoList({ items, columns = 1 }: { items: { kicker?: string; title: React.ReactNode; lines?: React.ReactNode[] }[]; columns?: 1 | 2 }) {
  return (
    <ul className={cx('m-0 grid list-none p-0', columns === 2 && 'sm:grid-cols-2 sm:gap-x-8')}>
      {items.map((it, i) => (
        <li key={i} className="grid content-start gap-0.5 border-b border-rule py-3 text-[15px] leading-normal">
          {it.kicker && <span className="font-mono text-[11px] tracking-[.06em] text-terracotta-text uppercase">{it.kicker}</span>}
          <span className="font-display text-[15.5px] leading-[1.2] font-semibold [&_a]:text-ink [&_a]:no-underline [&_a:hover]:text-cobalt">{it.title}</span>
          {it.lines?.filter(Boolean).map((l, j) => (
            <span key={j} className="text-sm text-ink-2 [overflow-wrap:anywhere]">
              {l}
            </span>
          ))}
        </li>
      ))}
    </ul>
  )
}

// FAQ with rich answers (links inside): the caller adds the FAQPage JSON-LD with the plain text.
export function FaqRich({ items, openFirst = true }: { items: { q: string; a: React.ReactNode }[]; openFirst?: boolean }) {
  return (
    <div className="ui-faq max-w-faq">
      {items.map((f, i) => (
        <FaqItem key={f.q} q={f.q} open={openFirst && i === 0}>
          <p className="m-0">{f.a}</p>
        </FaqItem>
      ))}
    </div>
  )
}
