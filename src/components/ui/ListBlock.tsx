import React from 'react'

import { Kicker } from './Kicker'
import { MoreLink } from './MoreLink'

const item = 'py-1 text-[15px] leading-normal before:text-terracotta-text before:content-["—_"]'

// «Вироби / Послуги» of a profile: a mono title over a thin rule, dash list; the part over `limit` opens with a native `details`.
export function ListBlock({ title, items, limit = 12 }: { title: string; items: string[]; limit?: number }) {
  const head = items.slice(0, limit)
  const rest = items.slice(limit)
  return (
    <div className="grid content-start gap-1">
      <Kicker as="p" className="mb-1 border-b border-rule pb-1.5">
        {title}
      </Kicker>
      <ul className="m-0 list-none p-0">
        {head.map((t) => (
          <li key={t} className={item}>{t}</li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group">
          <MoreLink as="summary" pad={false} className="py-1.5 text-cobalt">
            <span className="group-open:hidden">Ще {rest.length}</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </MoreLink>
          <ul className="m-0 list-none p-0">
            {rest.map((t) => (
              <li key={t} className={item}>{t}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
