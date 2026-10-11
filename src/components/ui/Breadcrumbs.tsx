import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'

// Breadcrumbs plus the page's BreadcrumbList and WebPage JSON-LD (dateModified: newest data behind the page when the caller
// knows it, else the editorial content date). Same markup contract as the old Bits.Breadcrumbs.
export function Breadcrumbs({ items, modified }: { items: { label: string; href?: string }[]; modified?: string | null }) {
  return (
    <>
      <nav aria-label="Навігація" className="font-mono text-xs tracking-[.04em] text-ink-2">
        <ol className="m-0 flex list-none flex-wrap p-0">
          {items.map((it, i) => (
            <li key={it.label} className="flex">
              {i > 0 && <span aria-hidden className="mx-1.5 opacity-60">›</span>}
              {it.href ? (
                <Link href={it.href} className="text-ink-2 no-underline hover:text-cobalt">
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
