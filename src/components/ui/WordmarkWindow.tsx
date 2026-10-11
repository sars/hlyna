import { getImageProps } from 'next/image'
import ReactDOM from 'react-dom'
import React from 'react'

import type { SitePhoto } from '@/content/photos'

// «ГЛИНА» as a window cut into a photograph (home page only, SYSTEM.md §6.3). The photo is a CSS background clipped to the
// letters: `image-set` gives 1x/2x from next/image, both variants are preloaded for their own viewport, and where
// `background-clip: text` is missing the word falls back to plain ink. Decorative: the real <h1> follows it.
export function WordmarkWindow({ photo }: { photo: { desktop: SitePhoto; mobile: SitePhoto } }) {
  const make = (p: SitePhoto, width: number, height: number) => {
    const { props } = getImageProps({ src: p.src, width, height, quality: 75, alt: '' })
    const srcSet = props.srcSet ?? props.src
    const set = srcSet
      .split(', ')
      .map((part) => {
        const [url, density] = part.split(' ')
        return `url("${url}") ${density ?? '1x'}`
      })
      .join(', ')
    return { srcSet, imageSet: `image-set(${set})`, first: srcSet.split(' ')[0] }
  }
  const d = make(photo.desktop, 1600, 600)
  const m = make(photo.mobile, 800, 300)
  ReactDOM.preload(d.first, { as: 'image', imageSrcSet: d.srcSet, fetchPriority: 'high', media: '(min-width: 60rem)' })
  ReactDOM.preload(m.first, { as: 'image', imageSrcSet: m.srcSet, fetchPriority: 'high', media: '(max-width: 59.99rem)' })
  return (
    <div className="ui-wordmark" aria-hidden="true" style={{ '--wm-d': d.imageSet, '--wm-m': m.imageSet } as React.CSSProperties}>
      Глина
    </div>
  )
}
