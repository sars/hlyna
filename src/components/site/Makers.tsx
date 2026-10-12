import React from 'react'

import { Block } from '@/components/site/Inner'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { MoreLink } from '@/components/ui/MoreLink'
import type { StudioCard } from '@/lib/catalog'

const COLLAPSE = 12

// A block of maker rows: the first dozen open, the rest behind «Показати ще». Wave B and C pages list studios with it.
export function Makers({ studios, title, id, note }: { studios: StudioCard[]; title: string; id: string; note?: string }) {
  if (!studios.length) return null
  const head = studios.slice(0, COLLAPSE)
  const tail = studios.slice(COLLAPSE)
  return (
    <Block id={id} title={title} note={note}>
      <div>
        <MakerRows>
          {head.map((s) => (
            <MakerRow key={s.id} s={s} />
          ))}
        </MakerRows>
        {tail.length > 0 && (
          <details className="group">
            <MoreLink as="summary">
              <span className="group-open:hidden">{`Показати ще ${tail.length} →`}</span>
              <span className="hidden group-open:inline">Згорнути</span>
            </MoreLink>
            <MakerRows>
              {tail.map((s) => (
                <MakerRow key={s.id} s={s} />
              ))}
            </MakerRows>
          </details>
        )}
      </div>
    </Block>
  )
}
