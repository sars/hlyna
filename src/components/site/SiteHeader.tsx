import Link from 'next/link'
import React from 'react'

import { utilityNav } from '@/content/navigation'
import { MainNav } from './MainNav.client'

export function SiteHeader() {
  return (
    <>
      <div className="border-b border-line text-[13px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2.5 px-4 py-1.5 sm:px-5">
          <nav aria-label="Швидкі посилання" className="flex flex-wrap gap-4">
            {utilityNav.map((l) => (
              <Link key={l.href} href={l.href} className="text-umber no-underline hover:text-cobalt">
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="font-bold text-ink" aria-label="Мова сайту">
            UA
          </span>
        </div>
      </div>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-clay">
        <div className="band" aria-hidden />
        <nav aria-label="Головне меню" className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 sm:px-5">
          <Link href="/" className="font-display text-xl font-bold whitespace-nowrap text-cobalt no-underline hover:text-cobalt" aria-label="Глина — на головну">
            глина<span className="text-terra">.</span>юа
          </Link>
          <MainNav />
        </nav>
      </header>
    </>
  )
}
