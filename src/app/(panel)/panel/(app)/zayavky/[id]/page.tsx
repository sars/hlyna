import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { ClaimActions } from '@/components/panel/screens/claim-actions'
import { EntityHistory } from '@/components/panel/screens/history'
import { Card, CardContent } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { getClaim } from '@/server/services/claims'

export const metadata = { title: 'Заявка' }

const TONE = { pending: 'warn', approved: 'good', rejected: 'bad' } as const
const LABEL = { pending: 'claims.pending', approved: 'claims.approved', rejected: 'claims.rejected' } as const

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await getClaim(db, Number((await params).id))
  if (!c) notFound()
  return (
    <div className="space-y-5">
      <Link href="/panel/zayavky" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t('nav.claims')}
      </Link>
      <PageHeader title={t('claims.detail', { id: c.id })} description={formatDateTime(c.createdAt)} actions={<StatusBadge label={t(LABEL[c.status])} tone={TONE[c.status]} />} />
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('claims.who')}</dt>
              <dd className="text-sm">{c.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('claims.contact')}</dt>
              <dd className="text-sm break-words">{c.contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('claims.represents')}</dt>
              <dd className="text-sm">{c.represents ? t('history.yes') : t('history.no')}</dd>
            </div>
            {c.owner && (
              <div>
                <dt className="text-xs text-muted-foreground">{t('field.owner')}</dt>
                <dd className="text-sm">{t('claims.owner', { name: c.owner.name })}{c.owner.login ? ` · ${c.owner.login}` : ''}</dd>
              </div>
            )}
            {c.rejectReason && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{t('field.reason')}</dt>
                <dd className="text-sm">{c.rejectReason}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('claims.studios')}</h2>
          <p className="text-xs text-muted-foreground">{t('claims.verifyHint')}</p>
          <ul className="divide-y rounded-md border">
            {c.studios.map((s) => (
              <li key={s.id} className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {s.name}
                    {s.city ? <span className="font-normal text-muted-foreground"> · {s.city}</span> : null}
                  </span>
                  <a href={`/vyrobnyky/${s.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {t('changes.openSite')} <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {s.instagram && <a className="hover:underline" href={s.instagram} target="_blank" rel="noopener">{s.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</a>}
                  {s.website && <a className="hover:underline" href={s.website} target="_blank" rel="noopener">{s.website.replace(/^https?:\/\//, '')}</a>}
                  {s.phone && <span>{s.phone}</span>}
                  {s.email && <span>{s.email}</span>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {c.status === 'pending' && <ClaimActions id={c.id} existingOwners={c.existingOwners} />}
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('requests.history')}</h2>
          <EntityHistory entity="claim" id={c.id} />
        </CardContent>
      </Card>
    </div>
  )
}
