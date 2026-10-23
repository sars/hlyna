import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { CartLine } from '@/components/shop/CartLine.client'
import { TrackView } from '@/components/shop/TrackView.client'
import { Facts } from '@/components/ui/Facts'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { Note } from '@/components/ui/Note'
import { OrderSteps } from '@/components/ui/OrderSteps'
import { Updated } from '@/components/ui/Updated'
import { orderCopy } from '@/content/shop'
import { pluralUk } from '@/lib/catalog'
import { deliveryLabel, PAYMENT_HINT, paymentLabel, uah } from '@/lib/shop'
import { shopDate } from '@/lib/shopData'
import { db } from '@/server/db'
import { getCheckout, type OrderFull } from '@/server/services/orders'
import type { CartLine as Line } from '@/shop/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Замовлення', robots: { index: false, follow: false } }

type Args = { params: Promise<{ token: string }> }

const when = (iso: string) => new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: 'Europe/Kyiv' }).format(new Date(iso))
const lineOf = (o: OrderFull, l: OrderFull['lines'][number]): Line => ({
  itemId: l.itemId ?? l.id,
  slug: '',
  path: l.itemPath ?? '/kramnytsia',
  title: l.title,
  category: 'chashky',
  priceKop: l.unitKop,
  qty: l.qty,
  state: 'in_stock',
  lead: null,
  fulfillment: 'ship',
  studio: { slug: o.studio.slug, name: o.studio.name, city: o.studio.city },
  photo: l.photo ? { small: l.photo, url: l.photo, alt: l.title, width: 300, height: 375, focalY: null } : null,
  ...(l.options ? { options: l.options } : {}),
})

// The buyer's page of a checkout (docs/shop/DESIGN.md §1 Замовлення): one block per studio with its steps, facts and
// lines; the key is the token in the URL. Nothing here is indexed.
export default async function OrderRoute({ params }: Args) {
  const { token } = await params
  const orders = await getCheckout(db, token)
  if (!orders.length) notFound()
  const first = orders[0]!
  const fresh = orders.every((o) => o.status === 'new')
  const total = orders.reduce((n, o) => n + o.subtotalKop, 0)
  const gaItems = orders.flatMap((o) => o.lines.map((l) => ({ item_id: l.itemPath?.split('/').pop() ?? String(l.itemId), item_name: l.title, item_brand: o.studio.name, price: l.unitKop / 100, quantity: l.qty })))
  return (
    <main className={cx(wrap, 'pt-hero pb-section')}>
      <TrackView event="purchase" once={token} params={{ transaction_id: token, currency: 'UAH', value: total / 100, items: JSON.stringify(gaItems) }} />
      <div className="grid max-w-narrow gap-6">
        <header className="grid gap-3">
          <Kicker>
            {orders.length === 1 ? `Замовлення № ${first.id}` : `Замовлення № ${orders.map((o) => o.id).join(', № ')}`} · {shopDate(first.createdAt)}
          </Kicker>
          <h1 className="m-0 font-display text-h1">{fresh ? orderCopy.thanks : orders.length === 1 ? `Замовлення № ${first.id}` : 'Ваші замовлення'}</h1>
          <p className="m-0 text-lead">{orders.length === 1 ? orderCopy.lead(first.studio.name) : orderCopy.leadMany}</p>
        </header>
        {orders.map((o) => {
          const trackingUrl = o.tracking ? `https://tracking.novaposhta.ua/#/uk/${encodeURIComponent(o.tracking.replace(/\s/g, ''))}` : null
          const facts: [string, React.ReactNode][] = [
            [
              'Студія',
              <span key="s">
                <Link href={`/vyrobnyky/${o.studio.slug}`}>{o.studio.name}</Link>
                {o.studio.city ? `, ${o.studio.city}` : ''}
                {o.studio.phone ? ` · ${o.studio.phone}` : ''}
                {o.studio.instagram ? (
                  <>
                    {' · '}
                    <a href={o.studio.instagram} target="_blank" rel="noopener nofollow">
                      Instagram
                    </a>
                  </>
                ) : null}
              </span>,
            ],
            ['Доставка', `${deliveryLabel(o.deliveryMethod)}${o.deliveryCity ? `, ${o.deliveryCity}` : ''}${o.deliveryPoint ? `, ${o.deliveryPoint}` : ''}${o.deliveryKop != null ? ` · ${uah(o.deliveryKop)}` : o.deliveryMethod === 'pickup' || o.deliveryMethod === 'none' ? '' : ' · за тарифами перевізника'}`],
            ['Оплата', `${paymentLabel(o.paymentMethod)}${o.paymentStatus === 'paid' ? ' · оплачено' : o.paymentStatus === 'refunded' ? ' · повернено' : ''}. ${PAYMENT_HINT[o.paymentMethod]}`],
            ...(o.tracking ? ([['Накладна', <a key="t" href={trackingUrl!} target="_blank" rel="noopener nofollow">{o.tracking}</a>]] as [string, React.ReactNode][]) : []),
            ['Сума за вироби', uah(o.subtotalKop)],
            ['Отримувач', `${o.buyerName}, ${o.buyerPhone}${o.noCall ? ' (написати, не телефонувати)' : ''}`],
          ]
          return (
            <section key={o.id} aria-labelledby={`o-${o.id}`} className="grid gap-5 border-t-2 border-ink pt-4">
              {orders.length > 1 && (
                <h2 id={`o-${o.id}`} className="m-0 font-display text-[19px] leading-[1.2] font-semibold">
                  № {o.id} · {o.studio.name}
                </h2>
              )}
              <OrderSteps status={o.status} dates={{ new: when(o.createdAt), ...(o.status !== 'new' ? { [o.status]: when(o.updatedAt) } : {}) }} cancelled={o.status === 'cancelled' ? { at: when(o.updatedAt), reason: o.cancelReason } : undefined} />
              <Facts rows={facts} />
              <div>
                <Kicker as="p" className="m-0 border-b border-rule pb-2">
                  {orderCopy.lines} · {o.lines.length} {pluralUk(o.lines.length, ['виріб', 'вироби', 'виробів'])}
                </Kicker>
                <ul className="m-0 list-none p-0">
                  {o.lines.map((l) => (
                    <CartLine key={l.id} line={lineOf(o, l)} readOnly />
                  ))}
                </ul>
              </div>
            </section>
          )
        })}
        <Note>{orderCopy.note}</Note>
        <Updated label="Стан на" date={new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Kyiv' }).format(new Date()).replace(/\s*р\.\s*о\s*/, ' о ')} />
      </div>
    </main>
  )
}
