import type { ItemState } from '@/lib/shop'
import type { ItemCategory } from '@/shared/options'

// What the shop's cards, cart and checkout pass around (server → client): a small, serialisable view of an item.
export type CardPhoto = { small: string; url: string; alt: string; width: number; height: number; focalY: number | null }

export type ShopItemCard = {
  id: number
  slug: string
  path: string
  title: string
  category: ItemCategory
  priceKop: number
  state: ItemState
  /** «2–4 тижні» for a made-to-order piece. */
  lead: string | null
  fulfillment: 'ship' | 'digital'
  orderable: boolean
  stock: number | null
  studio: { slug: string; name: string; city: string | null }
  photos: CardPhoto[]
}

export type CartLine = {
  itemId: number
  slug: string
  path: string
  title: string
  category: ItemCategory
  priceKop: number
  qty: number
  state: ItemState
  lead: string | null
  fulfillment: 'ship' | 'digital'
  studio: { slug: string; name: string; city: string | null }
  photo: CardPhoto | null
  options?: { recipient?: string; message?: string }
}

/** A cart grouped by studio: each group becomes one order (each studio ships its own parcel). */
export type CartGroup = { studio: CartLine['studio']; lines: CartLine[]; subtotalKop: number }
