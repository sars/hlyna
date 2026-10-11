import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton } from '@/components/panel/inhouse'
import { formatNumber } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { listCities } from '@/server/services/cities'

export const metadata = { title: 'Міста' }

export default async function CitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const rows = await listCities(db, sp.q)
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('cities.title')}
        description={t('cities.description')}
        actions={
          <>
            <Link href="/panel/mista/nove" className="text-sm text-primary hover:underline">
              {t('cities.new')}
            </Link>
            <RefreshButton />
          </>
        }
      />
      <UrlFilters filters={[{ kind: 'search', name: 'q', label: t('cities.search') }]} />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((c) => (
            <Link key={c.id} href={`/panel/mista/${c.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{[c.slug, c.oblast, c.locative ?? `у м. ${c.name}`].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {t('cities.studios')}: {c.studios}
                {c.publicStudios !== c.studios ? ` (${c.publicStudios} ${t('cities.public')})` : ''}
                {c.population ? <span className="block">{formatNumber(c.population)}</span> : null}
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('list.empty')} />
      )}
    </div>
  )
}
