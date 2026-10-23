import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { formatWhen, plural } from '@/components/kabinet/format'
import { OrderActions } from '@/components/kabinet/OrderActions.client'
import { StudioFrame } from '@/components/kabinet/StudioFrame.client'
import { Facts } from '@/components/ui/Facts'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { kabinetOrder } from '@/lib/kabinetData'
import { deliveryLabel, PAYMENT_HINT, paymentLabel, uah } from '@/lib/shop'

export const metadata: Metadata = { title: 'Замовлення' }

export default async function StudioOrder({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  if (!/^\d{1,9}$/.test(id)) notFound()
  const page = await kabinetOrder(slug, Number(id))
  if (page === 'login') redirect('/kabinet/vhid')
  if (!page) notFound()
  const { studio, order: o } = page
  const tel = o.buyerPhone.replace(/[^\d+]/g, '')
  const delivery = [deliveryLabel(o.deliveryMethod), o.deliveryCity, o.deliveryPoint].filter(Boolean).join(', ')
  const rows: [string, React.ReactNode][] = [
    [
      'Телефон',
      <>
        <a href={`tel:${tel}`}>{o.buyerPhone}</a>
        {o.noCall && <> · просить написати, не телефонувати</>}
      </>,
    ],
  ]
  if (o.buyerEmail) rows.push(['Email', <a key="e" href={`mailto:${o.buyerEmail}`}>{o.buyerEmail}</a>])
  rows.push(['Доставка', delivery])
  rows.push([
    'Оплата',
    <>
      {paymentLabel(o.paymentMethod)}
      <span className="mt-0.5 block text-[14px] leading-[1.45] text-ink-2">{PAYMENT_HINT[o.paymentMethod]}</span>
    </>,
  ])
  if (o.comment) rows.push(['Коментар', o.comment])
  rows.push(['Сума за вироби', uah(o.subtotalKop)])
  const n = o.lines.reduce((a, l) => a + l.qty, 0)
  return (
    <main className={cx(wrap, 'flex flex-1 flex-col pt-hero pb-section')}>
      <StudioFrame key="zamovlennia" initial={studio} mode="section" current="zamovlennia">
        <div className="mb-[18px]">
          <Link href={`/kabinet/studiya/${slug}/zamovlennia`} className="kb-back">
            ← Усі замовлення
          </Link>
        </div>
        <header className="mb-[18px] grid gap-2">
          <Kicker>
            Замовлення №{o.id} · {formatWhen(o.createdAt)}
          </Kicker>
          <h1 className="m-0 font-display text-[clamp(22px,2.4vw,30px)] leading-[1.12] font-semibold [overflow-wrap:anywhere]">{o.buyerName}</h1>
        </header>
        <div className="grid gap-7">
          <Facts rows={rows} />
          <section aria-labelledby="sklad" className="grid gap-2">
            <h2 id="sklad" className="m-0 font-display text-[17px] leading-[1.2] font-semibold">
              Склад замовлення <span className="font-mono text-[12px] font-normal text-ink-2">· {n} {plural(n, 'виріб', 'вироби', 'виробів')}</span>
            </h2>
            <ul className="m-0 grid list-none border-t-2 border-ink p-0">
              {o.lines.map((l) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-rule py-3">
                  <span className="text-[15.5px] leading-[1.35] [overflow-wrap:anywhere]">{l.title}</span>
                  <span className="font-mono text-[13px] text-ink">{uah(l.unitKop * l.qty)}</span>
                  <span className="font-mono text-[11.5px] text-ink-2">
                    {l.qty} × {uah(l.unitKop)}
                  </span>
                  {(l.options?.recipient || l.options?.message) && (
                    <span className="col-span-2 text-[14px] leading-[1.4] text-ink-2">
                      {l.options.recipient && <>Для: {l.options.recipient}. </>}
                      {l.options.message && <>Текст: {l.options.message}</>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <OrderActions slug={slug} id={o.id} status={o.status} tracking={o.tracking ?? ''} studioNote={o.studioNote ?? ''} cancelReason={o.cancelReason} />
        </div>
      </StudioFrame>
    </main>
  )
}
