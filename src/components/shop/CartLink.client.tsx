'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { buttons } from '@/content/shop'
import { cartCount, useCart } from '@/shop/cart'

// The cart in the site header (DESIGN.md §2 CartLink): nothing at all while the cart is empty (the header stays the same
// on every page, and the one header row keeps fitting at 1280px), then a mono «Кошик N» from 65rem and a 44px basket
// with the count below it.
export function CartLink() {
  const lines = useCart()
  const pathname = usePathname()
  const n = cartCount(lines)
  const inShop = pathname?.startsWith('/kramnytsia')
  if (!n) return null
  return (
    <>
      <Link href="/kramnytsia/koshyk" className="nav-sec hidden min-[65rem]:inline-flex" aria-label={`${buttons.cart}, ${n}`}>
        {buttons.cart}
        <b className="ml-[5px] font-medium text-terracotta-text">{n}</b>
      </Link>
      {n > 0 && (
        <Link href="/kramnytsia/koshyk" className="ui-cartbtn min-[65rem]:hidden" aria-label={`${buttons.cart}, ${n}`} data-in-shop={inShop ? '' : undefined}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 7h18l-1.5 11a2 2 0 0 1-2 1.7h-11a2 2 0 0 1-2-1.7Z" />
            <path d="M8 7V6a4 4 0 0 1 8 0v1" />
          </svg>
          <span className="ui-cartbtn-n">{n}</span>
        </Link>
      )}
      <span className="sr-only" aria-live="polite">
        {n ? `У кошику ${n}` : ''}
      </span>
    </>
  )
}
