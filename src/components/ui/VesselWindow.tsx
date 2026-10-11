import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { SitePhoto } from '@/content/photos'

// Photos cut to the shape of a vessel (jug, bowl, plate) with an SVG clip path in objectBoundingBox units; home page only.
// Put the windows inside <VesselWindows>, which also draws the clip paths once. Below md they are rows with a 120px window,
// from md three centred columns, from lg a ruled strip (window 170px on the left, title and caption on the right).
// Styles: `.ui-vessel*` in globals.css.
export function VesselWindows({ children, label = 'Формати майстер-класів' }: { children: React.ReactNode; label?: string }) {
  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <clipPath id="jug" clipPathUnits="objectBoundingBox">
            <path d="M.36 0 H.64 C.66 0 .67 .02 .66 .04 L.61 .09 C.6 .13 .6 .17 .62 .2 C.78 .28 .9 .42 .92 .6 C.94 .8 .84 .96 .66 1 H.34 C.16 .96 .06 .8 .08 .6 C.1 .42 .22 .28 .38 .2 C.4 .17 .4 .13 .39 .09 L.34 .04 C.33 .02 .34 0 .36 0 Z" />
          </clipPath>
          <clipPath id="bowl" clipPathUnits="objectBoundingBox">
            <path d="M.03 .3 C.03 .22 .25 .18 .5 .18 C.75 .18 .97 .22 .97 .3 C.97 .6 .82 .9 .62 .98 L.38 .98 C.18 .9 .03 .6 .03 .3 Z" />
          </clipPath>
          <clipPath id="plate" clipPathUnits="objectBoundingBox">
            <circle cx=".5" cy=".5" r=".5" />
          </clipPath>
        </defs>
      </svg>
      <div className="ui-vessels" aria-label={label}>
        {children}
      </div>
    </>
  )
}

export function VesselWindow({ shape, photo, title, caption, href }: { shape: 'jug' | 'bowl' | 'plate'; photo: SitePhoto; title: string; caption: string; href: string }) {
  return (
    <Link href={href} className="ui-vessel" data-shape={shape}>
      <span className="ui-vessel-win">
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(min-width:960px) 170px, 120px" />
      </span>
      <h3>{title}</h3>
      <small>{caption}</small>
    </Link>
  )
}
