import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { STATUS_TONE, statusLabel, whatLabel } from '@/components/panel/lib/labels'
import { EntityHistory } from '@/components/panel/screens/history'
import { RequestNotes, RequestStudios, StatusPicker } from '@/components/panel/screens/request-actions'
import { Card, CardContent } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { getRequest } from '@/server/services/requests'

export const metadata = { title: 'Запит' }

const Row = ({ label, children }: { label: string; children: ReactNode }) =>
  children == null || children === '' || children === false ? null : (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-line">{children}</dd>
    </div>
  )

function contactHref(c: string | null) {
  if (!c) return null
  const v = c.trim()
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`
  const digits = v.replace(/[^\d+]/g, '')
  return digits.length >= 9 ? `tel:${digits}` : null
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const r = await getRequest(db, Number((await params).id))
  if (!r) notFound()
  const href = contactHref(r.contactPhoneOrTelegram)
  return (
    <div className="space-y-5">
      <Link href="/panel/zapyty" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t('nav.requests')}
      </Link>
      <PageHeader title={t('requests.detail', { id: r.id })} description={whatLabel(r.what)} actions={<StatusBadge label={statusLabel(r.status)} tone={STATUS_TONE[r.status]} />} />
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <StatusPicker id={r.id} status={r.status} />
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <dl className="divide-y">
            <Row label={t('requests.from')}>
              {[r.contactName, r.contactPhoneOrTelegram, r.contactEmail].filter(Boolean).join(' · ')}
              {(href || r.contactEmail) && (
                <span className="mt-1 flex gap-3">
                  {href && <a className="text-primary hover:underline" href={href}>{t('requests.contact')}</a>}
                  {r.contactEmail && <a className="text-primary hover:underline" href={`mailto:${r.contactEmail}`}>Email</a>}
                </span>
              )}
            </Row>
            <Row label={t('requests.studioName')}>{r.studioName}</Row>
            <Row label={t('requests.studioLinks')}>{r.studioLinks}</Row>
            <Row label={t('requests.details')}>{r.details}</Row>
            <Row label={t('requests.quantity')}>{r.quantity}</Row>
            <Row label={t('requests.deadline')}>{r.deadline}</Row>
            <Row label={t('requests.budget')}>{r.budgetPerItem}</Row>
            <Row label={t('requests.city')}>{r.city}</Row>
            <Row label={t('requests.logo')}>{r.logo ? t('history.yes') : null}</Row>
            <Row label={t('requests.photoConsent')}>{r.what === 'studio' ? (r.photoConsent ? t('history.yes') : t('history.no')) : null}</Row>
            <Row label={t('requests.source')}>{r.sourcePage}</Row>
            <Row label={t('requests.created')}>{formatDateTime(r.createdAt)}</Row>
          </dl>
        </CardContent>
      </Card>
      {r.what !== 'studio' && (
        <Card className="gap-0 py-0 shadow-xs">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h2 className="text-sm font-medium">{t('requests.studios')}</h2>
            <RequestStudios id={r.id} initial={r.sent.map((s) => ({ id: s.id, name: s.name }))} />
          </CardContent>
        </Card>
      )}
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <RequestNotes id={r.id} notes={r.notes} dealAmountKop={r.dealAmountKop} />
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('requests.history')}</h2>
          <EntityHistory entity="request" id={r.id} />
        </CardContent>
      </Card>
    </div>
  )
}
