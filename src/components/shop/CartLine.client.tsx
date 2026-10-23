'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { QtyStepper } from '@/components/ui/QtyStepper.client'
import { buttons, stateText } from '@/content/shop'
import { uah } from '@/lib/shop'
import { MAX_QTY } from '@/shop/cart'
import type { CartLine as Line } from '@/shop/types'

// A line of the cart or of an order (DESIGN.md §2 CartLine): photo, name, state or «950 грн × 2», the stepper and
// «Прибрати»; `readOnly` on the order page.
export function CartLine({ line, onQty, onRemove, readOnly, max = MAX_QTY }: { line: Line; onQty?: (qty: number) => void; onRemove?: () => void; readOnly?: boolean; max?: number }) {
  const state = stateText(line.state, 'cart', line.lead)
  const meta = [state, line.qty > 1 ? `${uah(line.priceKop)} × ${line.qty}` : ''].filter(Boolean).join(' · ')
  return (
    <li className="ui-cartline" data-readonly={readOnly ? '' : undefined}>
      <Link href={line.path} className="ui-cartline-ph" aria-hidden tabIndex={-1}>
        {line.photo && <Image src={line.photo.small} alt="" fill sizes="72px" />}
      </Link>
      <div className="grid min-w-0 content-start gap-0.5">
        <Link href={line.path} className="ui-name font-display text-[15.5px] leading-[1.2] font-semibold text-ink no-underline hover:text-cobalt">
          {line.title}
        </Link>
        {meta && <span className="font-mono text-[11.5px] tracking-[.04em] text-ink-2 uppercase">{meta}</span>}
        {line.options?.recipient && <span className="text-[13px] text-ink-2">Для: {line.options.recipient}</span>}
        {!readOnly && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            {line.state !== 'piece' && onQty && <QtyStepper value={line.qty} max={max} onChange={onQty} size="sm" />}
            {onRemove && (
              <button type="button" onClick={onRemove} className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase underline underline-offset-[3px] hover:text-terracotta-text">
                {buttons.remove}
              </button>
            )}
          </div>
        )}
      </div>
      <span className="ui-cartline-sum font-display text-base leading-none font-semibold text-cobalt tabular-nums">{uah(line.priceKop * line.qty)}</span>
    </li>
  )
}
