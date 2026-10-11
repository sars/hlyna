import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { cn } from '@/components/panel/lib/utils'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { listChangeSets } from '@/server/services/changeSets'

export const metadata = { title: 'Зміни від власників' }

const TONE: Record<string, 'warn' | 'good' | 'bad' | 'neutral'> = { pending: 'warn', applied: 'good', partially_applied: 'good', rejected: 'bad', superseded: 'neutral' }

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show === 'done' ? 'done' : 'pending'
  const rows = await listChangeSets(db, show)
  const tab = (key: 'pending' | 'done', label: string) => (
    <Link href={key === 'pending' ? '/panel/zminy' : '/panel/zminy?show=done'} aria-current={show === key ? 'page' : undefined} className={cn('rounded-md px-3 py-1.5 text-sm', show === key ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}>
      {label}
    </Link>
  )
  return (
    <div className="space-y-5">
      <PageHeader title={t('changes.title')} description={t('changes.description')} actions={<RefreshButton />} />
      <nav className="flex gap-1">
        {tab('pending', t('changes.pending'))}
        {tab('done', t('changes.done'))}
      </nav>
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((r) => (
            <Link key={r.id} href={`/panel/zminy/${r.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {r.studio}
                  {r.city ? <span className="font-normal text-muted-foreground"> · {r.city}</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('changes.fields', { count: r.fields })}
                  {r.author ? ` · ${r.author}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {show === 'done' && <StatusBadge label={t(r.status === 'rejected' ? 'changes.rejected' : 'changes.doneOne')} tone={TONE[r.status]} />}
                <time className="w-24 text-right text-xs text-muted-foreground" dateTime={r.decidedAt ?? r.createdAt}>
                  {formatRelative(r.decidedAt ?? r.createdAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('changes.empty')} />
      )}
    </div>
  )
}
