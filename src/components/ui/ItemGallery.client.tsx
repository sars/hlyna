'use client'

import Image from 'next/image'
import React, { useState } from 'react'

import type { CardPhoto } from '@/shop/types'

import { GalleryViewer } from './GalleryViewer.client'
import { PhotoCredit } from './PhotoCredit'

// An item's photos (DESIGN.md §2 ItemGallery): from md a column of 72px thumbnails and a 4:5 main frame (a landscape
// photo is contained on paper-2); on a phone a bleed scroll-snap strip with a counter. Every tile is a link to the
// original; a plain click opens the compact GalleryViewer. The thumbnails switch the main photo without scrolling.
export function ItemGallery({ photos, title, studio }: { photos: CardPhoto[]; title: string; studio: string }) {
  const [at, setAt] = useState(0)
  const [seen, setSeen] = useState(0)
  const n = photos.length
  if (!n) return null
  const alt = (p: CardPhoto, i: number) => (p.alt || title) + (i > 0 ? `, фото ${i + 1} з ${n}` : '')
  const main = photos[at] ?? photos[0]!
  const wide = main.width > main.height
  const onStrip = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const tile = el.firstElementChild as HTMLElement | null
    if (!tile) return
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2
    setSeen(end ? n - 1 : Math.round(el.scrollLeft / (tile.offsetWidth + 8)))
  }
  return (
    <GalleryViewer compact photos={photos.map((p, i) => ({ full: p.url, alt: alt(p, i), caption: '', width: p.width, height: p.height }))} name={studio} consent={`Фото: ${studio}, зі згоди студії.`}>
      <div className="ui-igal" data-n={n}>
        {n > 1 && (
          <div className="ui-igal-thumbs" role="tablist" aria-label="Фото виробу">
            {photos.map((p, i) => (
              <button key={p.url} type="button" role="tab" aria-selected={i === at} aria-label={`Фото ${i + 1}`} onClick={() => setAt(i)} onKeyDown={(e) => (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? setAt((at + 1) % n) : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? setAt((at + n - 1) % n) : undefined)}>
                <Image src={p.small} alt="" fill sizes="72px" loading="lazy" style={p.focalY == null ? undefined : { objectPosition: `50% ${p.focalY}%` }} />
              </button>
            ))}
          </div>
        )}
        <a className="ui-igal-main" href={main.url} target="_blank" rel="noopener" data-photo={at} data-wide={wide ? '' : undefined}>
          <Image key={main.url} src={main.url} alt={alt(main, at)} fill sizes="(min-width:60rem) 55vw, 100vw" priority={at === 0} style={main.focalY == null || wide ? undefined : { objectPosition: `50% ${main.focalY}%` }} />
        </a>
        <div className="ui-igal-strip" onScroll={onStrip}>
          {photos.map((p, i) => (
            <a key={p.url} href={p.url} target="_blank" rel="noopener" data-photo={i}>
              <Image src={p.url} alt={alt(p, i)} fill sizes="100vw" priority={i === 0} loading={i === 0 ? undefined : 'lazy'} style={p.focalY == null ? undefined : { objectPosition: `50% ${p.focalY}%` }} />
            </a>
          ))}
        </div>
        {n > 1 && (
          <p className="ui-igal-count m-0" aria-live="polite">
            {seen + 1} / {n}
          </p>
        )}
      </div>
      <PhotoCredit studios={[studio]} />
    </GalleryViewer>
  )
}
