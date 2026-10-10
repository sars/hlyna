'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { mainNav, REQUEST_HREF, simpleNav } from '@/content/navigation'

// Desktop: mega menus opened by click (and closed by Escape, outside click or navigation).
// Mobile: a full-screen drawer with collapsible sections. Plain markup, no animation library.
export function MainNav() {
  const [open, setOpen] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const pathname = usePathname()
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Hover intent on desktop (mouse): open after a short pause, close after leaving the menu area.
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const later = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(fn, ms)
  }

  useEffect(() => {
    setOpen(null)
    setDrawer(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null)
        setDrawer(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
  }, [drawer])

  return (
    <div
      ref={rootRef}
      className="flex min-w-0 flex-1 items-center gap-4"
      onMouseLeave={() => canHover() && later(() => setOpen(null), 220)}
      onMouseEnter={() => timer.current && clearTimeout(timer.current)}
    >
      <ul className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
        {mainNav.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-expanded={open === s.id}
              aria-controls={`mega-${s.id}`}
              onClick={() => setOpen(open === s.id && !canHover() ? null : s.id)}
              onMouseEnter={() => canHover() && later(() => setOpen(s.id), open ? 0 : 120)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-[15px] font-semibold hover:bg-card aria-expanded:bg-card ${s.emphasis ? 'text-cobalt' : 'text-ink'}`}
            >
              {s.label}
              <span aria-hidden className="mt-[-3px] inline-block size-2 rotate-45 border-r-2 border-b-2 border-current" />
            </button>
          </li>
        ))}
        {simpleNav.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onMouseEnter={() => canHover() && later(() => setOpen(null), 120)} className="rounded-full px-3 py-2.5 text-[15px] font-semibold text-ink no-underline hover:bg-card">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={REQUEST_HREF}
        className="ml-auto hidden rounded-full bg-terra px-5 py-3 text-[15px] font-bold whitespace-nowrap text-cream no-underline hover:bg-terra-dark hover:text-cream lg:inline-flex"
      >
        Отримати пропозиції
      </Link>

      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-expanded={drawer}
        aria-controls="mobile-menu"
        className="ml-auto inline-flex rounded-full border border-line bg-card px-4 py-2 font-bold text-ink lg:hidden"
      >
        Меню
      </button>

      {/* All panels are rendered on the server (links stay crawlable); only the open one is visible. */}
      {mainNav.map((section) => (
        <div
          key={section.id}
          id={`mega-${section.id}`}
          hidden={open !== section.id}
          className="absolute inset-x-0 top-full hidden border-b border-line bg-card shadow-[0_18px_30px_rgba(42,32,24,.12)] lg:block"
        >
          <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)] gap-7 px-5 py-7">
            {section.columns.map((c) => (
              <div key={c.title}>
                <p className="kicker mb-2.5">{c.title}</p>
                <ul className="grid gap-2">
                  {c.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="font-semibold text-ink no-underline hover:text-cobalt">
                        {l.label}
                        {l.note && <small className="block text-[13px] leading-snug font-normal text-umber">{l.note}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {section.promo && (
              <div className="grid content-start gap-2.5 rounded-2xl bg-cobalt p-4 text-clay">
                <b className="font-display text-[15px] leading-tight uppercase">{section.promo.title}</b>
                <p className="m-0 text-sm">{section.promo.text}</p>
                <Link href={section.promo.cta.href} className="justify-self-start rounded-full bg-ochre px-4 py-2.5 text-sm font-bold text-ink no-underline hover:text-ink">
                  {section.promo.cta.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}

      {drawer && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Меню" className="fixed inset-0 z-50 overflow-y-auto bg-clay px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-10">
          <div className="mb-3 flex items-center justify-between">
            <Link href="/" className="font-display text-xl font-bold text-cobalt no-underline">
              глина<span className="text-terra">.</span>юа
            </Link>
            <button type="button" onClick={() => setDrawer(false)} className="rounded-full border border-line bg-card px-4 py-2 font-bold text-ink">
              Закрити
            </button>
          </div>
          {mainNav.map((s, i) => (
            <details key={s.id} open={i === 0} className="border-b border-line">
              <summary className="font-display flex cursor-pointer list-none justify-between py-4 text-base font-semibold uppercase">
                {s.label}
                <span aria-hidden className="text-terra">+</span>
              </summary>
              <ul className="mb-3.5 grid gap-2.5">
                {s.columns.flatMap((c) => c.links).map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="font-semibold text-ink no-underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <details className="border-b border-line">
            <summary className="font-display flex cursor-pointer list-none justify-between py-4 text-base font-semibold uppercase">
              Ще <span aria-hidden className="text-terra">+</span>
            </summary>
            <ul className="mb-3.5 grid gap-2.5">
              {[...simpleNav, { label: 'Для студій', href: '/dlya-studiy' }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-semibold text-ink no-underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <Link href={REQUEST_HREF} className="mt-5 flex w-full justify-center rounded-full bg-terra px-5 py-3.5 font-bold text-cream no-underline">
            Отримати пропозиції
          </Link>
        </div>
      )}
    </div>
  )
}
