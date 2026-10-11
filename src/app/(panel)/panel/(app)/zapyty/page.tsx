import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { STATUS_TONE, statusLabel, statusOptions, whatLabel, whatOptions } from '@/components/panel/lib/labels'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { listRequests } from '@/server/services/requests'
import type { RequestStatus, RequestWhat } from '@/shared/options'

export const metadata = { title: 'Запити' }

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { rows, hasMore, next } = await listRequests(db, {
    status: sp.status as RequestStatus | 'open' | undefined,
    what: sp.what as RequestWhat | undefined,
    q: sp.q,
    before: sp.before ? Number(sp.before) : undefined,
  })
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  if (next) more.set('before', String(next))
  return (
    <div className="space-y-5">
      <PageHeader title={t('requests.title')} description={t('requests.description')} actions={<RefreshButton />} />
      <UrlFilters
        filters={[
          { kind: 'search', name: 'q', label: t('requests.search') },
          { kind: 'choice', name: 'status', label: t('requests.status'), allLabel: t('requests.all'), options: [{ value: 'open', label: t('requests.open') }, ...statusOptions] },
          { kind: 'choice', name: 'what', label: t('requests.what'), allLabel: t('requests.all'), options: whatOptions },
        ]}
      />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((r) => (
            <Link key={r.id} href={`/panel/zapyty/${r.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium" title={r.details ?? undefined}>
                  #{r.id} · {whatLabel(r.what)}
                  {r.quantity ? ` · ${r.quantity}` : ''}
                  {r.city ? ` · ${r.city}` : ''}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {r.what === 'studio' ? r.studioName : r.contactName}
                  {r.details ? ` — ${r.details}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {r.sentTo > 0 && <span className="text-xs text-muted-foreground">{t('requests.sentTo', { count: r.sentTo })}</span>}
                <StatusBadge label={statusLabel(r.status)} tone={STATUS_TONE[r.status]} />
                <time className="w-24 text-right text-xs text-muted-foreground tabular-nums" dateTime={r.createdAt}>
                  {formatRelative(r.createdAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('requests.empty')} />
      )}
      {hasMore && (
        <Link href={`/panel/zapyty?${more}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
