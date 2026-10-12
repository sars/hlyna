'use client'

import React, { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'

// Shown when a page fails to render (e.g. the server restarts during a deploy): a branded page with a retry instead of a blank screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className={cx(wrap, 'pt-16 pb-24')}>
      <div className="grid max-w-narrow gap-5">
        <Kicker>Тимчасова помилка</Kicker>
        <h1 className="m-0 font-display text-h1">Сторінка не завантажилась</h1>
        <p className="m-0 text-lead">Так буває, коли ми саме оновлюємо сайт. Спробуйте ще раз за кілька секунд.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>Спробувати ще раз</Button>
          <Button href="/" variant="ghost">
            На головну
          </Button>
        </div>
      </div>
    </main>
  )
}
