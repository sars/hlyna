// The shop's shared rules (server and client): what can be ordered, how a state and a price read, a studio's shop
// terms with their defaults, phone normalisation, the order's steps. No data access here (docs/shop/PLAN.md).
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type DeliveryMethod,
  type OrderStatus,
  type PaymentMethod,
  type ShopTerms,
} from '@/shared/options'

/** The public offer the buyer agrees to; bump when its text changes (stored on every order). */
export const OFFER_VERSION = '2026-10-24'
/** The buyer may return a piece from stock within this many days of receiving it (ЗУ «Про захист прав споживачів», ст. 13). */
export const RETURN_DAYS = 14
export const SHOP_PATH = '/kramnytsia'
/** Segments under /kramnytsia that are pages of their own, never a studio or category slug. */
export const SHOP_RESERVED = new Set(['koshyk', 'oformlennia', 'zamovlennia', 'feed.xml'])

export const itemPath = (studioSlug: string, itemSlug: string) => `${SHOP_PATH}/${studioSlug}/${itemSlug}`

// ---------- money
const NBSP = ' '
/** 125000 → «1 250 грн» (thin space before thousands, no kopecks unless they are there). */
export function uah(kop: number): string {
  const whole = Math.trunc(kop / 100)
  const rest = Math.abs(kop % 100)
  const int = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${whole < 0 ? '−' : ''}${int}${rest ? `,${String(rest).padStart(2, '0')}` : ''}${NBSP}грн`
}

// ---------- item state
export type ItemLike = {
  kind: 'piece' | 'series' | 'to_order'
  availability: 'in_stock' | 'to_order' | 'unknown' | 'sold'
  visibility: 'public' | 'hidden'
  sourceGone: boolean
  priceMin: number | null
  leadDaysMin?: number | null
  leadDaysMax?: number | null
  stock?: number | null
}
export type StudioLike = { visibility: string; status: string | null; consentRequests: boolean | null }

/** «2–4 тижні» / «5–10 днів» from a day range; null without one. */
export function leadText(min?: number | null, max?: number | null): string | null {
  const a = min ?? max
  const b = max ?? min
  if (a == null || b == null) return null
  if (b >= 14) {
    const w = (d: number) => Math.max(1, Math.round(d / 7))
    const [x, y] = [w(a), w(b)]
    const word = y === 1 ? 'тиждень' : y < 5 ? 'тижні' : 'тижнів'
    return x === y ? `${x} ${word}` : `${x}–${y} ${word}`
  }
  const word = b === 1 ? 'день' : b < 5 ? 'дні' : 'днів'
  return a === b ? `${a} ${word}` : `${a}–${b} ${word}`
}

export type ItemState = 'in_stock' | 'piece' | 'to_order' | 'unknown' | 'reserved' | 'sold'
/**
 * The one state an item page and card show; the words for it are the design's (src/content/shop.ts).
 * «reserved»: the studio's stock of it is at zero after an order that is not yet closed (a one-off waits for its buyer).
 */
export function itemState(i: Pick<ItemLike, 'kind' | 'availability' | 'sourceGone' | 'stock'>): ItemState {
  if (i.availability === 'sold' || i.sourceGone) return 'sold'
  if (i.stock != null && i.stock <= 0) return 'reserved'
  if (i.kind === 'to_order' || i.availability === 'to_order') return 'to_order'
  if (i.availability === 'unknown') return 'unknown'
  return i.kind === 'piece' ? 'piece' : 'in_stock'
}

/** Whether a buyer may put the item in the cart: a partner's public item with a price that is not sold or gone. */
export function canOrder(i: ItemLike, s: StudioLike): boolean {
  if (!s.consentRequests || s.visibility !== 'public' || s.status !== 'active') return false
  if (i.visibility !== 'public' || i.sourceGone) return false
  if (i.availability === 'sold') return false
  if (i.stock != null && i.stock <= 0) return false
  return i.priceMin != null && i.priceMin > 0
}

/** schema.org availability for Google (no MadeToOrder: Google does not list it; research/seo-llm.md). */
export function ldAvailability(state: ItemState, stock?: number | null): string {
  if (state === 'sold') return 'https://schema.org/SoldOut'
  if (state === 'reserved') return 'https://schema.org/OutOfStock'
  if (state === 'to_order') return 'https://schema.org/PreOrder'
  if (state === 'piece' || (stock != null && stock === 1)) return 'https://schema.org/LimitedAvailability'
  if (state === 'unknown') return 'https://schema.org/InStock'
  return 'https://schema.org/InStock'
}

// ---------- a studio's shop terms
export type EffectiveTerms = {
  delivery: Exclude<DeliveryMethod, 'none'>[]
  payment: Exclude<PaymentMethod, 'card_online'>[]
  pickupAddress: string | null
  deliveryNote: string
  returnsNote: string
}
export const DEFAULT_DELIVERY_NOTE = 'Доставка за тарифами перевізника, оплачується при отриманні. Кераміку пакують як крихке.'
export const DEFAULT_RETURNS_NOTE = `Річ із наявності можна повернути протягом ${RETURN_DAYS} днів після отримання, якщо нею не користувалися. Виріб, зроблений під замовлення, поверненню не підлягає.`

/** The terms a studio offers, with the defaults filled in; `address` is the profile address for a pickup. */
export function effectiveTerms(t: ShopTerms | null | undefined, address: string | null | undefined): EffectiveTerms {
  const pickupAddress = t?.pickupAddress?.trim() || address?.trim() || null
  const delivery = t?.delivery?.length ? t.delivery : (['np_branch', 'np_postomat', 'np_courier', ...(pickupAddress ? (['pickup'] as const) : [])] as Exclude<DeliveryMethod, 'none'>[])
  return {
    delivery: delivery.filter((d) => d !== 'pickup' || pickupAddress),
    payment: t?.payment?.length ? t.payment : ['transfer', 'on_delivery'],
    pickupAddress,
    deliveryNote: t?.deliveryNote?.trim() || DEFAULT_DELIVERY_NOTE,
    returnsNote: t?.returnsNote?.trim() || DEFAULT_RETURNS_NOTE,
  }
}

export const deliveryLabel = (m: DeliveryMethod) => DELIVERY_METHOD_LABEL[m]
/** «Нова пошта (відділення, поштомат, кур’єр), Укрпошта · за тарифами перевізника; самовивіз» — the ways in one line. */
export function deliverySummary(ways: DeliveryMethod[], pickup: string | null = null): string {
  const np = ways.filter((w) => w.startsWith('np_')).map((w) => ({ np_branch: 'відділення', np_postomat: 'поштомат', np_courier: 'кур’єр' })[w as 'np_branch' | 'np_postomat' | 'np_courier'])
  const parts = [...(np.length ? [`Нова пошта (${np.join(', ')})`] : []), ...(ways.includes('ukrposhta') ? ['Укрпошта'] : [])]
  const carrier = parts.length ? `${parts.join(', ')} · за тарифами перевізника` : ''
  const pick = ways.includes('pickup') || pickup ? 'самовивіз' : ''
  return [carrier, pick].filter(Boolean).join('; ')
}
export const paymentLabel = (m: PaymentMethod) => PAYMENT_METHOD_LABEL[m]
/** What a payment way means for the buyer, in one line (checkout and the order page). */
export const PAYMENT_HINT: Record<PaymentMethod, string> = {
  transfer: 'Студія підтвердить замовлення й надішле реквізити для оплати карткою або на рахунок.',
  on_delivery: 'Оплата при отриманні у відділенні. Комісію за післяплату бере перевізник (Нова пошта: 2 % + 20 грн).',
  card_online: 'Оплата карткою на сайті.',
}

// ---------- phone
/** «067 123 45 67», «+38 (067) 123-45-67», «380671234567» → «+380671234567»; null when it is not a Ukrainian mobile or city number. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  const n = digits.startsWith('380') ? digits : digits.startsWith('80') && digits.length === 11 ? `3${digits}` : digits.startsWith('0') ? `38${digits}` : null
  return n && n.length === 12 ? `+${n}` : null
}

// ---------- order steps
/** The steps a buyer sees; «cancelled» stands apart. */
export const ORDER_STEPS = ORDER_STATUS.filter((s): s is Exclude<OrderStatus, 'cancelled'> => s !== 'cancelled')
export const orderStatusLabel = (s: OrderStatus) => ORDER_STATUS_LABEL[s]
/** Which statuses a studio may move an order to from the current one (staff may set any). */
export function nextStatuses(cur: OrderStatus): OrderStatus[] {
  switch (cur) {
    case 'new':
      return ['confirmed', 'in_progress', 'shipped', 'cancelled']
    case 'confirmed':
      return ['in_progress', 'shipped', 'done', 'cancelled']
    case 'in_progress':
      return ['shipped', 'done', 'cancelled']
    case 'shipped':
      return ['done', 'cancelled']
    case 'done':
      return []
    case 'cancelled':
      return ['new']
  }
}
