'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { MoreLink } from '@/components/ui/MoreLink'
import { requestHrefFor } from '@/content/navigation'
import { popularSearches, searchCopy } from '@/content/search'
import { prepare, search, type SearchDoc, type SearchHit, type SearchIndex } from '@/lib/search/engine'
import { track } from '@/lib/track'
import { clearRecent, readRecent, rememberSearch } from './recent'
import { SearchAnswer, SearchRow } from './SearchRow'

// What the search panel, the phone dialog and the home field show under the field: the empty state (popular, cities,
// recent), the results, «nothing found». Loaded only when a search opens (SiteSearch.client.tsx imports it lazily), and
// it loads the index (/poshuk/index.json) once per page view. The field keeps focus: ↑↓ and Enter come in via `control`.

type Loaded = { prepared: ReturnType<typeof prepare>; cities: SearchDoc[] }
let loading: Promise<Loaded> | null = null
export function preloadIndex(): Promise<Loaded> {
  if (!loading) {
    loading = fetch('/poshuk/index.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<SearchIndex>
      })
      .then((index) => ({ prepared: prepare(index), cities: index.docs.filter((d) => d.k === 'city').sort((a, b) => (b.n ?? 0) - (a.n ?? 0)).slice(0, 6) }))
    loading.catch(() => (loading = null)) // a failed load is tried again on the next open
  }
  return loading
}

export type SearchControl = { key: (e: React.KeyboardEvent<HTMLInputElement>) => boolean }

type Props = {
  query: string
  layout: 'columns' | 'list'
  listId: string
  control: React.RefObject<SearchControl | null>
  onActive: (id: string | undefined) => void
  onPick: (q: string) => void
  onLeave: () => void
}

const Group = ({ id, title, count, children }: { id: string; title: string; count?: number; children: React.ReactNode }) => (
  <div role="group" aria-labelledby={id}>
    <p className="srch-grp" id={id}>
      {title}
      {count ? <b>{count}</b> : null}
    </p>
    <div className="srch-list">{children}</div>
  </div>
)

const Keys = () => (
  <p className="srch-keys m-0" aria-hidden>
    <span>
      <kbd className="srch-kbd">↑</kbd>
      <kbd className="srch-kbd">↓</kbd> обрати
    </span>
    <span>
      <kbd className="srch-kbd">Enter</kbd> відкрити
    </span>
    <span>
      <kbd className="srch-kbd">Esc</kbd> закрити
    </span>
  </p>
)

