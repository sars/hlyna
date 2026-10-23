'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { track } from '@/lib/track'

// One GA4 event after mount (DESIGN.md §6): `view_item` on an item page; `purchase` on the order page, once per checkout
// (a sessionStorage flag), and only when the page was opened straight from the checkout (`?new=1`, removed from the URL).
export function TrackView({ event, params, once }: { event: 'view_item' | 'purchase'; params: Record<string, string | number | undefined>; once?: string }) {
  const router = useRouter()
  useEffect(() => {
    if (once) {
      const key = `hl:purchased:${once}`
      const url = new URL(window.location.href)
      const fresh = url.searchParams.get('new') === '1'
      if (fresh) {
        url.searchParams.delete('new')
        router.replace(url.pathname + (url.search || ''), { scroll: false })
      }
      try {
        if (!fresh || sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
      } catch {
        if (!fresh) return
      }
    }
    track(event, params)
    // the event belongs to this page view only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
