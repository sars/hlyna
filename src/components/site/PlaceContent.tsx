import Link from 'next/link'
import React from 'react'

import { Block, InfoList } from '@/components/site/Inner'
import { MoreLink } from '@/components/ui/MoreLink'
import type { PlaceContent } from '@/editorial/places'
import type { StudioCard } from '@/lib/catalog'
import { cleanName } from '@/lib/present'

// Editorial blocks for city and product pages. Studio links are checked against the published catalogue:
// a slug that isn't published renders as plain text, never as a broken link.

type Known = Map<string, StudioCard>

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
const link = 'underline underline-offset-[3px]'

export function RichText({ text, known }: { text: string; known: Known }) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    out.push(text.slice(last, m.index))
    const [, label, target] = m
    if (target.startsWith('/'))
      out.push(
        <Link key={m.index} href={target} className={link}>
          {label}
        </Link>,
      )
    else if (known.has(target))
      out.push(
        <Link key={m.index} href={`/vyrobnyky/${target}`} className={link}>
          {label}
        </Link>,
      )
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
    <Block id={id} title={title}>
      <div className="grid max-w-read gap-3">
        {open.map((p, i) => (
          <p key={i} className="m-0">
            <RichText text={p} known={known} />
          </p>
        ))}
        {more.length > 0 && (
          <details className="group grid">
            <MoreLink as="summary" pad={false} className="justify-self-start py-1 text-cobalt group-open:hidden">
              Читати далі
            </MoreLink>
            <div className="grid gap-3">
              {more.map((p, i) => (
                <p key={i} className="m-0">
                  <RichText text={p} known={known} />
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </Block>
  )
}

export function PlacePicks({ c, known, title = 'Куди піти для чого', id = 'picks' }: { c: PlaceContent; known: Known; title?: string; id?: string }) {
  const picks = c.picks.map((p) => ({ ...p, studios: p.slugs.map((s) => known.get(s)).filter((s): s is StudioCard => !!s) })).filter((p) => p.studios.length)
  if (!picks.length) return null
  return (
    <Block id={id} kicker="Підказки" title={title} note="Підібрано за відкритими даними студій, без реклами й рейтингів.">
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
            p.why ? plain(p.why) : null,
          ],
        }))}
      />
    </Block>
  )
}

export function PlaceSeeAlso({ c, known, title = 'Де подивитися кераміку', id = 'see' }: { c: PlaceContent; known: Known; title?: string; id?: string }) {
  if (!c.seeAlso.length) return null
  return (
    <Block id={id} title={title}>
      <ul className="m-0 grid max-w-read list-none gap-1.5 p-0">
        {c.seeAlso.map((s) => (
          <li key={s} className="before:text-terracotta-text before:content-['—_']">
            <RichText text={s} known={known} />
          </li>
        ))}
      </ul>
    </Block>
  )
}

export function PlaceSources({ c }: { c: PlaceContent }) {
  if (!c.sources.length) return null
  return (
    <details className="font-mono text-xs text-ink-2">
      <summary className="cursor-pointer">Джерела ({c.sources.length})</summary>
      <ul className="mt-2 mb-0 grid list-none gap-1 p-0">
        {c.sources.map((u) => (
          <li key={u} className="break-all">
            <a href={u} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">
              {u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
