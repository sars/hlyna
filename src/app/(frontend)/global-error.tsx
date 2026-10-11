'use client'

import React from 'react'

// Last-resort error page when even the layout fails: plain HTML with the site's colours, no external assets.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0, background: '#f3e7da', color: '#2a2018', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 16px' }}>
          <p style={{ color: '#b4683f', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>глина · тимчасова помилка</p>
          <h1 style={{ fontSize: 32, margin: '8px 0 16px' }}>Сторінка не завантажилась</h1>
          <p style={{ fontSize: 18, color: '#6c5243' }}>Ми, ймовірно, саме оновлюємо сайт. Спробуйте ще раз за кілька секунд.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: '12px 20px', borderRadius: 999, border: 0, background: '#b4683f', color: '#fbf3ea', fontWeight: 700, cursor: 'pointer' }}>
            Спробувати ще раз
          </button>
          <p style={{ marginTop: 24 }}>
            <a href="/" style={{ color: '#2a4fa8' }}>На головну</a>
          </p>
        </main>
      </body>
    </html>
  )
}
