import type { Metadata } from 'next'
import React from 'react'

import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Kicker } from '@/components/ui/Kicker'
import { MoreLink } from '@/components/ui/MoreLink'
import { cx, wrap } from '@/components/ui/layout'

export const metadata: Metadata = { title: 'Сторінку не знайдено', robots: { index: false } }

export default function NotFound() {
  return (
    <main className={cx(wrap, 'pt-16')}>
      <div className="grid max-w-narrow gap-5">
        <Kicker>Помилка 404</Kicker>
        <h1 className="m-0 font-display text-h1">Такої сторінки немає</h1>
        <p className="m-0 text-lead text-ink-2">Можливо, адреса змінилась або студія більше не в каталозі. Почніть з одного з розділів:</p>
        <ChipGroup as="nav" aria-label="Розділи сайту">
          {[
            ['Майстер-класи', '/maister-klasy'],
            ['Для бізнесу', '/dlya-biznesu'],
            ['Виробники', '/vyrobnyky'],
            ['Мапа студій', '/mapa'],
            ['Ціни 2026', '/tsiny-2026'],
          ].map(([l, h]) => (
            <Chip key={h} href={h}>
              {l}
            </Chip>
          ))}
        </ChipGroup>
        <div>
          <MoreLink href="/">
            На головну
          </MoreLink>
        </div>
      </div>
    </main>
  )
}
