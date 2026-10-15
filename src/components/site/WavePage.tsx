import Link from 'next/link'
import React from 'react'

import { Block, FaqRich, InfoList, InnerCols, InnerHero, InnerMain, Related, RequestBand } from '@/components/site/Inner'
import { JsonLd } from '@/components/site/JsonLd'
import { RichText } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { isBusinessTop, TopList } from '@/components/site/TopList'
import { Button } from '@/components/ui/Button'
import { CtaBand } from '@/components/ui/CtaBand'
import { Epigraph } from '@/components/ui/Epigraph'
import type { HeroPhoto } from '@/content/photos'
import type { WaveCopy } from '@/editorial/wave-a'
import { latestUpdate } from '@/lib/catalog'
import type { StudioCard } from '@/lib/catalog'
import { ldItemList, ldTopList } from '@/lib/ld'
import { displayName } from '@/lib/present'

// Wave A page layout: written copy around a live data block. Order: lead → first section → tops by category
// (when the copy has them; the request band follows the business category) → live data (lists, prices) → other
// sections → picks → FAQ → sources. Studio links in copy are [Name](slug),
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
  chipsLabel,
  strip,
  photo,
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
  cityLinks?: { label: string; href: string; count?: number }[]
  chipsLabel?: string
  strip?: { value: string; label: string }[]
  photo?: HeroPhoto
}) {
  const [first, ...rest] = copy.sections
  const picks = (copy.picks ?? []).map((p) => ({ ...p, studios: p.slugs.map((s) => known.get(s)).filter((s): s is StudioCard => !!s) })).filter((p) => p.studios.length)
  const tops = (copy.tops ?? []).filter((c) => c.items.length)
  return (
    <InnerMain>
      {copy.faq.length > 0 && (
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: copy.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') } })) }} />
      )}
      {studios.length > 0 && <JsonLd data={ldItemList(copy.title, studios)} />}
      {tops.map((c) => (
        <JsonLd key={c.id} data={ldTopList(c, known)} />
      ))}

      <InnerHero
        crumbs={crumbs}
        modified={latestUpdate(studios)}
        kicker={kicker}
        title={copy.title}
        lead={
          <p className="m-0">
            <RichText text={copy.lead} known={known} bold />
          </p>
        }
        chips={cityLinks}
        chipsLabel={chipsLabel}
        strip={strip}
        photo={photo}
        actions={
          <Button href="#zapyt-forma" variant="cobalt" arrow>
            Отримати пропозиції
          </Button>
        }
      />

      <InnerCols aside={<RequestForm sourcePage={path} defaultWhat={form} defaultCity={city} />}>
        {copy.epigraph && copy.epigraph.length > 0 && <Epigraph lines={copy.epigraph} />}
        {first && <CopySection s={first} k={0} known={known} />}
        {tops.map((c) => (
          <React.Fragment key={c.id}>
            <TopList cat={c} known={known} />
            {isBusinessTop(c) && <RequestBand path={path} tone="cobalt" href="#zapyt-forma" />}
          </React.Fragment>
        ))}
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
                        {displayName(s)}
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
        <CtaBand tone="ink" className="max-lg:hidden" title="Опишіть, що потрібно, — студії відповідуть напряму" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />

        {copy.sources.length > 0 && (
          <details className="font-mono text-xs text-ink-2">
            <summary className="cursor-pointer py-3">Джерела</summary>
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
