'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Mark } from '@/components/ui/Mark'
import { CartLink } from '@/components/shop/CartLink.client'
import { mainNav, requestHrefFor, simpleNav, STUDIO_JOIN_HREF, utilityNav } from '@/content/navigation'
import { SearchHeader } from './search/SiteSearch.client'

// The menu data comes from src/content/navigation.ts (planned pages already filtered out); this file is only presentation.
// Desktop (lg+): mono menu, mega panels opened by click, Enter/Space or hover intent; Escape, outside click and navigation
// close them, Escape returns focus to the section button. Phone: «Меню» opens a native <dialog> drawer (Escape, focus return
// and inert page behind come from the browser; body scroll is locked while it is open).
// Every mega panel is in the server HTML (links stay crawlable); styles are the `nav-*` classes in globals.css.
export function MainNav() {
  const pathname = usePathname()
  // The open section is remembered with the path it was opened on, so navigating closes it without an effect.
  const [opened, setOpened] = useState<{ id: string | null; path: string | null }>({ id: null, path: null })
  const open = opened.path === pathname ? opened.id : null
  const setOpen = (id: string | null) => setOpened({ id, path: pathname })
  const [drawer, setDrawer] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Hover intent on desktop (mouse): open after a short pause, close after leaving the menu area.
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const later = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(fn, ms)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const expanded = navRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')
      if (!expanded) return
      if (navRef.current?.contains(document.activeElement)) expanded.focus() // focus goes back to the section button
      setOpened((o) => ({ id: null, path: o.path }))
    }
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpened((o) => (o.id ? { id: null, path: o.path } : o))
    }
    // Leaving the phone layout with the drawer open would leave the page locked behind an invisible dialog.
    const mq = window.matchMedia('(min-width: 65rem)')
    const onMq = () => mq.matches && dialogRef.current?.open && dialogRef.current.close()
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    mq.addEventListener('change', onMq)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  // A navigation closes the drawer (the dialog element lives in the layout and survives route changes).
  useEffect(() => {
    if (dialogRef.current?.open) dialogRef.current.close()
  }, [pathname])

  const openDrawer = () => {
    dialogRef.current?.showModal()
    document.body.style.overflow = 'hidden'
    setDrawer(true)
  }
  const onDrawerClose = () => {
    document.body.style.overflow = ''
    setDrawer(false)
  }
  const request = requestHrefFor(pathname)

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Головне меню"
        className="nav-main"
        onMouseLeave={() => canHover() && later(() => setOpen(null), 220)}
        onMouseEnter={() => timer.current && clearTimeout(timer.current)}
      >
        <ul className="nav-list">
          {mainNav.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-expanded={open === s.id}
                aria-controls={`mega-${s.id}`}
                data-emphasis={s.emphasis ? '' : undefined}
                className="nav-sec"
                onClick={() => setOpen(open === s.id && !canHover() ? null : s.id)}
                onMouseEnter={() => canHover() && later(() => setOpen(s.id), open ? 0 : 120)}
              >
                {s.label}
                <span className="nav-caret" aria-hidden />
              </button>
              <div id={`mega-${s.id}`} hidden={open !== s.id} className="nav-mega" onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(null)}>
                <div className="nav-mega-in">
                  <div
                    className="nav-mega-cols"
                    style={{ gridTemplateColumns: `repeat(${s.columns.length}, minmax(0, 1fr))${s.promo ? ' minmax(0, 1.1fr)' : ''}` }}
                  >
                    {s.columns.map((c) => (
                      <div key={c.title} className="nav-col">
                        <p className="nav-col-title">{c.title}</p>
                        <ul>
                          {c.links.map((l) => (
                            <li key={l.href}>
                              <Link href={l.href}>
                                {l.label}
                                {l.note && <small>{l.note}</small>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {s.promo && (
                      <div className="nav-promo" data-tone="cobalt">
                        <b>{s.promo.title}</b>
                        <p>{s.promo.text}</p>
                        <Button href={s.promo.cta.href} variant="peach" size="sm" className="justify-self-start">
                          {s.promo.cta.label}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {simpleNav.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="nav-sec" onMouseEnter={() => canHover() && later(() => setOpen(null), 120)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="nav-actions">
        <SearchHeader onOpen={() => setOpen(null)} />
        <CartLink />
        <button type="button" className="ui-btn min-[65rem]:hidden" data-variant="ghost" data-size="sm" aria-expanded={drawer} aria-controls="mobile-menu" onClick={openDrawer}>
          Меню
        </button>
        <Button href={request} size="sm" arrow className="nav-request">
          <span className="hidden min-[65rem]:inline">Отримати пропозиції</span>
          <span className="min-[65rem]:hidden">Запит</span>
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label="Меню"
        className="nav-drawer"
        onClose={onDrawerClose}
        onClick={(e) => (e.target as HTMLElement).closest('a') && dialogRef.current?.close()}
      >
        <div className="nav-drawer-top">
          <Link href="/" className="inline-flex items-center gap-2.5 font-display text-xl leading-none font-extrabold tracking-[.02em] text-ink uppercase no-underline hover:text-ink">
            <Mark size={26} />
            Глина
          </Link>
          <button type="button" className="ui-btn" data-variant="ghost" data-size="sm" onClick={() => dialogRef.current?.close()}>
            Закрити
          </button>
        </div>
        {mainNav.map((s, i) => (
          <details key={s.id} open={i === 0}>
            <summary>
              {s.label}
              <span className="nav-pm" aria-hidden />
            </summary>
            <ul>
              {s.columns.flatMap((c) => c.links).map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <details>
          <summary>
            Ще
            <span className="nav-pm" aria-hidden />
          </summary>
          <ul>
            {[...simpleNav, { label: 'Для студій', href: STUDIO_JOIN_HREF }].map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </details>
        <nav aria-label="Швидкі посилання" className="nav-drawer-util">
          {utilityNav.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Button href={request} variant="cobalt" full arrow className="mt-[22px]">
          Отримати пропозиції
        </Button>
      </dialog>
    </>
  )
}
