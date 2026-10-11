import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { EmptyState, PageHeader } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { RevisionRow } from '@/components/panel/screens/revision-row'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { studios } from '@/server/db/schema/catalog'
import { listRevisions } from '@/server/services/studioEditor'

export const metadata = { title: 'Історія змін' }

export default async function StudioHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const [s] = await db.select({ name: studios.name, revision: studios.revision }).from(studios).where(eq(studios.id, id)).limit(1)
  if (!s) notFound()
  const revisions = await listRevisions(db, id, 100)
  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('revisions.title')}: ${s.name}`}
        description={t('revisions.description')}
        actions={
          <Link href={`/panel/studii/${id}`} className="text-sm text-primary hover:underline">
            {t('studios.edit')}
          </Link>
        }
      />
      {revisions.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {revisions.map((r, i) => (
            <RevisionRow
              key={r.id}
              studioId={id}
              revisionId={r.id}
              revision={r.revision}
              when={formatDateTime(r.createdAt)}
              who={r.actorName ?? (r.source === 'payload-version' ? t('revisions.migrated') : r.source.startsWith('script:') ? r.source.slice(7) : r.source)}
              note={r.note}
              current={i === 0}
              currentRevision={s.revision}
            />
          ))}
        </Card>
      ) : (
        <EmptyState title={t('revisions.empty')} />
      )}
    </div>
  )
}
