import Link from 'next/link'
import React from 'react'

import { latestUpdate } from '@/lib/catalog'

import { Breadcrumbs, container, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RichText } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/TopicPage'
import type { StudioCard } from '@/lib/catalog'
import { ldItemList } from '@/lib/ld'
import { cleanName } from '@/lib/present'
import type { WaveCopy } from '@/editorial/wave-a'

// Wave A page layout: written copy around a live data block. Order: lead → first section → live data
// (lists, prices) → other sections → picks → FAQ → sources. Studio links in copy are [Name](slug),
// rendered only when the studio is published.

type Known = Map<string, StudioCard>

function Paragraphs({ items, known }: { items: string[]; known: Known }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className="m-0 max-w-[70ch]">
          <RichText text={p} known={known} />
        </p>
      ))}
    </>
  )
}

function CopySection({ s, k, known }: { s: WaveCopy['sections'][number]; k: number; known: Known }) {
  return (
    <section aria-labelledby={`s${k}`} className="grid grid-cols-1 gap-3">
      <SectionHead title={s.heading} id={`s${k}`} />
      <Paragraphs items={s.paragraphs} known={known} />
      {s.bullets && (
        <ul className="m-0 grid max-w-[70ch] grid-cols-1 gap-1.5 pl-5">
          {s.bullets.map((b, i) => (
            <li key={i}>
              <RichText text={b} known={known} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function WavePage({
  copy,
  known,
  crumbs,
  kicker,
  path,
  form,
  city,
  studios = [],
  children,
  related = [],
  cityLinks = [],
}: {
  copy: WaveCopy
  known: Known
  crumbs: { label: string; href?: string }[]
  kicker: string
  path: string
  form: string
  city?: string
  studios?: StudioCard[]
  children: React.ReactNode
  related?: { label: string; href: string }[]
  cityLinks?: { label: string; href: string }[]
}) {
  const [first, ...rest] = copy.sections
  const picks = (copy.picks ?? []).map((p) => ({ ...p, studios: p.slugs.map((s) => known.get(s)).filter((s): s is StudioCard => !!s) })).filter((p) => p.studios.length)
  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-28 lg:pb-16`}>
      {copy.faq.length > 0 && (
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: copy.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') } })) }} />
      )}
      {studios.length > 0 && <JsonLd data={ldItemList(copy.title, studios)} />}

      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={crumbs} modified={latestUpdate(studios)} />
        <span className="kicker">{kicker}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">{copy.title}</h1>
        <p className="m-0 max-w-[70ch] text-lg">
          <RichText text={copy.lead} known={known} />
        </p>
        {cityLinks.length > 0 && (
          <nav aria-label="У містах" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-umber">У містах:</span>
            {cityLinks.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-ink no-underline hover:bg-sand">
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <Updated />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {copy.epigraph && copy.epigraph.length > 0 && <Epigraph lines={copy.epigraph} />}
          {first && <CopySection s={first} k={0} known={known} />}
          {children}
          {rest.map((s, i) => (
            <CopySection key={s.heading} s={s} k={i + 1} known={known} />
          ))}

          {picks.length > 0 && (
            <section aria-labelledby="picks">
              <SectionHead kicker="Підказки" title="Що обрати для чого" id="picks">
                <p className="m-0 text-sm text-umber">Підібрано за відкритими даними студій, без реклами й рейтингів.</p>
              </SectionHead>
              <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
                {picks.map((p) => (
                  <li key={p.need} className="grid grid-cols-1 content-start gap-1.5 rounded-2xl bg-card p-4 sm:[&:last-child:nth-child(odd)]:col-span-2">
                    <b>{p.need}</b>
                    <span className="text-[15px]">
                      {p.studios.map((s, i) => (
                        <React.Fragment key={s.id}>
                          {i > 0 && ', '}
                          <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                        </React.Fragment>
                      ))}
                    </span>
                    {p.why && (
                      <span className="text-[14.5px] text-umber">
                        <RichText text={p.why} known={known} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {copy.faq.length > 0 && (
            <section aria-labelledby="faq">
              <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
              <div className="grid grid-cols-1 gap-2.5">
                {copy.faq.map((f, i) => (
                  <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
                    <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">
                      {f.q}
                      <span aria-hidden className="font-display text-terra group-open:hidden">+</span>
                      <span aria-hidden className="font-display hidden text-terra group-open:inline">–</span>
                    </summary>
                    <p className="mt-0 mb-3.5">
                      <RichText text={f.a} known={known} />
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <nav aria-label="Схожі сторінки" className="grid grid-cols-1 gap-3">
              <p className="kicker m-0">Дивіться також</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {copy.sources.length > 0 && (
            <details className="text-sm text-umber">
              <summary className="cursor-pointer">Джерела</summary>
              <ul className="mt-2 grid grid-cols-1 gap-1 pl-5">
                {copy.sources.map((s) => (
                  <li key={s} className="break-all">
                    <a href={s} target="_blank" rel="noopener nofollow">{s.replace(/^https?:\/\/(www\.)?/, '')}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24 lg:self-start">
          <RequestForm sourcePage={path} defaultWhat={form} defaultCity={city} />
        </aside>
      </div>
      <MobileRequestBar />
    </main>
  )
}
