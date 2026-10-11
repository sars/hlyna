import { ClipboardList, FilePenLine, Handshake, Inbox, UserCheck } from 'lucide-react'
import Link from 'next/link'

import { KpiCard, PageHeader, RefreshButton } from '@/components/panel/inhouse'
import { formatAmount, formatNumber, formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { Card, CardContent } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { overview } from '@/server/services/overview'

export default async function OverviewPage() {
  const o = await overview(db)
  const todo = [
    o.queues.claims > 0 && { href: '/panel/zayavky', text: t('overview.todoClaims', { count: o.queues.claims }) },
    o.queues.changes > 0 && { href: '/panel/zminy', text: t('overview.todoChanges', { count: o.queues.changes }) },
    o.requests.open > 0 && { href: '/panel/zapyty?status=new', text: t('overview.todoRequests') },
  ].filter(Boolean) as { href: string; text: string }[]
  const n = formatNumber
  return (
    <div className="space-y-5">
      <PageHeader title={t('overview.title')} description={t('overview.description')} actions={<RefreshButton />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('overview.newRequests')} value={n(o.requests.new7)} note={t('overview.newRequests30', { count: o.requests.new30 })} icon={Inbox} href="/panel/zapyty" />
        <KpiCard label={t('overview.openRequests')} value={n(o.requests.open)} note={t('overview.openNote')} icon={ClipboardList} href="/panel/zapyty?status=open" />
        <KpiCard label={t('overview.claims')} value={n(o.queues.claims)} note={t('overview.queueNote')} tone={o.queues.claims ? 'warn' : 'plain'} icon={UserCheck} href="/panel/zayavky" />
        <KpiCard label={t('overview.changes')} value={n(o.queues.changes)} note={t('overview.queueNote')} tone={o.queues.changes ? 'warn' : 'plain'} icon={FilePenLine} href="/panel/zminy" />
      </div>

      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-2 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('overview.todo')}</h2>
          {todo.length ? (
            <ul className="space-y-1 text-sm">
              {todo.map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="text-primary hover:underline">
                    {x.text}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('overview.allDone')}</p>
          )}
        </CardContent>
      </Card>

      <h2 className="text-sm font-medium">{t('overview.catalog')}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('overview.public')} value={n(o.catalog.public)} note={t('overview.hidden', { count: o.catalog.hidden })} />
        <KpiCard label={t('overview.verified')} value={n(o.catalog.ownerVerified)} tone="good" />
        <KpiCard label={t('overview.deals')} value={n(o.requests.dealsMonth)} note={t('overview.commission', { amount: formatAmount(o.requests.commissionMonthKop, 'UAH') })} icon={Handshake} />
        <KpiCard label={t('overview.checked30')} value={n(o.catalog.checked30)} />
        <KpiCard label={t('overview.noPrices')} value={n(o.catalog.noPrices)} tone={o.catalog.noPrices ? 'warn' : 'plain'} />
        <KpiCard label={t('overview.noGeo')} value={n(o.catalog.noGeo)} />
        <KpiCard label={t('overview.noInstagram')} value={n(o.catalog.noInstagram)} />
        <KpiCard label={t('overview.staleIg')} value={n(o.catalog.staleIg)} tone={o.catalog.staleIg ? 'warn' : 'plain'} />
      </div>
      <p className="text-xs text-muted-foreground">
        {o.lastImport ? t('overview.lastImport', { script: o.lastImport.script, when: formatRelative(o.lastImport.startedAt) }) : t('overview.noImport')}
      </p>
    </div>
  )
}
