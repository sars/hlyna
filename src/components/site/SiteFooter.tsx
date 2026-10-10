import Link from 'next/link'
import React from 'react'

import { footerColumns } from '@/content/navigation'
import { site } from '@/content/site'

// The footer links every hub so crawlers and LLMs can reach the whole site from any page.
export function SiteFooter() {
  return (
    <footer className="mt-5 border-t border-line bg-card pt-11 pb-8">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-5">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Link href="/" className="font-display text-xl font-bold text-cobalt no-underline">
              глина
            </Link>
            <p className="mt-2 text-sm text-umber">{site.description}</p>
            <p className="mt-2 text-sm text-umber">Дані оновлено: {site.dataUpdated}</p>
          </div>
          {footerColumns.map((c) => (
            <div key={c.title}>
              <p className="kicker mb-2.5">{c.title}</p>
              <ul className="grid gap-1.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-ink no-underline hover:text-cobalt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-2.5 border-t border-line pt-4 text-[13px] text-umber">
          <span>© {new Date().getFullYear()} Глина · hlyna.com.ua · Українська кераміка ручної роботи</span>
          <span>Українською</span>
        </div>
      </div>
    </footer>
  )
}
