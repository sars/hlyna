import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { formatOptions, STUDIO_STATUS_TONE, studioStatusLabel, studioStatusOptions, typeLabel, typeOptions, visibilityOptions } from '@/components/panel/lib/labels'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { cityOptions, listStudios } from '@/server/services/studioEditor'
import type { StudioFormat, StudioType } from '@/shared/options'

export const metadata = { title: 'Студії' }

const yesNo = (v?: string) => (v === 'yes' ? true : v === 'no' ? false : undefined)

export default async function StudiosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const [cities, list] = await Promise.all([
    cityOptions(db),
    listStudios(db, {
      q: sp.q,
      cityId: sp.city ? Number(sp.city) : undefined,
      type: sp.type as StudioType | undefined,
      status: sp.status,
      visibility: sp.visibility as 'public' | 'hidden' | undefined,
      format: sp.format as StudioFormat | undefined,
      verified: yesNo(sp.verified),
      hasPrices: yesNo(sp.prices),
      hasAddress: yesNo(sp.address),
      after: sp.after ? (() => { const i = sp.after!.lastIndexOf('|'); return { name: sp.after!.slice(0, i), id: Number(sp.after!.slice(i + 1)) } })() : undefined,
    }),
  ])
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  if (list.next) more.set('after', `${list.next.name}|${list.next.id}`)
  const yesNoOptions = [{ value: 'yes', label: t('studios.yes') }, { value: 'no', label: t('studios.no') }]
  return (
    <div className="space-y-5">
      <PageHeader title={t('studios.title')} description={t('studios.description')} actions={<RefreshButton />} />
      <UrlFilters
        filters={[
          { kind: 'search', name: 'q', label: t('studios.search') },
          { kind: 'choice', name: 'city', label: t('studios.city'), allLabel: t('studios.all'), options: cities.filter((c) => c.count > 0).map((c) => ({ value: String(c.id), label: `${c.name} (${c.count})` })) },
          { kind: 'choice', name: 'type', label: t('studios.type'), allLabel: t('studios.all'), options: typeOptions },
          { kind: 'choice', name: 'visibility', label: t('studios.visibility'), allLabel: t('studios.all'), options: visibilityOptions },
          { kind: 'choice', name: 'status', label: t('studios.status'), allLabel: t('studios.all'), options: [...studioStatusOptions, { value: 'none', label: studioStatusLabel(null) }] },
          { kind: 'choice', name: 'format', label: t('studios.format'), allLabel: t('studios.all'), options: formatOptions },
          { kind: 'choice', name: 'verified', label: t('studios.verified'), allLabel: t('studios.all'), options: yesNoOptions },
          { kind: 'choice', name: 'prices', label: t('studios.hasPrices'), allLabel: t('studios.all'), options: yesNoOptions },
          { kind: 'choice', name: 'address', label: t('studios.hasAddress'), allLabel: t('studios.all'), options: yesNoOptions },
        ]}
      />
      {list.rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {list.rows.map((s) => (
            <Link key={s.id} href={`/panel/studii/${s.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {s.name}
                  {s.visibility === 'hidden' && <span className="ml-2 text-xs font-normal text-muted-foreground">· {t('visibility.hidden')}</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[typeLabel(s.type), s.city, !s.hasPrices ? t('studios.noPrices') : null, s.geoPrecision === 'settlement' || !s.geoPrecision ? t('studios.noAddress') : null, s.ownerVerified ? t('studios.verifiedShort') : null].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusBadge label={studioStatusLabel(s.status)} tone={STUDIO_STATUS_TONE[s.status ?? 'none']} />
                <time className="w-24 text-right text-xs text-muted-foreground tabular-nums" dateTime={s.updatedAt}>
                  {formatRelative(s.updatedAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('studios.empty')} />
      )}
      {list.hasMore && (
        <Link href={`/panel/studii?${more}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
