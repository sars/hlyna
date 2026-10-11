import { HistoryList, type AuditEvent } from '@/components/panel/inhouse'
import { formatAmount } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { fieldLabel, statusLabel } from '@/components/panel/lib/labels'
import { db } from '@/server/db'
import { journal } from '@/server/services/overview'

/** A record's history from the audit log, as sentences (kit HistoryList). */
export async function EntityHistory({ entity, id }: { entity: string; id: number | string }) {
  const { rows } = await journal(db, { entity, entityId: String(id) })
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t('journal.empty')}</p>
  const events: AuditEvent[] = rows.map((r) => ({
    id: r.id,
    at: r.at,
    actorName: [r.actorName ?? (r.source?.startsWith('script:') ? r.source.slice(7) : null), r.source && r.source !== 'panel' ? `(${t(`source.${r.source}`)})` : null].filter(Boolean).join(' ') || null,
    action: r.action,
    changes: (r.changes ?? {}) as AuditEvent['changes'],
  }))
  return (
    <HistoryList
      events={events}
      fieldLabel={fieldLabel}
      valueLabel={(field, v) => {
        if (v === null || v === undefined || v === '') return t('history.empty')
        if (field === 'status' && typeof v === 'string') return statusLabel(v)
        if (field === 'dealAmountKop' && typeof v === 'number') return formatAmount(v, 'UAH')
        if (typeof v === 'boolean') return v ? t('history.yes') : t('history.no')
        if (Array.isArray(v)) return v.length ? `${v.length}` : t('history.empty')
        if (typeof v === 'object') return '…'
        const s = String(v)
        return s.length > 80 ? `${s.slice(0, 80)}…` : s
      }}
    />
  )
}
