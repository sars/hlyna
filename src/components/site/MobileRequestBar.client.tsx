'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { requestHrefFor } from '@/content/navigation'

// Phone-only bar with the request button. Jumps to the page's own form (#zapyt-forma) when there is one and
// hides while that form is on screen, so it never covers the form's fields; otherwise opens /zapyt with the
// page's context (kind of request, city).
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
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-line bg-clay/95 px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 lg:hidden ${formVisible ? 'translate-y-full' : ''}`}
      aria-hidden={formVisible}
    >
      <a href={hasForm ? '#zapyt-forma' : requestHrefFor(pathname)} tabIndex={formVisible ? -1 : 0} className="flex w-full justify-center rounded-full bg-terra px-5 py-3 font-bold text-cream no-underline hover:text-cream">
        Отримати пропозиції
      </a>
    </div>
  )
}
