'use client'

import Link from 'next/link'
import React, { useEffect } from 'react'

// Shown when a page fails to render (e.g. the server restarts during a deploy): a branded page with a retry instead of a blank screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="mx-auto grid max-w-[760px] gap-5 px-4 pt-16 pb-24 sm:px-5">
      <span className="kicker">Тимчасова помилка</span>
      <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Сторінка не завантажилась</h1>
      <p className="m-0 text-lg text-umber">Так буває, коли ми саме оновлюємо сайт. Спробуйте ще раз за кілька секунд.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-terra px-5 py-3 font-bold text-cream hover:bg-terra-dark">
          Спробувати ще раз
        </button>
        <Link href="/" className="inline-flex items-center rounded-full border border-line bg-card px-5 py-3 font-bold text-ink no-underline">
          На головну
        </Link>
      </div>
    </main>
  )
}
