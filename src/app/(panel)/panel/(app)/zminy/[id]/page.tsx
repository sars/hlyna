import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { fieldLabel } from '@/components/panel/lib/labels'
import { FieldDiff } from '@/components/panel/screens/change-diff'
import { ChangeReview } from '@/components/panel/screens/change-review'
import { EntityHistory } from '@/components/panel/screens/history'
import { Card, CardContent } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { getChangeSet } from '@/server/services/changeSets'

export const metadata = { title: 'Зміни власника' }

export default async function ChangeSetPage({ params }: { params: Promise<{ id: string }> }) {
  const cs = await getChangeSet(db, Number((await params).id))
  if (!cs) notFound()
  const media = cs.media as Parameters<typeof FieldDiff>[0]['media']
  const fields = cs.fields.map((f) => ({ key: f.key, label: fieldLabel(f.key), changed: f.changed, ownerText: f.ownerText, diff: <FieldDiff field={f.key} from={f.from} to={f.to} media={media} /> }))
  return (
    <div className="space-y-5">
      <Link href="/panel/zminy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t('nav.changes')}
      </Link>
      <PageHeader
        title={t('changes.detail', { studio: cs.studio.name })}
        description={`${formatDateTime(cs.createdAt)}${cs.author ? ` · ${cs.author}` : ''}`}
        actions={
          <a href={`/vyrobnyky/${cs.studio.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {t('changes.openSite')} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        }
      />
      {cs.stale && cs.status === 'pending' && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">{t('changes.stale')}</p>}
      {cs.status === 'pending' ? (
        <ChangeReview id={cs.id} fields={fields} publicDescription={cs.studio.publicDescription} recentNote={cs.studio.recentNote} hasQuote={cs.fields.some((f) => f.key === 'ownerQuote' && f.to)} />
      ) : (
        <>
          <StatusBadge label={t(cs.status === 'rejected' ? 'changes.rejected' : 'changes.doneOne')} tone={cs.status === 'rejected' ? 'bad' : 'good'} />
          {cs.fields.map((f) => (
            <Card key={f.key} className="gap-0 py-0 shadow-xs">
              <CardContent className="space-y-3 p-4 sm:p-6">
                <p className="text-sm font-medium">
                  {fieldLabel(f.key)} {f.applied ? '✓' : ''}
                </p>
                <FieldDiff field={f.key} from={f.from} to={f.to} media={media} />
              </CardContent>
            </Card>
          ))}
        </>
      )}
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('requests.history')}</h2>
          <EntityHistory entity="change_set" id={cs.id} />
        </CardContent>
      </Card>
    </div>
  )
}
