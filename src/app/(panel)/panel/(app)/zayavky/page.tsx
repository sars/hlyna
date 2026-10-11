import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { listClaims } from '@/server/services/claims'

export const metadata = { title: 'Заявки на профіль' }

const TONE = { pending: 'warn', approved: 'good', rejected: 'bad' } as const
const LABEL = { pending: 'claims.statusPending', approved: 'claims.approved', rejected: 'claims.rejected' } as const

export default async function ClaimsPage() {
  const rows = await listClaims(db)
  return (
    <div className="space-y-5">
      <PageHeader title={t('claims.title')} description={t('claims.description')} actions={<RefreshButton />} />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((c) => (
            <Link key={c.id} href={`/panel/zayavky/${c.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  #{c.id} · {c.studios.join(', ') || '—'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {c.name} · {c.contact}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusBadge label={t(LABEL[c.status])} tone={TONE[c.status]} />
                <time className="w-24 text-right text-xs text-muted-foreground" dateTime={c.createdAt}>
                  {formatRelative(c.createdAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('claims.empty')} />
      )}
    </div>
  )
}
