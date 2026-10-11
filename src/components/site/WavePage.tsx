import Link from 'next/link'
import React from 'react'

import { Block, FaqRich, InfoList, InnerCols, InnerHero, InnerMain, Related } from '@/components/site/Inner'
import { JsonLd } from '@/components/site/JsonLd'
import { RichText } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { Button } from '@/components/ui/Button'
import { CtaBand } from '@/components/ui/CtaBand'
import { Epigraph } from '@/components/ui/Epigraph'
import type { WaveCopy } from '@/editorial/wave-a'
import { latestUpdate } from '@/lib/catalog'
import type { StudioCard } from '@/lib/catalog'
import { ldItemList } from '@/lib/ld'
import { cleanName } from '@/lib/present'

// Wave A page layout: written copy around a live data block. Order: lead → first section → live data
// (lists, prices) → other sections → picks → FAQ → sources. Studio links in copy are [Name](slug),
// rendered only when the studio is published.

type Known = Map<string, StudioCard>

function Paragraphs({ items, known }: { items: string[]; known: Known }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className="m-0 max-w-read">
          <RichText text={p} known={known} />
        </p>
      ))}
    </>
  )
}

function CopySection({ s, k, known }: { s: WaveCopy['sections'][number]; k: number; known: Known }) {
  return (
    <Block id={`s${k}`} title={s.heading}>
      <Paragraphs items={s.paragraphs} known={known} />
      {s.bullets && (
        <ul className="m-0 grid max-w-read list-none gap-1.5 p-0">
          {s.bullets.map((b, i) => (
            <li key={i} className="before:text-terracotta-text before:content-['—_']">
              <RichText text={b} known={known} />
            </li>
          ))}
        </ul>
      )}
    </Block>
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
    <InnerMain bar>
      {copy.faq.length > 0 && (
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: copy.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') } })) }} />
      )}
      {studios.length > 0 && <JsonLd data={ldItemList(copy.title, studios)} />}

      <InnerHero
        crumbs={crumbs}
        modified={latestUpdate(studios)}
        kicker={kicker}
        title={copy.title}
        lead={
          <p className="m-0">
            <RichText text={copy.lead} known={known} />
          </p>
        }
        chips={cityLinks}
        actions={
          <Button href="#zapyt-forma" variant="cobalt" arrow>
            Отримати пропозиції
          </Button>
        }
      />

      <InnerCols aside={<RequestForm sourcePage={path} defaultWhat={form} defaultCity={city} />}>
        {copy.epigraph && copy.epigraph.length > 0 && <Epigraph lines={copy.epigraph} />}
        {first && <CopySection s={first} k={0} known={known} />}
        {children}
        {rest.map((s, i) => (
          <CopySection key={s.heading} s={s} k={i + 1} known={known} />
        ))}

        {picks.length > 0 && (
          <Block id="picks" kicker="Підказки" title="Що обрати для чого" note="Підібрано за відкритими даними студій, без реклами й рейтингів.">
            <InfoList
              columns={2}
              items={picks.map((p) => ({
                title: p.need,
                lines: [
                  p.studios.map((s, i) => (
                    <React.Fragment key={s.id}>
                      {i > 0 && ', '}
                      <Link href={`/vyrobnyky/${s.slug}`} className="text-cobalt underline underline-offset-[3px]">
                        {cleanName(s.name)}
                      </Link>
                    </React.Fragment>
                  )),
                  p.why ? <RichText key="why" text={p.why} known={known} /> : null,
                ],
              }))}
            />
          </Block>
        )}

        {copy.faq.length > 0 && (
          <Block id="faq" kicker="Питання і відповіді" title="Часті питання">
            <FaqRich items={copy.faq.map((f) => ({ q: f.q, a: <RichText text={f.a} known={known} /> }))} />
          </Block>
        )}

        <Related items={related} />
        <CtaBand tone="ink" title="Опишіть, що потрібно, — студії відповідуть напряму" cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />

        {copy.sources.length > 0 && (
          <details className="font-mono text-xs text-ink-2">
            <summary className="cursor-pointer">Джерела</summary>
            <ul className="mt-2 mb-0 grid list-none gap-1 p-0">
              {copy.sources.map((s) => (
                <li key={s} className="break-all">
                  <a href={s} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">
                    {s.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </InnerCols>
      <MobileRequestBar />
    </InnerMain>
  )
}
