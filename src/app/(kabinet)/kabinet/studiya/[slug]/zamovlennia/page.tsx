import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { formatWhen, plural } from '@/components/kabinet/format'
import { StudioFrame } from '@/components/kabinet/StudioFrame.client'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { Note } from '@/components/ui/Note'
import { StatusTag } from '@/components/ui/StatusTag'
import { kabinetOrders } from '@/lib/kabinetData'
import { deliveryLabel, orderStatusLabel, uah } from '@/lib/shop'
import type { SectionState } from '@/shared/kabinet'
import type { OrderStatus } from '@/shared/options'

export const metadata: Metadata = { title: 'Замовлення' }

// new → cobalt dot, in progress → ink, closed → muted
const TAG: Record<OrderStatus, SectionState> = { new: 'review', confirmed: 'live', in_progress: 'live', shipped: 'live', done: 'missing', cancelled: 'missing' }

const chip = 'inline-flex min-h-8 items-center border px-3 font-mono text-[12px] tracking-[.04em] no-underline'

export default async function StudioOrders({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ vsi?: string }> }) {
  const { slug } = await params
  const all = (await searchParams).vsi === '1'
  const page = await kabinetOrders(slug, all)
  if (page === 'login') redirect('/kabinet/vhid')
  if (!page) notFound()
  const { studio, rows, hasMore } = page
  const base = `/kabinet/studiya/${slug}/zamovlennia`
  return (
    <main className={cx(wrap, 'flex flex-1 flex-col pt-hero pb-section')}>
      <StudioFrame key="zamovlennia" initial={studio} mode="section" current="zamovlennia">
        <div className="mb-[18px] lg:hidden">
          <Link href={`/kabinet/studiya/${slug}`} className="kb-back">
            ← {studio.name} · усі розділи
          </Link>
        </div>
        <header className="mb-[18px] grid gap-2">
          <Kicker>Замовлення</Kicker>
          <h1 className="m-0 font-display text-[clamp(22px,2.4vw,30px)] leading-[1.12] font-semibold">
            {rows.length} {all ? plural(rows.length, 'замовлення', 'замовлення', 'замовлень') : plural(rows.length, 'відкрите замовлення', 'відкриті замовлення', 'відкритих замовлень')}
          </h1>
          <nav aria-label="Фільтр" className="flex gap-2 pt-1">
            <Link href={base} aria-current={all ? undefined : 'page'} className={cx(chip, all ? 'border-rule text-ink-2 hover:text-cobalt' : 'border-ink bg-ink text-paper')}>
              Відкриті
            </Link>
            <Link href={`${base}?vsi=1`} aria-current={all ? 'page' : undefined} className={cx(chip, all ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:text-cobalt')}>
              Усі
            </Link>
          </nav>
        </header>
        {rows.length === 0 ? (
          <Note>Замовлень ще не було. Коли хтось купить виріб у крамниці, він з’явиться тут і прийде в Telegram, якщо його підключено.</Note>
        ) : (
          <ul className="m-0 grid list-none border-t-2 border-ink p-0">
            {rows.map((o) => {
              const n = o.lines.reduce((a, l) => a + l.qty, 0)
              return (
                <li key={o.id}>
                  <Link href={`${base}/${o.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 border-b border-rule py-3 text-ink no-underline hover:text-cobalt">
                    <span className="font-display text-[15.5px] leading-[1.2] font-semibold [overflow-wrap:anywhere]">
                      №{o.id} · {o.buyerName}
                    </span>
                    <StatusTag state={TAG[o.status]}>{orderStatusLabel(o.status)}</StatusTag>
                    <span className="col-span-2 font-mono text-[11.5px] leading-[1.4] text-ink-2">
                      {n} {plural(n, 'виріб', 'вироби', 'виробів')} · {uah(o.subtotalKop)} · {deliveryLabel(o.deliveryMethod)} · {formatWhen(o.createdAt)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {hasMore && <p className="mt-4 text-[14px] text-ink-2">Показано останні {rows.length}.</p>}
      </StudioFrame>
    </main>
  )
}
