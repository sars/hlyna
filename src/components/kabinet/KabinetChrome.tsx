import Link from 'next/link'
import React from 'react'

import { Mark } from '@/components/ui/Mark'
import { cx, wrap } from '@/components/ui/layout'

// The cabinet's own header and one-line footer (SYSTEM.md §4.4): no mega menu, search, request button or footer columns.
export function KabinetHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="kb-head">
      <div className={cx(wrap, 'kb-head-in')}>
        <Link href="/kabinet" className="inline-flex items-center gap-2.5 font-display text-[22px] leading-none font-extrabold tracking-[.02em] whitespace-nowrap text-ink uppercase no-underline hover:text-ink" aria-label="Глина — кабінет студії">
          <Mark size={26} />
          Глина
        </Link>
        <span className="kb-title">Кабінет студії</span>
        <nav className="kb-nav" aria-label="Кабінет">
          <Link href="/" className="kb-site">
            На сайт →
          </Link>
          {signedIn && (
            <form action="/kabinet/api/logout" method="post" className="m-0">
              <button type="submit" className="kb-out">
                Вийти
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  )
}

export function KabinetFooter() {
  return (
    <footer className="border-t border-rule">
      <div className={cx(wrap, 'kb-foot')}>
        <span>Глина · hlyna.com.ua</span>
        <Link href="/zapyt?vid=studiya">Питання? Напишіть нам</Link>
      </div>
    </footer>
  )
}
