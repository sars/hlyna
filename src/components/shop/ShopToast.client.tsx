'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'
import { buttons } from '@/content/shop'
import { pluralUk } from '@/lib/plural'
import { cart } from '@/shop/cart'
import type { CartLine } from '@/shop/types'

// «Додано в кошик» / «Прибрано» (DESIGN.md §2 ShopToast): a fixed, non-blocking note with the item, two ways on, and a
// 6 s timer that pauses on hover or focus. One host per page (`ShopToastHost`); anything can call `showToast`.
export type ToastDetail = { kind: 'added' | 'removed'; line: CartLine; count: number }
const EVENT = 'hl:toast'
export const showToast = (d: ToastDetail) => window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail: d }))

export function ShopToastHost() {
  const [toast, setToast] = useState<ToastDetail | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arm = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 6000)
  }
  useEffect(() => {
    const on = (e: Event) => {
      setToast((e as CustomEvent<ToastDetail>).detail)
      arm()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setToast(null)
    window.addEventListener(EVENT, on)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(EVENT, on)
      document.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  if (!toast) return null
  const { kind, line, count } = toast
  const pause = () => timer.current && clearTimeout(timer.current)
  return (
    <div role="status" aria-live="polite" className="ui-toast" onMouseEnter={pause} onMouseLeave={arm} onFocus={pause} onBlur={arm}>
      <span className="ui-toast-ph">{line.photo && <Image src={line.photo.small} alt="" fill sizes="56px" />}</span>
      <div className="grid min-w-0 gap-0.5">
        <Kicker>{kind === 'added' ? `Додано в кошик · ${count} ${pluralUk(count, ['виріб', 'вироби', 'виробів'])}` : 'Прибрано'}</Kicker>
        <b className="font-display text-[15px] leading-[1.2] font-semibold break-words">{line.title}</b>
        <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2">
          {kind === 'added' ? (
            <Button href="/kramnytsia/oformlennia" variant="cobalt" size="sm" arrow>
              {buttons.checkout}
            </Button>
          ) : (
            <Button
              variant="ink"
              size="sm"
              onClick={() => {
                cart.restore(line)
                setToast(null)
              }}
            >
              {buttons.undo}
            </Button>
          )}
          {kind === 'added' ? (
            <button type="button" className="font-mono text-[11.5px] tracking-[.06em] text-ink uppercase underline underline-offset-[3px]" onClick={() => setToast(null)}>
              {buttons.more}
            </button>
          ) : (
            <Link href="/kramnytsia/koshyk" className="font-mono text-[11.5px] tracking-[.06em] text-ink uppercase underline underline-offset-[3px]">
              {buttons.cart}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
