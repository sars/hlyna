import Image from 'next/image'
import React from 'react'

import { GalleryViewer } from '@/components/ui/GalleryViewer.client'
import { captionOf } from '@/components/ui/StudioGallery'

type Photo = { url: string; full: string; alt: string; width: number; height: number; focalY?: number | null }

const isWide = (p: Photo) => p.width > p.height
const sizesFor = (p: Photo) => (isWide(p) ? '(min-width: 40rem) 300px, 93vw' : '(min-width: 40rem) 200px, 62vw')

// The studio's own photos of a top-list item (SYSTEM.md §4.2), in place of the Instagram embed: 4:5 tiles in a scroll-snap
// strip with a peek of the next one (a landscape photo gets a 6:5 tile of the same height); one photo is just a tile.
// Tiles are links to the originals (no JS, crawlers); the compact GalleryViewer opens them full screen. Under the strip:
// the consent line and the post the photos come from — `embed` stays the source, nothing loads from Instagram.
export function TopPhotos({ photos, name, source }: { photos: Photo[]; name: string; source?: string }) {
  if (!photos.length) return null
  const n = photos.length
  const alt = (p: Photo, i: number) => captionOf(p) || `${name}, фото ${i + 1} з ${n}`
  const consent = `Фото: ${name}, зі згоди студії.`
  return (
    <GalleryViewer
      compact
      photos={photos.map((p, i) => ({ full: p.full, alt: alt(p, i), caption: captionOf(p), width: p.width, height: p.height }))}
      name={name}
      consent={consent}
    >
      <div className="ui-strip" data-n={n}>
        {photos.map((p, i) => (
          <a key={p.full} href={p.full} target="_blank" rel="noopener" data-photo={i} data-wide={isWide(p) ? '' : undefined}>
            <Image
              src={p.url}
              alt={alt(p, i)}
              fill
              sizes={sizesFor(p)}
              loading="lazy"
              style={p.focalY == null ? undefined : { objectPosition: `50% ${p.focalY}%` }}
            />
          </a>
        ))}
      </div>
      <p className="ui-strip-foot m-0">
        <span>{consent}</span>
        {source && (
          <a href={source} target="_blank" rel="noopener nofollow">
            {/\/reel\//.test(source) ? 'Відео' : 'Допис'} в Instagram ↗
          </a>
        )}
      </p>
    </GalleryViewer>
  )
}
