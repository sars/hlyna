'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { lazy, Suspense, useEffect, useEffectEvent, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { searchCopy } from '@/content/search'
import type { SearchControl } from './SearchResults.client'
import { Loupe } from './SearchRow'

// The site search (docs/design/search, SYSTEM.md §4.3). Light on purpose: the results and the index load only when a
// search opens (hover or focus warms them up). From 80rem the header has a real field with a panel under the header;
// below that a loupe opens a full-screen <dialog>. The home field drops a list under itself on desktop and opens the
// dialog on phones. Without JavaScript every field is a GET form to /poshuk and the loupe a link to it.

const Results = lazy(() => import('./SearchResults.client'))
const warm = () => void import('./SearchResults.client').then((m) => m.preloadIndex()).catch(() => {})
const OPEN = 'hlyna:search' // window event: open the dialog with this text (the home field on phones)

const comboInput = ({ listId, open, activeId }: { listId: string; open: boolean; activeId?: string }) =>
  ({
    type: 'search',
    name: 'q',
    role: 'combobox',
    'aria-label': 'Пошук по каталогу',
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-autocomplete': 'list',
    'aria-activedescendant': open ? activeId : undefined,
    autoComplete: 'off',
    autoCapitalize: 'off',
    enterKeyHint: 'search',
    spellCheck: false,
    maxLength: 100,
  }) as const
// A short query never leaves for /poshuk.
const onSubmit = (q: string) => (e: React.FormEvent) => {
  if (q.trim().length < 2) e.preventDefault()
}

/** A field with its list: in the header (panel under the header) or on the home page (list under the field). */
function SearchCombo({ variant, inputRef }: { variant: 'head' | 'hero'; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const pathname = usePathname()
  const listId = useId()
  const [q, setQ] = useState('')
  // Remembered with the path it was opened on, so a navigation closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === pathname
  const [activeId, setActiveId] = useState<string>()
  const control = useRef<SearchControl | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const own = useRef<HTMLInputElement>(null)
  const input = inputRef ?? own
  const head = variant === 'head'

  useEffect(() => {
    if (!open) return
    const away = (e: Event) => !form.current?.contains(e.target as Node) && setOpenedOn(null)
    document.addEventListener('pointerdown', away)
    document.addEventListener('focusin', away)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('focusin', away)
    }
  }, [open])

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // On phones the home field hands over to the full-screen dialog (the keyboard and the list need the whole screen).
    if (!head && !window.matchMedia('(min-width: 65rem)').matches) {
      e.currentTarget.blur()
      window.dispatchEvent(new CustomEvent(OPEN, { detail: q }))
      return
    }
    warm()
    setOpenedOn(pathname)
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (open) setOpenedOn(null)
      else setQ('')
      return
    }
    // Arrows and Enter go to the open list.
    if (open && control.current?.key(e)) e.preventDefault()
  }
  const field = (
    <input
      ref={input}
      {...comboInput({ listId, open, activeId })}
      value={q}
      placeholder={head ? 'Пошук' : searchCopy.placeholderShort}
      onFocus={onFocus}
      onChange={(e) => {
        setQ(e.target.value)
        setOpenedOn(pathname)
      }}
      onKeyDown={onKeyDown}
    />
  )
  const results = (
    <Suspense fallback={<div className="srch-busy" />}>
      <Results
        query={q}
        layout={head ? 'columns' : 'list'}
        listId={listId}
        control={control}
        onActive={setActiveId}
        onPick={(t) => {
          setQ(t)
          input.current?.focus()
        }}
        onLeave={() => setOpenedOn(null)}
      />
    </Suspense>
  )
  return (
    <form ref={form} role="search" action="/poshuk" className={head ? undefined : 'srch-combo'} onSubmit={onSubmit(q)}>
      {head ? (
        <label className="srch-box" data-open={open ? '' : undefined}>
          <Loupe />
          {field}
          <kbd className="srch-kbd" aria-hidden>
            {open ? 'Esc' : '/'}
          </kbd>
        </label>
      ) : (
        <div className="srch-field">
          <Loupe size={20} />
          {field}
          <Button type="submit" variant="ink">
            Знайти
          </Button>
        </div>
      )}
      {open &&
        (head ? (
          <div className="srch-panel">
            <div className="srch-panel-in">{results}</div>
          </div>
        ) : (
          <div className="srch-drop">{results}</div>
        ))}
    </form>
  )
}

/** The search in the header: the field from 80rem, the loupe and the phone dialog below; `/` and ⌘K / Ctrl K anywhere. */
export function SearchHeader({ onOpen }: { onOpen?: () => void }) {
  const pathname = usePathname()
  const listId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const dInput = useRef<HTMLInputElement>(null)
  const headInput = useRef<HTMLInputElement>(null)
  const control = useRef<SearchControl | null>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string>()

  const openDialog = (text = '') => {
    if (dialog.current?.open) return
    warm()
    setQ(text)
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    setOpen(true)
    dInput.current?.focus()
    onOpen?.()
  }
  const close = () => dialog.current?.close()
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && control.current?.key(e)) e.preventDefault()
  }
  // Events from outside React (the home field, shortcuts) always see the current openDialog.
  const fromHome = useEffectEvent((e: Event) => openDialog((e as CustomEvent<string>).detail ?? ''))
  const onShortcut = useEffectEvent((e: KeyboardEvent) => {
    const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')
    const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
    if (!cmdK && (e.key !== '/' || typing || e.metaKey || e.ctrlKey || e.altKey)) return
    e.preventDefault()
    if (window.matchMedia('(min-width: 80rem)').matches) headInput.current?.focus()
    else openDialog()
  })

  // A navigation closes the dialog (it lives in the layout and survives route changes).
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close()
  }, [pathname])

  useEffect(() => {
    const home = (e: Event) => fromHome(e)
    const key = (e: KeyboardEvent) => onShortcut(e)
    window.addEventListener(OPEN, home)
    document.addEventListener('keydown', key)
    return () => {
      window.removeEventListener(OPEN, home)
      document.removeEventListener('keydown', key)
    }
  }, [])

  return (
    <>
      <Link
        href="/poshuk"
        prefetch={false}
        className="srch-trigger srch-head-btn"
        aria-label="Пошук по каталогу"
        aria-haspopup="dialog"
        onPointerEnter={warm}
        onClick={(e) => {
          e.preventDefault()
          openDialog()
        }}
      >
        <Loupe />
      </Link>
      <div className="srch-head">
        <SearchCombo variant="head" inputRef={headInput} />
      </div>
      <dialog
        ref={dialog}
        className="srch-dialog"
        aria-label="Пошук"
        onClose={() => {
          document.body.style.overflow = ''
          setOpen(false)
        }}
      >
        <div className="srch-dialog-in">
          <form role="search" action="/poshuk" className="srch-dialog-top" onSubmit={onSubmit(q)}>
            <Loupe size={20} />
            <input ref={dInput} {...comboInput({ listId, open, activeId })} value={q} placeholder={searchCopy.placeholderShort} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
            <button type="button" onClick={close}>
              Скасувати
            </button>
          </form>
          <div className="srch-dialog-body">
            {open && (
              <Suspense fallback={<div className="srch-busy" />}>
                <Results
                  query={q}
                  layout="list"
                  listId={listId}
                  control={control}
                  onActive={setActiveId}
                  onPick={(t) => {
                    setQ(t)
                    dInput.current?.focus()
                  }}
                  onLeave={close}
                />
              </Suspense>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}

/** The big field of the home hero. */
export function HeroSearch() {
  return <SearchCombo variant="hero" />
}
