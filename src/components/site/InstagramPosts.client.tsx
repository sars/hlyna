'use client'

import React, { useEffect, useRef, useState } from 'react'

// Instagram posts on a studio profile. Nothing loads from Instagram until the block is near the viewport
// (no third-party script, no cookies before that). Until a post's embed has actually loaded, a compact card
// with a link stands in its place, so a slow or blocked Instagram never leaves big empty boxes.
// `columns={1}` is a single post at full width (a top-list row); inside a closed `details` the block has no box, so the
// observer only fires once the reader opens it.
export function InstagramPosts({ urls, handle, columns = 2 }: { urls: string[]; handle?: string; columns?: 1 | 2 }) {
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
    <div ref={ref} className={columns === 2 ? 'grid grid-cols-1 items-start gap-x-6 gap-y-2 sm:grid-cols-2' : 'grid grid-cols-1 items-start gap-y-2'}>
      {urls.map((u) => (
        <Post key={u} url={u} handle={handle} show={show} />
      ))}
    </div>
  )
}

function Post({ url, handle, show }: { url: string; handle?: string; show: boolean }) {
  // The card stays until Instagram's embed reports its real height (postMessage «MEASURE»). An embed that loads
  // empty (blocked, private, deleted post, no third-party frames) never reports, so the card simply stays.
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    if (!show) return
    const onMessage = (e: MessageEvent) => {
      if (!/^https:\/\/www\.instagram\.com$/.test(e.origin) || e.source !== frame.current?.contentWindow) return
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        const h = Number(msg?.details?.height)
        if (msg?.type === 'MEASURE' && h > 200) setHeight(Math.min(h, 900))
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [show])
  const code = url.match(/\/(p|reel)\/([\w-]+)/)
  if (!code) return null
  return (
    <div className="overflow-hidden border-y border-rule">
      {!height && (
        <a href={url} target="_blank" rel="noopener nofollow" className="flex items-center justify-between gap-3 px-4 py-3.5 text-[15px] text-ink no-underline hover:text-cobalt">
          <span>
            <span className="block font-display text-[15px] leading-[1.2] font-semibold">{code[1] === 'reel' ? 'Відео' : 'Пост'} в Instagram</span>
            {handle && <span className="mt-0.5 block font-mono text-xs text-ink-2">@{handle}</span>}
            {show && <span className="mt-0.5 block font-mono text-[11.5px] tracking-[.04em] text-ink-2">Завантаження з Instagram…</span>}
          </span>
          <span aria-hidden className="font-mono text-sm text-cobalt">→</span>
        </a>
      )}
      {show && (
        <iframe
          ref={frame}
          src={`https://www.instagram.com/${code[1]}/${code[2]}/embed/`}
          title={handle ? `Пост @${handle} в Instagram` : 'Пост в Instagram'}
          loading="lazy"
          style={height ? { height } : undefined}
          className={height ? 'block w-full border-0' : 'block h-0 w-full border-0'}
        />
      )}
    </div>
  )
}
