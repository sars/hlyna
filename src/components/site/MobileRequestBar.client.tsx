'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { requestHrefFor } from '@/content/navigation'

// Phone-only bar with the request button. Opens the page's own chat (#zapyt-forma[data-chat], full-screen on a
// phone) or jumps to its form (#zapyt-forma), and hides while that block is on screen so it never covers the
// fields; otherwise opens /zapyt with the page's context (kind of request, city). Pages that show it keep a bottom
// padding of at least 76px on <main>.
export function MobileRequestBar() {
  const pathname = usePathname()
  const [hasForm, setHasForm] = useState(false)
  const [hasChat, setHasChat] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    // The bar steps aside while the page's own form or the hero's request button is on screen.
    const form = document.getElementById('zapyt-forma')
    const hero = document.querySelector('[data-hero-cta]')
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the form exists only after hydration */
    setHasForm(Boolean(form))
    setHasChat(Boolean(form?.hasAttribute('data-chat')))
    const watch = (el: Element | null, set: (v: boolean) => void, rootMargin?: string) => {
      if (!el) return () => {}
      const io = new IntersectionObserver((entries) => set(entries.some((e) => e.isIntersecting)), { rootMargin })
      io.observe(el)
      return () => io.disconnect()
    }
    const stops = [watch(form, setFormVisible, '0px 0px -10% 0px'), watch(hero, setHeroVisible)]
    return () => stops.forEach((stop) => stop())
  }, [pathname])

  const hidden = formVisible || heroVisible
  // The shop has its own bar (ShopBuyBar): buying is the primary action there.
  if (pathname?.startsWith('/zapyt') || pathname?.startsWith('/kramnytsia')) return null
  return (
    <div
      data-request-bar=""
      inert={hidden}
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-gutter pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] transition-transform duration-200 lg:hidden ${hidden ? 'translate-y-full' : ''}`}
    >
      {hasChat ? (
        <Button variant="cobalt" full arrow onClick={() => window.dispatchEvent(new CustomEvent('hl:chat-open'))}>
          Написати
        </Button>
      ) : (
        <Button href={hasForm ? '#zapyt-forma' : requestHrefFor(pathname)} variant="cobalt" full arrow>
          Отримати пропозиції
        </Button>
      )}
    </div>
  )
}
