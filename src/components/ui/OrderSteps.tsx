import React from 'react'

import { orderCopy } from '@/content/shop'
import { ORDER_STEPS } from '@/lib/shop'
import type { OrderStatus } from '@/shared/options'

import { Note } from './Note'

// The buyer's view of an order's state (DESIGN.md §2 OrderSteps): dots on a hairline, passed in ink, the current one
// cobalt, the rest hollow; a cancelled order shows a Note instead of steps.
export function OrderSteps({ status, dates, cancelled }: { status: OrderStatus; dates?: Partial<Record<OrderStatus, string>>; cancelled?: { at: string; reason?: string | null } }) {
  if (status === 'cancelled') {
    return (
      <Note>
        Скасовано {cancelled?.at ?? ''}.{cancelled?.reason ? ` Причина: ${cancelled.reason}.` : ''}
      </Note>
    )
  }
  const at = ORDER_STEPS.indexOf(status)
  return (
    <ol className="ui-steps" aria-label="Стан замовлення">
      {ORDER_STEPS.map((s, i) => (
        <li key={s} data-state={i < at ? 'done' : i === at ? 'current' : 'next'} aria-current={i === at ? 'step' : undefined}>
          <span className="ui-steps-n">{orderCopy.steps[s]}</span>
          {dates?.[s] && <span className="ui-steps-d">{dates[s]}</span>}
        </li>
      ))}
    </ol>
  )
}
