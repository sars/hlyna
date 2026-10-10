'use client'

import React, { useEffect, useRef, useState } from 'react'

// Instagram posts on a studio profile. Nothing loads from Instagram until the block is near the
// viewport (no third-party script, no cookies before that); then each post is a plain embed iframe.
export function InstagramPosts({ urls, handle }: { urls: string[]; handle?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || show) return
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setShow(true), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [show])

  return (
    <div ref={ref} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {urls.map((u) => {
        const code = u.match(/\/(p|reel)\/([\w-]+)/)
        if (!code) return null
        return (
          <div key={u} className="overflow-hidden rounded-2xl border border-line bg-card" style={{ minHeight: 480 }}>
            {show ? (
              <iframe
                src={`https://www.instagram.com/${code[1]}/${code[2]}/embed/`}
                title={handle ? `Пост @${handle} в Instagram` : 'Пост в Instagram'}
                loading="lazy"
                className="block h-[480px] w-full border-0"
                allowTransparency
              />
            ) : (
              <a href={u} target="_blank" rel="noopener nofollow" className="grid h-[480px] place-items-center text-sm text-umber">
                Пост в Instagram
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
