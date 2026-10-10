'use client'

import React, { useEffect, useRef, useState } from 'react'

// Instagram posts on a studio profile. Nothing loads from Instagram until the block is near the viewport
// (no third-party script, no cookies before that). Until a post's embed has actually loaded, a compact card
// with a link stands in its place, so a slow or blocked Instagram never leaves big empty boxes.
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
    <div ref={ref} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {urls.map((u) => (
        <Post key={u} url={u} handle={handle} show={show} />
      ))}
    </div>
  )
}

function Post({ url, handle, show }: { url: string; handle?: string; show: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const code = url.match(/\/(p|reel)\/([\w-]+)/)
  if (!code) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      {!loaded && (
        <a href={url} target="_blank" rel="noopener nofollow" className="flex items-center justify-between gap-3 px-4 py-3.5 text-[15px] text-ink no-underline hover:text-cobalt">
          <span>
            <span className="block font-semibold">{code[1] === 'reel' ? 'Відео' : 'Пост'} в Instagram</span>
            {handle && <span className="block text-sm text-umber">@{handle}</span>}
          </span>
          <span aria-hidden className="text-terra">→</span>
        </a>
      )}
      {show && (
        <iframe
          src={`https://www.instagram.com/${code[1]}/${code[2]}/embed/`}
          title={handle ? `Пост @${handle} в Instagram` : 'Пост в Instagram'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={loaded ? 'block h-[480px] w-full border-0 sm:h-[560px]' : 'block h-0 w-full border-0'}
        />
      )}
    </div>
  )
}
