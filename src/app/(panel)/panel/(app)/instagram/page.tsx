import { KpiCard, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime, formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { instagramStatus } from '@/server/services/instagram'

export const metadata = { title: 'Instagram' }

function Scanner({ title, status, stopped, figures }: { title: string; status: { at: string | null; message: string } | null; stopped: string | null; figures: [string, number][] }) {
  return (
    <Card className="gap-3 p-4 shadow-xs md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {stopped ? <StatusBadge label={t('ig.stopped', { reason: stopped.slice(0, 60) })} tone="bad" /> : status ? <StatusBadge label={status.at ? formatRelative(status.at) : '—'} tone="neutral" /> : null}
      </div>
      {status && <p className="text-sm text-muted-foreground">{status.message}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {figures.map(([label, n]) => (
          <KpiCard key={label} label={label} value={n} />
        ))}
      </div>
    </Card>
  )
}

export default async function InstagramPage() {
  const s = await instagramStatus(db)
  return (
    <div className="space-y-5">
      <PageHeader title={t('ig.title')} description={t('ig.description')} actions={<RefreshButton />} />
      {!s.reachable ? (
        <Card className="p-4 text-sm shadow-xs">{t('ig.unreachable', { dir: s.dir })}</Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('ig.lastSync')}: {s.lastSync ? `${formatDateTime(s.lastSync)} (${formatRelative(s.lastSync)})` : '—'}
          </p>
          <Scanner
            title={t('ig.posts')}
            status={s.posts.status}
            stopped={s.posts.stopped}
            figures={[
              [t('ig.done'), s.posts.done],
              [t('ig.entries'), s.posts.entries],
              [t('ig.notes'), s.posts.notes],
              ['ok', s.posts.byStatus.ok ?? 0],
            ]}
          />
          <Scanner
            title={t('ig.highlights')}
            status={s.highlights.status}
            stopped={s.highlights.stopped}
            figures={[
              [t('ig.done'), s.highlights.done],
              [t('ig.entries'), s.highlights.entries],
              [t('ig.extracted'), s.highlights.extracted],
            ]}
          />
          <Card className="gap-2 p-4 shadow-xs md:p-5">
            <h2 className="text-base font-semibold">{t('ig.log')}</h2>
            <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
              {s.recentLog.map((l) => (
                <li key={l} className="break-words">
                  {l}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <Card className="gap-2 p-4 shadow-xs md:p-5">
        <h2 className="text-base font-semibold">{t('ig.runs')}</h2>
        {s.runs.length ? (
          <ul className="divide-y text-sm">
            {s.runs.map((r) => (
              <li key={r.id} className="py-2">
                <span className="font-medium">{r.script}</span> · {formatDateTime(r.startedAt)}
                {r.counts ? <span className="block text-xs text-muted-foreground">{JSON.stringify(r.counts)}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('ig.noRuns')}</p>
        )}
      </Card>
    </div>
  )
}
