import Link from 'next/link'
import React from 'react'

import { Mark } from '@/components/ui/Mark'
import { wrap } from '@/components/ui/layout'
import { footerColumns } from '@/content/navigation'
import { site } from '@/content/site'

// The footer links every hub so crawlers and LLMs can reach the whole site from any page (SYSTEM.md §4.2).
// Mono type, no fill: an about column with the date and the model in one line, then the link columns.
export function SiteFooter() {
  return (
    <footer data-site-footer="" className={`${wrap} mt-[clamp(56px,8vw,96px)] border-t-2 border-ink pt-[26px] pb-11`}>
      <div className="grid grid-cols-2 gap-[18px] font-mono text-[11.5px] leading-[1.7] tracking-[.03em] text-ink-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
        <div className="col-span-2 grid content-start gap-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 font-display text-base leading-none font-extrabold tracking-[.02em] text-ink uppercase no-underline hover:text-ink">
            <Mark size={22} />
            Глина
          </Link>
          <p className="m-0">{site.description}</p>
          <p className="m-0">Дані оновлено: {site.dataUpdated}</p>
          <p className="m-0">{site.model}</p>
        </div>
        {footerColumns.map((c) => (
          <div key={c.title}>
            <p className="m-0 mb-1.5 font-medium tracking-[.08em] text-ink uppercase">{c.title}</p>
            <ul className="m-0 grid list-none p-0">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block py-1.5 text-ink-2 no-underline hover:text-cobalt lg:py-0">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap justify-between gap-2.5 border-t border-rule pt-4 font-mono text-[11.5px] tracking-[.03em] text-ink-2">
        <span>© {new Date().getFullYear()} Глина · hlyna.com.ua · Українська кераміка ручної роботи</span>
        <span>Українською</span>
      </div>
    </footer>
  )
}
