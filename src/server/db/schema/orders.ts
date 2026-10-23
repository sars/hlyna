import { sql } from 'drizzle-orm'
import { bigint, boolean, index, integer, jsonb, serial, text, timestamp } from 'drizzle-orm/pg-core'

import { app, deliveryMethod, orderStatus, paymentMethod, paymentStatus, withTracking } from './base'
import { studios } from './catalog'
import { items } from './items'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

// A shop order: one per studio per checkout (docs/shop/PLAN.md). The studio handles it in /kabinet and gets it in
// Telegram; staff see every order in /panel; the buyer follows it at /kramnytsia/zamovlennia/<checkout token>.
// Money is in kopecks. Payment columns are ready for a provider (plata by mono split, LiqPay) but nothing is charged yet.
export const orders = app.table(
  'orders',
  {
    id: serial('id').primaryKey(),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'restrict' }),
    // One checkout of a cart with pieces from several studios makes several orders sharing this token; it is also the
    // buyer's key to the status page, so it is random and long.
    checkoutToken: text('checkout_token').notNull(),
    status: orderStatus('status').notNull().default('new'),
    buyerName: text('buyer_name').notNull(),
    // E.164 («+380671234567»); the studio calls or writes here.
    buyerPhone: text('buyer_phone').notNull(),
    buyerEmail: text('buyer_email'),
    // «Не телефонуйте — напишіть у месенджер».
    noCall: boolean('no_call').notNull().default(false),
    comment: text('comment'),
    deliveryMethod: deliveryMethod('delivery_method').notNull(),
    deliveryCity: text('delivery_city'),
    // Branch or postomat number, or the street address for a courier; the studio's address for a pickup.
    deliveryPoint: text('delivery_point'),
    // What the studio told the buyer about shipping cost (null = carrier tariff, paid on receipt).
    deliveryKop: bigint('delivery_kop', { mode: 'number' }),
    paymentMethod: paymentMethod('payment_method').notNull(),
    paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
    paymentProvider: text('payment_provider'),
    paymentRef: text('payment_ref'),
    paymentPayload: jsonb('payment_payload').$type<Record<string, unknown>>(),
    paidAt: ts('paid_at'),
    subtotalKop: bigint('subtotal_kop', { mode: 'number' }).notNull(),
    // The 10 % (site.model) on the goods, derived by Postgres; reports count it on «done» orders only.
    commissionKop: bigint('commission_kop', { mode: 'number' }).generatedAlwaysAs(sql`round(subtotal_kop * 10 / 100.0)::bigint`),
    // Carrier tracking number («ТТН») once shipped.
    tracking: text('tracking'),
    // The studio's own note on the order (seen by the studio and staff, never by the buyer).
    studioNote: text('studio_note'),
    // Why it was cancelled, in the studio's words (shown to the buyer).
    cancelReason: text('cancel_reason'),
    // When the buyer ticked the consent line, and the offer version they saw.
    consentAt: ts('consent_at').notNull().defaultNow(),
    offerVersion: text('offer_version').notNull(),
    sourcePage: text('source_page'),
    ipHash: text('ip_hash'),
    ...withTracking(),
  },
  (t) => [
    index('orders_studio_status_idx').on(t.studioId, t.status),
    index('orders_checkout_idx').on(t.checkoutToken),
    index('orders_created_idx').on(t.createdAt),
  ],
)

/** What a buyer adds for a certificate: who it is for and a short message. */
export type OrderItemOptions = { recipient?: string; message?: string }

// A line of an order: a snapshot of the item as sold (title, price), so a later edit of the item changes no order.
export const orderItems = app.table(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').references(() => items.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    // «/kramnytsia/<studio>/<item>» at the time of the order: the line stays a link while the page exists.
    itemPath: text('item_path'),
    unitKop: bigint('unit_kop', { mode: 'number' }).notNull(),
    qty: integer('qty').notNull().default(1),
    options: jsonb('options').$type<OrderItemOptions>(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)
