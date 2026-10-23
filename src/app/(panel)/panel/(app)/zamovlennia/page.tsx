import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { ORDER_STATUS_TONE, orderStatusLabel, orderStatusOptions } from '@/components/panel/lib/labels'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { uah } from '@/lib/shop'
import { db } from '@/server/db'
import { listOrders } from '@/server/services/orders'
import { DELIVERY_METHOD_LABEL, type OrderStatus } from '@/shared/options'

export const metadata = { title: 'Замовлення' }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { rows, hasMore, next } = await listOrders(db, {
    status: sp.status as OrderStatus | 'open' | undefined,
    q: sp.q,
    before: sp.before ? Number(sp.before) : undefined,
  })
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  if (next) more.set('before', String(next))
  return (
    <div className="space-y-5">
      <PageHeader title={t('orders.title')} description={t('orders.description')} actions={<RefreshButton />} />
      <UrlFilters
        filters={[
          { kind: 'search', name: 'q', label: t('orders.search') },
          { kind: 'choice', name: 'status', label: t('orders.status'), allLabel: t('orders.all'), options: [{ value: 'open', label: t('orders.open') }, ...orderStatusOptions] },
        ]}
      />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((o) => (
            <Link key={o.id} href={`/panel/zamovlennia/${o.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  №{o.id} · {o.studio.name} · {t('orders.items', { count: o.lines.length })} · {uah(o.subtotalKop)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[o.buyerName, DELIVERY_METHOD_LABEL[o.deliveryMethod], o.deliveryCity].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusBadge label={orderStatusLabel(o.status)} tone={ORDER_STATUS_TONE[o.status]} />
                <time className="w-24 text-right text-xs text-muted-foreground tabular-nums" dateTime={o.createdAt}>
                  {formatRelative(o.createdAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('orders.empty')} />
      )}
      {hasMore && (
        <Link href={`/panel/zamovlennia?${more}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
