'use client'

import React from 'react'

// Last-resort error page when even the layout fails: plain HTML with the site's colours, no external assets, no CSS file
// (the root layout and its stylesheet are gone). The home link is a plain <a> on purpose: after a crash it must reload the app.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0, background: '#efe9de', color: '#15130f', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 16px' }}>
          <p style={{ color: '#4e483f', fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 12 }}>глина · тимчасова помилка</p>
          <h1 style={{ fontSize: 32, margin: '8px 0 16px', fontWeight: 600 }}>Сторінка не завантажилась</h1>
          <p style={{ fontSize: 18, color: '#4e483f' }}>Ми, ймовірно, саме оновлюємо сайт. Спробуйте ще раз за кілька секунд.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: '14px 22px', borderRadius: 2, border: 0, background: '#15130f', color: '#efe9de', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer' }}>
            Спробувати ще раз
          </button>
          <p style={{ marginTop: 24 }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: '#1d3ec6' }}>
              На головну
            </a>
          </p>
        </main>
      </body>
    </html>
  )
}
