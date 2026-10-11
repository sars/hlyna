import { HistoryList, type AuditEvent } from '@/components/panel/inhouse'
import { formatAmount, formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { actionLabel, fieldLabel, historyValue, sourceLabel } from '@/components/panel/lib/labels'
import { db } from '@/server/db'
import { journal } from '@/server/services/overview'

/** A record's history from the audit log, as sentences (kit HistoryList), with names instead of ids. */
export async function EntityHistory({ entity, id }: { entity: string; id: number | string }) {
  const { rows } = await journal(db, { entity, entityId: String(id) })
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t('journal.empty')}</p>
  const events: AuditEvent[] = rows.map((r) => {
    const changes = (r.changes ?? {}) as AuditEvent['changes']
    const who = [r.actorName, r.source && r.source !== 'panel' ? `(${sourceLabel(r.source)})` : null].filter(Boolean).join(' ') || null
    return { id: r.id, at: r.at, actorName: who, action: r.action, changes }
  })
  return (
    <HistoryList
      events={events}
      fieldLabel={fieldLabel}
      actionLabel={actionLabel}
      valueLabel={(field, v) => historyValue(entity, field, v, (iso) => formatDateTime(iso), (kop) => formatAmount(kop, 'UAH'))}
    />
  )
}
