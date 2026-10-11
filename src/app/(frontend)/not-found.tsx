import Link from 'next/link'
import React from 'react'

import { container } from '@/components/site/Bits'

export default function NotFound() {
  return (
    <main className={`${container} grid max-w-[760px] gap-5 pt-16 pb-24`}>
      <span className="kicker">Помилка 404</span>
      <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Такої сторінки немає</h1>
      <p className="m-0 text-lg text-umber">Можливо, адреса змінилась або студія більше не в каталозі. Почніть з одного з розділів:</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {[
          ['Майстер-класи', '/maister-klasy'],
          ['Для бізнесу', '/dlya-biznesu'],
          ['Виробники', '/vyrobnyky'],
          ['Мапа студій', '/mapa'],
          ['Ціни 2026', '/tsiny-2026'],
        ].map(([l, h]) => (
          <li key={h}>
            <Link href={h} className="inline-flex rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink no-underline hover:bg-sand">
              {l}
            </Link>
          </li>
        ))}
      </ul>
      <p className="m-0">
        <Link href="/">На головну →</Link>
      </p>
    </main>
  )
}
