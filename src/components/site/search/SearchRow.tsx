import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/Button'
import { searchCopy } from '@/content/search'
import type { SearchHit } from '@/lib/search/engine'
import { fmt } from '@/lib/money'

// Rows of the site search, the same in the header panel, the phone dialog and on /poshuk (docs/design/search, §4.3).
// With an `id` a row is an option of the search listbox (the field keeps focus; `selected` is the visible state).

/** The title with the matched parts underlined (`marks` from the engine). */
export function Marked({ text, marks }: { text: string; marks: [number, number][] }) {
  const out: React.ReactNode[] = []
  let at = 0
  for (const [a, b] of [...marks].sort((x, y) => x[0] - y[0])) {
    if (a < at) continue
    if (a > at) out.push(text.slice(at, a))
    out.push(<mark key={a}>{text.slice(a, b)}</mark>)
    at = b
  }
  out.push(text.slice(at))
  return <>{out}</>
}

type Option = { id?: string; selected?: boolean; onPoint?: () => void }
const optionProps = ({ id, selected, onPoint }: Option) => (id ? { id, role: 'option', 'aria-selected': Boolean(selected), onMouseMove: onPoint } : {})

export function SearchRow({ hit, ...option }: { hit: SearchHit } & Option) {
  return (
    <Link href={hit.u} className="srch-row" {...optionProps(option)}>
      <span>
        {hit.m && <small>{hit.m}</small>}
        <strong>
          <Marked text={hit.t} marks={hit.marks} />
        </strong>
        {hit.s && <em>{hit.s}</em>}
        {hit.x && <i>{hit.x}</i>}
      </span>
      {hit.p ? (
        <span className="srch-price">
          {fmt(hit.p)} грн<small>з особи</small>
        </span>
      ) : (
        <span className="srch-go" aria-hidden>
          →
        </span>
      )}
    </Link>
  )
}

/** The page that answers the query on its own («коло львів» → «Гончарне коло у Львові»): a white slab with a cobalt bar. */
export function SearchAnswer({ hit, ...option }: { hit: SearchHit } & Option) {
  return (
    <Link href={hit.u} className="srch-answer" {...optionProps(option)}>
      <span>
        <small>Сторінка каталогу{hit.m ? ` · ${hit.m}` : ''}</small>
        <strong>
          <Marked text={hit.t} marks={hit.marks} />
        </strong>
        {hit.s && <em>{hit.s}</em>}
      </span>
      <span className="srch-go" aria-hidden>
        →
      </span>
    </Link>
  )
}

export function Loupe({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  )
}

/** The big field as a plain GET form to /poshuk (the /poshuk page itself; the home field is the interactive HeroSearch). */
export function SearchField({ q = '' }: { q?: string }) {
  return (
    <form role="search" action="/poshuk" className="srch-field">
      <Loupe size={20} />
      <input type="search" name="q" defaultValue={q} aria-label="Пошук по каталогу" placeholder={searchCopy.placeholderShort} autoComplete="off" enterKeyHint="search" maxLength={100} />
      <Button type="submit" variant="ink">
        Знайти
      </Button>
    </form>
  )
}