export default function SearchResults({ query, layout, listId, control, onActive, onPick, onLeave }: Props) {
  const pathname = usePathname()
  const [data, setData] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState(false)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [sel, setSel] = useState({ query, i: 0 })
  const [announce, setAnnounce] = useState('')

  useEffect(() => {
    let live = true
    preloadIndex().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [])

  const q = query.trim()
  const result = useMemo(() => (data ? search(data.prepared, q) : null), [data, q])
  const options: SearchHit[] = result ? [...(result.answer ? [result.answer] : []), ...result.studios, ...result.cities, ...result.pages] : []
  // The answer (or the first row) is selected from the start, so Enter opens it.
  const active = sel.query === query ? Math.min(sel.i, options.length - 1) : 0
  const idOf = (i: number) => `${listId}-${i}`
  const activeId = options.length ? idOf(active) : undefined

  useEffect(() => onActive(activeId), [activeId, onActive])
  useImperativeHandle(control, () => ({
    key: (e) => {
      if (!options.length) return false
      const move = (i: number) => {
        setSel({ query, i })
        document.getElementById(idOf(i))?.scrollIntoView({ block: 'nearest' })
      }
      if (e.key === 'ArrowDown') move((active + 1) % options.length)
      else if (e.key === 'ArrowUp') move((active - 1 + options.length) % options.length)
      else if (e.key === 'Enter') document.getElementById(idOf(active))?.click()
      else return false
      return true
    },
  }))
  // A summary for screen readers, after typing settles.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!result) return setAnnounce('')
      const n = result.studios.length + result.cities.length + result.pages.length + (result.answer ? 1 : 0)
      setAnnounce(n ? `Знайшли ${n}${result.answer ? ', перша — відповідь' : ''}` : 'Нічого не знайшли')
    }, 500)
    return () => clearTimeout(t)
  }, [result])

  // Any link inside closes the search; a result also goes to the recent list and to analytics (the words, never personal data).
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    if (a.closest('[role="option"]') || a.querySelector('[data-all]')) {
      rememberSearch(q)
      track('search', { search_term: q.slice(0, 100), results: result?.total ?? 0 })
    }
    onLeave()
  }

  const request = requestHrefFor(pathname)
  const columns = layout === 'columns'
  const pick = (text: string) => () => onPick(text)
  const live = (
    <p className="sr-only" aria-live="polite">
      {announce}
    </p>
  )

  if (failed)
    return (
      <p className="srch-error">
        {searchCopy.unavailable} <a href={`/poshuk?q=${encodeURIComponent(q)}`}>Відкрити сторінку пошуку →</a>
      </p>
    )

  // Empty field: popular, cities, recent, how to search.
  if (!result) {
    const popular = (
      <section className="grid gap-3">
        <p className="srch-grp">Популярне</p>
        <div className="srch-chips">
          {popularSearches.map((p) => (
            <Chip key={p} as="button" onClick={pick(p)}>
              {p}
            </Chip>
          ))}
        </div>
      </section>
    )
    const cities = data && (
      <section className="grid gap-3">
        <p className="srch-grp">Міста</p>
        <div className="srch-chips items-center">
          {data.cities.map((c) => (
            <Chip key={c.u} href={c.u}>
              {c.t.replace(/ і область$/u, '')}
            </Chip>
          ))}
          <MoreLink href="/maister-klasy" pad={false} className="ml-1">
            Усі міста
          </MoreLink>
        </div>
      </section>
    )
    const recentList = recent.length > 0 && (
      <section>
        <p className="srch-grp">
          Нещодавно
          <button
            type="button"
            onClick={() => {
              clearRecent()
              setRecent([])
            }}
          >
            Очистити
          </button>
        </p>
        <div className="srch-list">
          {recent.map((r) => (
            <button key={r} type="button" className="srch-row" onClick={pick(r)}>
              <span>
                <strong>{r}</strong>
              </span>
              <span className="srch-go" aria-hidden>
                →
              </span>
            </button>
          ))}
        </div>
      </section>
    )
    if (!columns)
      return (
        <div onClick={onClick}>
          {popular}
          {recentList}
          {cities}
          {!data && q.length >= 2 && <div className="srch-busy" />}
        </div>
      )
    const help = (
      <section className="grid gap-3">
        <p className="srch-grp">Як шукати</p>
        <p className="srch-help">
          <b>{searchCopy.placeholder}:</b> {searchCopy.help}
        </p>
        <p className="srch-help">{searchCopy.helpLatin}</p>
        <Keys />
      </section>
    )
    return (
      <div onClick={onClick} className="srch-cols" data-two={recentList ? undefined : ''}>
        <div className="srch-col">
          {popular}
          {cities}
        </div>
        {recentList && <div className="srch-col">{recentList}</div>}
        <div className="srch-col">{help}</div>
        {!data && q.length >= 2 && <div className="srch-busy col-span-full" />}
      </div>
    )
  }

  const request2 = `/zapyt?q=${encodeURIComponent(q.slice(0, 100))}`
  if (!options.length)
    return (
      <div onClick={onClick} role="status" className={columns ? 'srch-cols' : 'grid gap-6'} data-two="">
        <div className={columns ? 'srch-col srch-none' : 'srch-none grid gap-3'}>
          <p className="srch-grp">Нічого не знайшли</p>
          <h3>За «{q}» нічого не знайшли.</h3>
          <p>{searchCopy.noneText}</p>
          <div>
            <Button href={request2} variant="cobalt" arrow full={!columns}>
              Отримати пропозиції
            </Button>
            {columns && (
              <Button href="/vyrobnyky" variant="ghost">
                Усі виробники
              </Button>
            )}
          </div>
        </div>
        <div className={columns ? 'srch-col' : 'grid gap-3'}>
          <p className="srch-grp">Спробуйте</p>
          <div className="srch-chips">
            {popularSearches.slice(0, 4).map((p) => (
              <Chip key={p} as="button" onClick={pick(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    )

  let i = 0
  const row = (h: SearchHit) => {
    const n = i++
    return <SearchRow key={h.u} hit={h} id={idOf(n)} selected={n === active} onPoint={() => setSel({ query, i: n })} />
  }
  const hint = result.corrected && (
    <p className="srch-hint">
      Шукаємо як <b>«{result.corrected}»</b>
    </p>
  )
  const answer = result.answer && (
    <div role="group" aria-label="Відповідь">
      {columns && <p className="srch-grp mb-2.5">Відповідь</p>}
      <SearchAnswer hit={result.answer} id={idOf(i++)} selected={active === 0} onPoint={() => setSel({ query, i: 0 })} />
    </div>
  )
  const studios = result.studios.length > 0 && (
    <Group id={`${listId}-gs`} title="Студії" count={result.studios.length}>
      {result.studios.map(row)}
    </Group>
  )
  const cities = result.cities.length > 0 && (
    <Group id={`${listId}-gc`} title="Міста" count={result.cities.length}>
      {result.cities.map(row)}
    </Group>
  )
  const pages = result.pages.length > 0 && (
    <Group id={`${listId}-gp`} title="Сторінки й гайди" count={result.pages.length}>
      {result.pages.map(row)}
    </Group>
  )
  const all = (
    <MoreLink href={`/poshuk?q=${encodeURIComponent(q)}`} pad={false} className="leading-[1.3] whitespace-normal!">
      <span data-all="">Усі результати для «{q}»</span>
    </MoreLink>
  )

  if (!columns)
    return (
      <div onClick={onClick}>
        {live}
        {hint}
        <div id={listId} role="listbox" aria-label="Результати" className="grid grid-cols-[minmax(0,1fr)] gap-[18px]">
          {answer}
          {studios}
          {cities}
          {pages}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-2">
          {all}
          <Button href={request} variant="cobalt" arrow full>
            Отримати пропозиції
          </Button>
        </div>
      </div>
    )

  // Three columns always (answer and studios · cities · pages); an empty group leaves its column blank.
  return (
    <div onClick={onClick}>
      {live}
      <div id={listId} role="listbox" aria-label="Результати" className="srch-cols">
        <div className="srch-col">
          {hint}
          {answer}
          {studios}
        </div>
        {cities ? <div className="srch-col">{cities}</div> : <div />}
        {pages ? <div className="srch-col">{pages}</div> : <div />}
      </div>
      <div className="srch-foot">
        <div>
          {all}
          <Keys />
        </div>
        <Button href={request} variant="cobalt" size="sm" arrow>
          Отримати пропозиції
        </Button>
      </div>
    </div>
  )
}
