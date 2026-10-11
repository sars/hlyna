import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton } from '@/components/panel/inhouse'
import { t } from '@/components/panel/lib/i18n'
import { MediaCard, MediaUpload } from '@/components/panel/screens/media-tools'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { panelUserOrRedirect } from '@/server/auth/guards'
import { db } from '@/server/db'
import { listMedia, mediaUrl } from '@/server/media'

export const metadata = { title: 'Медіа' }

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const me = await panelUserOrRedirect('editor')
  const filter = (['unused', 'pending', 'used'] as const).find((f) => f === sp.show)
  const { rows, hasMore, next } = await listMedia(db, { filter, beforeId: sp.before ? Number(sp.before) : undefined })
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  if (next) more.set('before', String(next))
  return (
    <div className="space-y-5">
      <PageHeader title={t('media.title')} description={t('media.description')} actions={<RefreshButton />} />
      <MediaUpload />
      <UrlFilters
        filters={[
          {
            kind: 'choice',
            name: 'show',
            label: t('media.filter'),
            allLabel: t('media.all'),
            options: [
              { value: 'used', label: t('media.used') },
              { value: 'unused', label: t('media.unused') },
              { value: 'pending', label: t('media.pending') },
            ],
          },
        ]}
      />
      {rows.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((m) => (
            <MediaCard
              key={m.id}
              id={m.id}
              src={mediaUrl(m.thumb ?? m.fileName)!}
              alt={m.alt}
              info={t('media.size', { w: m.width ?? '?', h: m.height ?? '?', kb: Math.round((m.size ?? 0) / 1024) })}
              usage={m.usedBy ? t('media.usedBy', { names: String(m.usedBy) }) : t('media.unusedLong')}
              canDelete={me.role === 'admin' && !m.usedBy}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={t('media.empty')} />
      )}
      {hasMore && (
        <Link href={`/panel/media?${more}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
