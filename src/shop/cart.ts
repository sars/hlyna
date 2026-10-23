// The cart lives in the browser (localStorage `hl:cart`); the server sees it only as a checkout. Components subscribe
// through `useCart` (the `hl:cart` window event keeps the header, the bar and the pages in step, across tabs via `storage`).
import { useSyncExternalStore } from 'react'

import type { CartGroup, CartLine, ShopItemCard } from './types'

const KEY = 'hl:cart'
const EVENT = 'hl:cart'
export const MAX_QTY = 10

const EMPTY: CartLine[] = []
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY }

function read(): CartLine[] {
  if (typeof window === 'undefined') return EMPTY
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return EMPTY
  }
  if (raw === cache.raw) return cache.lines
  let lines: CartLine[] = EMPTY
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    lines = Array.isArray(parsed) ? parsed.filter((l): l is CartLine => Boolean(l && typeof l === 'object' && typeof (l as CartLine).itemId === 'number' && (l as CartLine).qty > 0)) : EMPTY
  } catch {
    lines = EMPTY
  }
  cache = { raw, lines }
  return lines
}

function write(lines: CartLine[]) {
  try {
    if (lines.length) window.localStorage.setItem(KEY, JSON.stringify(lines))
    else window.localStorage.removeItem(KEY)
  } catch {
    // private mode or full storage: the page still works for this visit
  }
  cache = { raw: null, lines: EMPTY }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** The cart's lines; `[]` on the server and before hydration. */
export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY)

export const lineOf = (i: ShopItemCard, qty = 1, options?: CartLine['options']): CartLine => ({
  itemId: i.id,
  slug: i.slug,
  path: i.path,
  title: i.title,
  category: i.category,
  priceKop: i.priceKop,
  qty,
  state: i.state,
  lead: i.lead,
  fulfillment: i.fulfillment,
  studio: i.studio,
  photo: i.photos[0] ?? null,
  ...(options ? { options } : {}),
})

export const cart = {
  lines: read,
  /** Adds `qty` (capped at MAX_QTY per line); a one-off is always one. Returns the line as it now stands. */
  add(i: ShopItemCard, qty = 1, options?: CartLine['options']): CartLine {
    const lines = read()
    const cur = lines.find((l) => l.itemId === i.id)
    const max = i.state === 'piece' ? 1 : Math.min(MAX_QTY, i.stock ?? MAX_QTY)
    const next = cur ? { ...cur, ...lineOf(i, Math.min(max, cur.qty + qty), options ?? cur.options) } : lineOf(i, Math.min(max, qty), options)
    write(cur ? lines.map((l) => (l.itemId === i.id ? next : l)) : [...lines, next])
    return next
  },
  setQty(itemId: number, qty: number) {
    const lines = read()
    write(qty <= 0 ? lines.filter((l) => l.itemId !== itemId) : lines.map((l) => (l.itemId === itemId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)))
  },
  remove(itemId: number): CartLine | null {
    const lines = read()
    const gone = lines.find((l) => l.itemId === itemId) ?? null
    write(lines.filter((l) => l.itemId !== itemId))
    return gone
  },
  restore(line: CartLine) {
    const lines = read()
    if (lines.some((l) => l.itemId === line.itemId)) return
    write([...lines, line])
  },
  clear() {
    write([])
  },
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0)
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.priceKop * l.qty, 0)

/** Lines by studio, in the order the studios first appear. */
export function groupCart(lines: CartLine[]): CartGroup[] {
  const by = new Map<string, CartGroup>()
  for (const l of lines) {
    const g = by.get(l.studio.slug) ?? { studio: l.studio, lines: [], subtotalKop: 0 }
    g.lines.push(l)
    g.subtotalKop += l.priceKop * l.qty
    by.set(l.studio.slug, g)
  }
  return [...by.values()]
}

/** GA4 ecommerce items for a set of lines (no personal data). */
export const gaItems = (lines: Pick<CartLine, 'slug' | 'title' | 'studio' | 'category' | 'priceKop' | 'qty'>[]) =>
  lines.map((l) => ({ item_id: l.slug, item_name: l.title, item_brand: l.studio.name, item_category: l.category, price: l.priceKop / 100, quantity: l.qty }))
