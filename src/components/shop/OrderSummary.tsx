import React from 'react'

import { Kicker } from '@/components/ui/Kicker'
import { cartCopy } from '@/content/shop'
import { pluralUk } from '@/lib/plural'
import { uah } from '@/lib/shop'
import type { CartGroup } from '@/shop/types'

// The order's figures (DESIGN.md §2 OrderSummary): a line per studio, the total for the goods, the delivery said in
// words. Pure markup: the cart and the checkout render it on the client, `collapsed` turns it into a details on phones.
export function OrderSummary({ groups, cta, note, collapsed, children }: { groups: CartGroup[]; cta?: React.ReactNode; note?: React.ReactNode; collapsed?: boolean; children?: React.ReactNode }) {
  const total = groups.reduce((n, g) => n + g.subtotalKop, 0)
  const count = groups.reduce((n, g) => n + g.lines.reduce((m, l) => m + l.qty, 0), 0)
  const body = (
    <div className="grid gap-2.5">
      {groups.map((g) => (
        <div key={g.studio.slug} className="grid gap-0.5">
          <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
            <span>
              {g.studio.name} · {g.lines.length} {pluralUk(g.lines.length, ['виріб', 'вироби', 'виробів'])}
            </span>
            <span className="font-display font-semibold whitespace-nowrap text-cobalt tabular-nums">{uah(g.subtotalKop)}</span>
          </div>
          <span className="text-[13px] leading-[1.4] text-ink-2">{cartCopy.perStudio}</span>
        </div>
      ))}
      {children}
      <dl className="m-0 mt-1 flex items-baseline justify-between gap-3 border-t border-rule pt-3">
        <dt className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">{cartCopy.total}</dt>
        <dd className="m-0 font-display text-[20px] leading-none font-semibold whitespace-nowrap tabular-nums">{uah(total)}</dd>
      </dl>
      {cta}
      {note && <p className="m-0 text-[12.5px] leading-[1.4] text-ink-2">{note}</p>}
    </div>
  )
  if (collapsed)
    return (
      <details id="order-summary" className="ui-summary border-t-2 border-ink">
        <summary className="grid min-h-12 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2 text-[15px]">
          <span>
            {cartCopy.summary} · {count} {pluralUk(count, ['виріб', 'вироби', 'виробів'])}
          </span>
          <span className="font-display font-semibold text-cobalt tabular-nums">{uah(total)}</span>
          <span className="ui-faq-pm" aria-hidden />
        </summary>
        <div className="pt-2 pb-3">{body}</div>
      </details>
    )
  return (
    <aside id="order-summary" aria-label={cartCopy.summary} className="grid gap-2.5 border-t-2 border-ink pt-3">
      <Kicker>{cartCopy.summary}</Kicker>
      {body}
    </aside>
  )
}
