import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { site } from '@/content/site'
import { JsonLd } from './JsonLd'

export const container = 'mx-auto max-w-[1200px] px-4 sm:px-5'

// Breadcrumbs also emit the page's WebPage JSON-LD with dateModified: the newest data behind the page when the
// caller knows it (studio updatedAt), else the editorial content date.
export function Breadcrumbs({ items, modified }: { items: { label: string; href?: string }[]; modified?: string | null }) {
  return (
    <>
      <nav aria-label="Навігація" className="text-[13px] text-umber">
        <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {items.map((it, i) => (
            <li key={it.label} className="flex gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              {it.href ? (
                <Link href={it.href} className="text-umber no-underline hover:text-cobalt">
                  {it.label}
                </Link>
              ) : (
                <span aria-current="page">{it.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, ...(it.href ? { item: site.url + it.href } : {}) })),
        }}
      />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: items[items.length - 1]?.label, inLanguage: 'uk', dateModified: (modified || site.contentUpdated).slice(0, 10), isPartOf: { '@type': 'WebSite', url: site.url } }} />
    </>
  )
}

// The site's signature device: a short verse epigraph in the spirit of Kotsiubynsky, set apart from the prose.
// One per page at most, never in the factual lead, tables, prices or FAQ, and never explained (docs/voice).
export function Epigraph({ lines }: { lines: string[] }) {
  return (
    <figure className="m-0 border-l-[3px] border-ochre py-1.5 pl-[22px]">
      <p className="m-0 text-[19px] leading-[1.55] text-[#5a3f2c] italic">
        {lines.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {l}
          </React.Fragment>
        ))}
      </p>
      <span aria-hidden className="mt-3 block h-2 w-14 bg-[repeating-linear-gradient(90deg,var(--color-terra)_0_12px,transparent_12px_16px,var(--color-cobalt)_16px_28px,transparent_28px_32px,var(--color-ochre)_32px_44px)]" />
    </figure>
  )
}

export function Updated() {
  return <p className="m-0 text-[13px] text-umber">Оновлено: {site.dataUpdated}</p>
}

export function SectionHead({ kicker, title, id, children }: { kicker?: string; title: string; id?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 grid grid-cols-1 max-w-[760px] gap-2">
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 id={id} className="h-display m-0 text-[clamp(19px,2.4vw,26px)] leading-[1.15]">
        {title}
      </h2>
      {children}
    </div>
  )
}

// A documentary photo with its visible credit (CC BY-SA requires author + license on the page).
export function DocPhoto({ photo, priority = false, className = '' }: { photo: import('@/content/photos').DocPhoto; priority?: boolean; className?: string }) {
  return (
    <figure className={`m-0 grid grid-cols-1 gap-1.5 ${className}`}>
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} priority={priority} sizes="(min-width:1024px) 520px, 100vw" className="aspect-[16/11] w-full rounded-[26px] object-cover" />
      <figcaption className="text-[11.5px] text-umber">
        Фото: {photo.author}, <a href={photo.href} target="_blank" rel="noopener nofollow" className="text-umber">{photo.license}</a>, {photo.source ?? 'Wikimedia Commons'}
      </figcaption>
    </figure>
  )
}
