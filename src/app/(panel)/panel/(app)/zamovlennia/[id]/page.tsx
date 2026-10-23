import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { ORDER_STATUS_TONE, orderStatusLabel } from '@/components/panel/lib/labels'
import { EntityHistory } from '@/components/panel/screens/history'
import { OrderNotes, OrderStatusPicker } from '@/components/panel/screens/order-actions'
import { Card, CardContent } from '@/components/panel/ui/card'
import { uah } from '@/lib/shop'
import { db } from '@/server/db'
import { getOrder } from '@/server/services/orders'
import { DELIVERY_METHOD_LABEL, PAYMENT_METHOD_LABEL } from '@/shared/options'

export const metadata = { title: 'Замовлення' }

const Row = ({ label, children }: { label: string; children: ReactNode }) =>
  children == null || children === '' || children === false ? null : (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-line">{children}</dd>
    </div>
  )

const link = 'inline-flex min-h-11 items-center text-primary hover:underline sm:min-h-0'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const o = Number.isInteger(id) ? await getOrder(db, id) : null
  if (!o) notFound()
  const paymentLabel = t(o.paymentStatus === 'paid' ? 'orders.paymentPaid' : o.paymentStatus === 'refunded' ? 'orders.paymentRefunded' : 'orders.paymentUnpaid')
  return (
    <div className="space-y-5">
      <Link href="/panel/zamovlennia" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t('nav.orders')}
      </Link>
      <PageHeader title={t('orders.detail', { id: o.id })} description={o.studio.name} actions={<StatusBadge label={orderStatusLabel(o.status)} tone={ORDER_STATUS_TONE[o.status]} />} />
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <OrderStatusPicker id={o.id} status={o.status} />
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <dl className="divide-y">
            <Row label={t('orders.buyer')}>
              {o.buyerName}
              <span className="block">{o.buyerPhone}</span>
              {o.buyerEmail && <span className="block">{o.buyerEmail}</span>}
              {o.noCall && <span className="block text-muted-foreground">{t('orders.noCall')}</span>}
              <span className="mt-1 flex gap-3">
                <a className={link} href={`tel:${o.buyerPhone}`}>{t('orders.call')}</a>
                {o.buyerEmail && <a className={link} href={`mailto:${o.buyerEmail}`}>Email</a>}
              </span>
            </Row>
            <Row label={t('orders.delivery')}>
              {[DELIVERY_METHOD_LABEL[o.deliveryMethod], o.deliveryCity, o.deliveryPoint].filter(Boolean).join(' · ')}
              <span className="block text-muted-foreground">{o.deliveryKop != null ? uah(o.deliveryKop) : t('orders.carrierTariff')}</span>
            </Row>
            <Row label={t('orders.payment')}>{`${PAYMENT_METHOD_LABEL[o.paymentMethod]} · ${paymentLabel}`}</Row>
            <Row label={t('orders.comment')}>{o.comment}</Row>
            <Row label={t('orders.cancelReasonRow')}>{o.cancelReason}</Row>
            <Row label={t('orders.total')}>{uah(o.subtotalKop)}</Row>
            <Row label={t('orders.commission')}>{o.commissionKop != null ? uah(o.commissionKop) : null}</Row>
            <Row label={t('orders.created')}>{formatDateTime(o.createdAt)}</Row>
          </dl>
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('orders.lines')}</h2>
          <ul className="divide-y">
            {o.lines.map((l) => (
              <li key={l.id} className="space-y-0.5 py-2 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    {l.itemPath ? (
                      <a className="text-primary hover:underline" href={l.itemPath} target="_blank" rel="noopener">{l.title}</a>
                    ) : (
                      l.title
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">{l.qty} × {uah(l.unitKop)} = {uah(l.qty * l.unitKop)}</span>
                </div>
                {l.options?.recipient && <p className="text-xs text-muted-foreground">{t('orders.recipient')}: {l.options.recipient}</p>}
                {l.options?.message && <p className="text-xs text-muted-foreground">{t('orders.message')}: {l.options.message}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <OrderNotes id={o.id} tracking={o.tracking} studioNote={o.studioNote} paymentStatus={o.paymentStatus} deliveryKop={o.deliveryKop} />
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('orders.history')}</h2>
          <EntityHistory entity="order" id={o.id} />
        </CardContent>
      </Card>
    </div>
  )
}
