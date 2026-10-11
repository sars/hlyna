import Link from 'next/link'
import React from 'react'

import { Mark } from '@/components/ui/Mark'
import { wrap } from '@/components/ui/layout'
import { utilityNav } from '@/content/navigation'
import { MainNav } from './MainNav.client'

// Header «Реєстр» (docs/design/SYSTEM.md §4.2): a mono utility strip (lg+), then the sticky row under a 2px ink rule:
// mark + ГЛИНА, the menu with its mega panels, the request button. The same on every page.
export function SiteHeader() {
  return (
    <>
      <div className="hidden border-b border-rule lg:block">
        <div className={wrap}>
          <nav aria-label="Швидкі посилання" className="flex gap-[22px] py-[7px] font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
            {utilityNav.map((l) => (
              <Link key={l.href} href={l.href} className="text-ink-2 no-underline hover:text-cobalt">
                {l.label}
              </Link>
            ))}
            <span className="ml-auto font-medium text-ink" aria-label="Мова сайту">
              UA
            </span>
          </nav>
        </div>
      </div>
      <header className="nav-head sticky top-[env(safe-area-inset-top,0px)] z-20 border-b-2 border-ink bg-paper">
        <div className={`${wrap} nav-top`}>
          <Link href="/" className="inline-flex items-center gap-2.5 font-display text-[22px] leading-none font-extrabold tracking-[.02em] whitespace-nowrap text-ink uppercase no-underline hover:text-ink" aria-label="Глина — на головну">
            <Mark size={26} />
            Глина
          </Link>
          <MainNav />
        </div>
      </header>
    </>
  )
}
