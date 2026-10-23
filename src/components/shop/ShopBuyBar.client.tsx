'use client'

import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { uah } from '@/lib/shop'

// The phone's fixed buy bar (DESIGN.md §2 ShopBuyBar): the same shell as MobileRequestBar (`data-request-bar` keeps the
// footer's room), price on the left, the one action on the right; it shows while the watched block (buy box or order
// summary) is off screen and steps aside while it is visible.
export function ShopBuyBar({ priceKop, note, label, tone = 'cobalt', watch, href, onClick }: { priceKop: number; note?: string | null; label: string; tone?: 'cobalt' | 'ink'; watch: string; href?: string; onClick?: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = document.querySelector(watch)
    if (!el) return
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [watch])
  const hidden = visible
  return (
    <div data-request-bar="" inert={hidden} aria-hidden={hidden} className={`ui-buybar fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-gutter pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] transition-transform duration-200 lg:hidden ${hidden ? 'translate-y-full' : ''}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
        <p className="m-0 grid gap-0.5">
          <span className="font-display text-[17px] leading-none font-semibold text-cobalt tabular-nums">{uah(priceKop)}</span>
          {note && <span className="font-mono text-[10.5px] tracking-[.06em] text-ink-2 uppercase">{note}</span>}
        </p>
        {href ? (
          <Button href={href} variant={tone} full arrow>
            {label}
          </Button>
        ) : (
          <Button variant={tone} full arrow onClick={onClick}>
            {label}
          </Button>
        )}
      </div>
    </div>
  )
}
