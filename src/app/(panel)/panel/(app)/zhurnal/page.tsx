import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { actionLabel, fieldLabel, sourceLabel } from '@/components/panel/lib/labels'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { journal } from '@/server/services/overview'

export const metadata = { title: 'Журнал змін' }

const LINK: Record<string, (id: string) => string> = {
  request: (id) => `/panel/zapyty/${id}`,
  claim: (id) => `/panel/zayavky/${id}`,
  change_set: (id) => `/panel/zminy/${id}`,
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ entity?: string; before?: string }> }) {
  const sp = await searchParams
  const { rows, next } = await journal(db, { entity: sp.entity || undefined, before: sp.before ? Number(sp.before) : undefined })
  return (
    <div className="space-y-5">
      <PageHeader title={t('journal.title')} description={t('journal.description')} actions={<RefreshButton />} />
      <UrlFilters
        filters={[
          {
            kind: 'choice',
            name: 'entity',
            label: t('journal.entity'),
            allLabel: t('requests.all'),
            options: ['request', 'claim', 'studio', 'change_set', 'user'].map((e) => ({ value: e, label: t(`entity.${e}`) })),
          },
        ]}
      />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((r) => {
            const href = LINK[r.entity]?.(r.entityId)
            const fields = Object.keys((r.changes ?? {}) as object)
            const body = (
              <>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{t(`entity.${r.entity}`)} {r.entityLabel ? `«${r.entityLabel}»` : `#${r.entityId}`}</span> · {actionLabel(r.action)}
                  {fields.length ? <span className="text-muted-foreground"> · {fields.map(fieldLabel).join(', ')}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {[r.actorName, r.source && r.source !== 'panel' ? sourceLabel(r.source) : null].filter(Boolean).join(' · ')} · {formatDateTime(r.at)}
                </span>
              </>
            )
            return href ? (
              <Link key={r.id} href={href} className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
                {body}
              </Link>
            ) : (
              <div key={r.id} className="flex min-h-11 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                {body}
              </div>
            )
          })}
        </Card>
      ) : (
        <EmptyState title={t('journal.empty')} />
      )}
      {next && (
        <Link href={`/panel/zhurnal?${new URLSearchParams({ ...(sp.entity ? { entity: sp.entity } : {}), before: String(next) })}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
