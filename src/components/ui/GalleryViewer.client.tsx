'use client'

import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'

import { Button } from './Button'
import { MoreLink } from './MoreLink'

type ViewerPhoto = { full: string; alt: string; caption: string; width: number; height: number }

// A click on the dark field around a contained photo (not on the photo itself) closes the viewer.
const outsidePhoto = (e: React.MouseEvent, box: DOMRect, p: ViewerPhoto) => {
  const scale = Math.min(box.width / p.width, box.height / p.height)
  const w = p.width * scale
  const h = p.height * scale
  const x = e.clientX - box.left - (box.width - w) / 2
  const y = e.clientY - box.top - (box.height - h) / 2
  return x < 0 || y < 0 || x > w || y > h
}

// The interactive half of `StudioGallery` (SYSTEM.md §4.1). Tiles stay server links to the originals; a plain click opens a
// native <dialog> on ink at that photo: swipe and trackpad through scroll-snap, ← → Home End, Escape, a counter. Only the
// current photo and its neighbours are rendered, so a profile with 30 photos loads three. Also counts the phone strip.
export function GalleryViewer({ photos, name, consent, children }: { photos: ViewerPhoto[]; name: string; consent: string; children: React.ReactNode }) {
  const n = photos.length
  const root = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [at, setAt] = useState(0)
  const [open, setOpen] = useState(false)
  // Position in the phone strip; null until the first swipe, so the server text «12 фото» stays.
  const [strip, setStrip] = useState<number | null>(null)

  const snap = (i: number, behavior: ScrollBehavior) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior })

  const show = (i: number, from: HTMLElement | null) => {
    opener.current = from
    setAt(i)
    setOpen(true)
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    snap(i, 'instant')
  }
  // Neighbours scroll (smooth unless reduced motion, via CSS); a wrap or a jump is instant.
  const go = (i: number) => {
    const next = (i + n) % n
    snap(next, Math.abs(next - at) > 1 ? 'instant' : 'auto')
  }

  // Keep the current photo in place when the window (or the phone) turns.
  useEffect(() => {
    if (!open) return
    const onResize = () => snap(at, 'instant')
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, at])

  // Same index → React skips the render, so no throttling is needed.
  const onTrackScroll = () => {
    const t = track.current
    if (!t?.clientWidth) return
    const i = Math.round(t.scrollLeft / t.clientWidth)
    if (i >= 0 && i < n) setAt(i)
  }
  // The strip is a server-rendered child: its scroll reaches us in the capture phase.
  const onStripScroll = (e: React.UIEvent) => {
    const el = e.target as HTMLElement
    const tile = el.matches?.('[data-gallery-tiles]') ? (el.firstElementChild as HTMLElement | null) : null
    if (!tile) return
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2
    setStrip(end ? n - 1 : Math.round(el.scrollLeft / (tile.offsetWidth + 8)))
  }
  const onTileClick = (e: React.MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-photo]')
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    show(Number(a.dataset.photo), a)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: n - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    go(to)
  }
  // Back on the page at the photo the visitor stopped on, when its tile is shown (the phone strip shows all of them).
  const onClose = () => {
    setOpen(false)
    document.body.style.overflow = ''
    const tile = root.current?.querySelector<HTMLElement>(`a[data-photo="${at}"]`)
    if (opener.current?.matches('a[data-photo]') && tile?.offsetParent) {
      tile.scrollIntoView({ block: 'nearest', inline: 'start' })
      tile.focus({ preventScroll: true })
    } else opener.current?.focus()
  }
  const near = (j: number) => open && (Math.abs(j - at) <= 1 || Math.abs(j - at) === n - 1)
  const current = photos[at]

  return (
    <section ref={root} id="foto" aria-labelledby="foto-h" className="ui-gallery pt-[clamp(24px,3vw,40px)]" onClickCapture={onTileClick} onScrollCapture={onStripScroll}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="foto-h" className="m-0 font-mono text-kicker leading-[1.4] font-normal text-ink-2 uppercase">
          Фото студії · {n}
        </h2>
        {n > 1 && (
          <MoreLink as="button" pad={false} label="Відкрити всі фото у переглядачі" onClick={() => show(0, document.activeElement as HTMLElement | null)}>
            Усі фото ({n})
          </MoreLink>
        )}
      </div>
      {children}
      <div className="mt-2.5 flex items-baseline justify-between gap-4 text-[12.5px] leading-[1.4] text-ink-2">
        <p className="m-0">{consent}</p>
        {n > 1 && (
          <p className="m-0 font-mono text-[12px] tracking-[.06em] whitespace-nowrap tabular-nums md:hidden" aria-live="polite">
            {strip === null ? `${n} фото` : `${strip + 1} / ${n}`}
          </p>
        )}
      </div>

      <dialog ref={dialog} className="ui-gallery-dlg" data-tone="ink" aria-label={`Фото студії ${name}`} onClose={onClose} onKeyDown={onKeyDown}>
        <div className="ui-gallery-bar">
          <p className="m-0" aria-live="polite">
            <span aria-hidden>
              {at + 1} / {n}
            </span>
            <span className="sr-only">
              Фото {at + 1} з {n}
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => dialog.current?.close()}>
            Закрити
          </Button>
        </div>
        <div className="ui-gallery-stage">
          <div ref={track} className="ui-gallery-track" onScroll={onTrackScroll}>
            {photos.map((p, j) => (
              // A click beside the photo closes; the keyboard has Escape and «Закрити».
              <div
                key={p.full}
                className="ui-gallery-slide"
                aria-hidden={j !== at || undefined}
                onClick={(e) => {
                  const fig = e.currentTarget.firstElementChild
                  if (!fig || outsidePhoto(e, fig.getBoundingClientRect(), p)) dialog.current?.close()
                }}
              >
                {near(j) && (
                  <figure>
                    <Image src={p.full} alt={p.alt} fill sizes="100vw" className="object-contain" {...(j === at ? { priority: true } : {})} />
                  </figure>
                )}
              </div>
            ))}
          </div>
          {n > 1 && (
            <>
              <button type="button" className="ui-gallery-arrow" data-dir="prev" aria-label="Попереднє фото" onClick={() => go(at - 1)}>
                ←
              </button>
              <button type="button" className="ui-gallery-arrow" data-dir="next" aria-label="Наступне фото" onClick={() => go(at + 1)}>
                →
              </button>
            </>
          )}
        </div>
        <div className="ui-gallery-foot">
          <span>{current.caption}</span>
          <a href={current.full} target="_blank" rel="noopener" aria-label="Відкрити оригінал фото в новій вкладці">
            Оригінал ↗
          </a>
        </div>
      </dialog>
    </section>
  )
}
