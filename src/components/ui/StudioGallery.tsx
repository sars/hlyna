import Image from 'next/image'
import React from 'react'

import { GalleryViewer } from './GalleryViewer.client'

type Photo = { url: string; full: string; alt: string; width: number; height: number; focalY?: number | null }

// The owner's caption; the default alt a photo gets without one («Фото від студії — {name}») says nothing.
export const captionOf = (p: { alt: string }) => (/^Фото(?: від студії)? — /.test(p.alt) ? '' : p.alt.trim())

// Tiles shown from md: 1, 2, 3 (of 3–4) or 5 (of 5+); the rest open in the viewer. The phone strip shows all of them.
const layoutFor = (n: number) => (n >= 5 ? '5' : n >= 3 ? '3' : String(n))

const sizesFor = (layout: string, i: number) => {
  if (layout === '3') return i === 0 ? '(min-width:1680px) 1050px, (min-width:50rem) 66vw, 88vw' : '(min-width:1680px) 510px, (min-width:50rem) 33vw, 88vw'
  if (layout === '5' && i > 0) return '(min-width:1680px) 380px, (min-width:50rem) 25vw, 88vw'
  return '(min-width:1680px) 790px, (min-width:50rem) 50vw, 88vw'
}

// The studio's own photos (SYSTEM.md §4.1): 4:3 tiles with the main photo 2×2 from md, a scroll-snap strip on the phone,
// every tile a link to the original (no JS, crawlers) that opens the viewer.
export function StudioGallery({ photos, name }: { photos: Photo[]; name: string }) {
  if (!photos.length) return null
  const n = photos.length
  const layout = layoutFor(n)
  const alt = (p: Photo, i: number) => captionOf(p) || `${name}, фото ${i + 1} з ${n}`
  return (
    <GalleryViewer
      photos={photos.map((p, i) => ({ full: p.full, alt: alt(p, i), caption: captionOf(p), width: p.width, height: p.height }))}
      name={name}
      consent={`Фото: ${name}, публікуються зі згоди студії.`}
    >
      <div data-gallery-tiles="" data-layout={layout} className="ui-gallery-tiles">
        {photos.map((p, i) => (
          <a key={p.full} href={p.full} target="_blank" rel="noopener" data-photo={i} data-tall={p.height > p.width ? '' : undefined}>
            <Image
              src={p.url}
              alt={alt(p, i)}
              fill
              sizes={sizesFor(layout, i)}
              // The crop set in the panel («Кадр»); without it a tall photo keeps 40% from the top (globals.css).
              style={p.focalY == null ? undefined : { objectPosition: `50% ${p.focalY}%` }}
              {...(i === 0 ? { priority: true } : { loading: 'lazy' as const })}
            />
          </a>
        ))}
      </div>
    </GalleryViewer>
  )
}
