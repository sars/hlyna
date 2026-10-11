import Link from 'next/link'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import type { StudioCard } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import type { PlaceContent } from '@/editorial/places'

// Editorial blocks for city and product pages. Studio links are checked against the published catalogue:
// a slug that isn't published renders as plain text, never as a broken link.

type Known = Map<string, StudioCard>

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

export function RichText({ text, known }: { text: string; known: Known }) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    out.push(text.slice(last, m.index))
    const [, label, target] = m
    if (target.startsWith('/')) out.push(<Link key={m.index} href={target}>{label}</Link>)
    else if (known.has(target)) out.push(<Link key={m.index} href={`/vyrobnyky/${target}`}>{label}</Link>)
    else out.push(label)
    last = m.index! + m[0].length
  }
  out.push(text.slice(last))
  return <>{out}</>
}

const plain = (text: string) => text.replace(LINK, '$1')

// Scene: two paragraphs open, the rest behind «Читати далі» so phones don't get a wall of text.
export function PlaceStory({ c, known, title, id = 'scene' }: { c: PlaceContent; known: Known; title: string; id?: string }) {
  if (!c.scene.length) return null
  const open = c.scene.slice(0, 2)
  const more = c.scene.slice(2)
  return (
    <section aria-labelledby={id}>
      <SectionHead title={title} id={id} />
      <div className="grid max-w-[70ch] grid-cols-1 gap-3">
        {open.map((p, i) => (
          <p key={i} className="m-0">
            <RichText text={p} known={known} />
          </p>
        ))}
        {more.length > 0 && (
          <details className="group grid grid-cols-1">
            <summary className="cursor-pointer list-none justify-self-start text-[15px] font-bold text-cobalt group-open:hidden">Читати далі</summary>
            <div className="grid grid-cols-1 gap-3">
              {more.map((p, i) => (
                <p key={i} className="m-0">
                  <RichText text={p} known={known} />
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  )
}

export function PlacePicks({ c, known, title = 'Куди піти для чого', id = 'picks' }: { c: PlaceContent; known: Known; title?: string; id?: string }) {
  const picks = c.picks.map((p) => ({ ...p, studios: p.slugs.map((s) => known.get(s)).filter((s): s is StudioCard => !!s) })).filter((p) => p.studios.length)
  if (!picks.length) return null
  return (
    <section aria-labelledby={id}>
      <SectionHead kicker="Підказки" title={title} id={id}>
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
            {p.why && <span className="text-[14.5px] text-umber">{plain(p.why)}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PlaceSeeAlso({ c, known, title = 'Де подивитися кераміку', id = 'see' }: { c: PlaceContent; known: Known; title?: string; id?: string }) {
  if (!c.seeAlso.length) return null
  return (
    <section aria-labelledby={id}>
      <SectionHead title={title} id={id} />
      <ul className="m-0 grid max-w-[70ch] list-disc grid-cols-1 gap-1.5 pl-5 marker:text-terra">
        {c.seeAlso.map((s) => (
          <li key={s}>
            <RichText text={s} known={known} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PlaceSources({ c }: { c: PlaceContent }) {
  if (!c.sources.length) return null
  return (
    <details className="text-[13px] text-umber">
      <summary className="cursor-pointer">Джерела ({c.sources.length})</summary>
      <ul className="mt-2 mb-0 grid list-none grid-cols-1 gap-1 p-0">
        {c.sources.map((u) => (
          <li key={u} className="break-all">
            <a href={u} target="_blank" rel="noopener nofollow" className="text-umber">
              {u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
