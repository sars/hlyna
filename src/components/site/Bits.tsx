import Link from 'next/link'
import React from 'react'

import { site } from '@/content/site'
import { JsonLd } from './JsonLd'

export const container = 'mx-auto max-w-[1200px] px-4 sm:px-5'

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
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
    </>
  )
}

// The site's signature device: one Kotsiubynsky-style image, then a wink and the plain point.
// Max one or two per page, never in the factual lead, tables, prices or FAQ (docs/voice).
export function LyricNote({ image, prose }: { image: string; prose: string }) {
  return (
    <aside className="relative rounded-2xl border border-line bg-cream py-3.5 pr-4 pl-6 before:absolute before:top-3 before:bottom-3 before:left-0 before:w-1.5 before:rounded-md before:bg-[repeating-linear-gradient(180deg,var(--color-terra)_0_10px,var(--color-cobalt)_10px_20px,var(--color-ochre)_20px_30px)]">
      <span className="font-display text-[10.5px] tracking-[.14em] text-terra uppercase">ліричний відступ</span>
      <p className="mt-1.5 mb-0 text-[16.5px]">
        <i className="text-[#4a3628]">{image}</i> <b className="text-cobalt">Прозою:</b> {prose}
      </p>
    </aside>
  )
}

export function Updated() {
  return <p className="m-0 text-[13px] text-umber">Оновлено: {site.dataUpdated}</p>
}

export function SectionHead({ kicker, title, id, children }: { kicker?: string; title: string; id?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 grid max-w-[760px] gap-2">
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 id={id} className="h-display m-0 text-[clamp(19px,2.4vw,26px)] leading-[1.15]">
        {title}
      </h2>
      {children}
    </div>
  )
}
