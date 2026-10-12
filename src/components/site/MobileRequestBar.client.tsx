'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { requestHrefFor } from '@/content/navigation'

// Phone-only bar with the request button. Jumps to the page's own form (#zapyt-forma) when there is one and
// hides while that form is on screen, so it never covers the form's fields; otherwise opens /zapyt with the
// page's context (kind of request, city). Pages that show it keep a bottom padding of at least 76px on <main>.
export function MobileRequestBar() {
  const pathname = usePathname()
  const [hasForm, setHasForm] = useState(false)
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById('zapyt-forma')
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the form exists only after hydration */
    setHasForm(Boolean(el))
    if (!el) return
    const io = new IntersectionObserver((entries) => setFormVisible(entries.some((e) => e.isIntersecting)), { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [pathname])

  if (pathname?.startsWith('/zapyt')) return null
  return (
    <div
      data-request-bar=""
      inert={formVisible}
      aria-hidden={formVisible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-gutter pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] transition-transform duration-200 lg:hidden ${formVisible ? 'translate-y-full' : ''}`}
    >
      <Button href={hasForm ? '#zapyt-forma' : requestHrefFor(pathname)} variant="cobalt" full arrow>
        Отримати пропозиції
      </Button>
    </div>
  )
}
