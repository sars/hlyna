import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { SitePhoto } from '@/content/photos'

// A numbered photo card of the home page (1:1 photo, big number, title, text, call to action).
// From lg it is a grid cell (put six in a 3×2 grid); below lg it is a compact row with the photo on the left.
// Styles: `.ui-pcard` in globals.css.
export function PhotoCard({ n, title, text, cta, href, tone, photo }: { n: string; title: string; text: string; cta: string; href: string; tone: 'ink' | 'cobalt'; photo: SitePhoto }) {
  return (
    <Link href={href} className="ui-pcard" data-pcard={tone}>
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(min-width:960px) 33vw, 108px" />
      <span className="ui-pcard-n">{n}</span>
      <div className="ui-pcard-t">
        <h3>{title}</h3>
        <p>{text}</p>
        <span className="ui-pcard-go">{cta}</span>
      </div>
    </Link>
  )
}
