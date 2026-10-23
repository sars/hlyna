// Labels and tones for stored values (one place, so a status reads the same on every screen).
import type { StatusTone } from '@/components/panel/inhouse/status-badge'
import { CHAT_STATUS, type ChatStatus } from '@/chat/schema'
import { CONFIDENCE, GEO_PRECISION, ORDER_STATUS, ORDER_STATUS_LABEL, REQUEST_STATUS, REQUEST_WHAT, STUDIO_FORMATS, STUDIO_STATUSES, STUDIO_TYPES, STUDIO_VISIBILITY, type OrderStatus, type RequestStatus } from '@/shared/options'
import { t } from './i18n'

export const statusLabel = (s: string) => t(`status.${s}`)
export const whatLabel = (w: string) => t(`what.${w}`)
export const fieldLabel = (f: string) => t(`field.${f}`)

export const STATUS_TONE: Record<RequestStatus, StatusTone> = {
  new: 'warn',
  in_progress: 'neutral',
  forwarded: 'neutral',
  replied: 'neutral',
  deal: 'good',
  lost: 'bad',
  closed: 'neutral',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  new: 'warn',
  confirmed: 'neutral',
  in_progress: 'neutral',
  shipped: 'neutral',
  done: 'good',
  cancelled: 'bad',
}
export const orderStatusLabel = (s: OrderStatus) => ORDER_STATUS_LABEL[s]
export const orderStatusOptions = ORDER_STATUS.map((value) => ({ value, label: ORDER_STATUS_LABEL[value] }))

export const statusOptions = REQUEST_STATUS.map((value) => ({ value, label: statusLabel(value) }))
export const whatOptions = REQUEST_WHAT.map((value) => ({ value, label: whatLabel(value) }))

export const typeLabel = (v: string | null | undefined) => (v ? t(`type.${v}`) : '—')
export const studioStatusLabel = (v: string | null | undefined) => t(`studioStatus.${v ?? 'none'}`)
export const formatLabel = (v: string) => t(`format.${v}`)
export const precisionLabel = (v: string | null | undefined) => (v ? t(`precision.${v}`) : '—')

export const STUDIO_STATUS_TONE: Record<string, StatusTone> = { active: 'good', unclear: 'warn', closed: 'bad', relocated: 'neutral', none: 'neutral' }

export const typeOptions = STUDIO_TYPES.map((value) => ({ value, label: typeLabel(value) }))
export const studioStatusOptions = STUDIO_STATUSES.map((value) => ({ value, label: studioStatusLabel(value) }))
export const formatOptions = STUDIO_FORMATS.map((value) => ({ value, label: formatLabel(value) }))
export const visibilityOptions = STUDIO_VISIBILITY.map((value) => ({ value, label: t(`visibility.${value}`) }))
export const precisionOptions = GEO_PRECISION.map((value) => ({ value, label: precisionLabel(value) }))
export const confidenceOptions = CONFIDENCE.map((value) => ({ value, label: t(`confidence.${value}`) }))

/** Audit-log action words («змінено», «схвалено»…); unknown ones are shown as they are. */
export const actionLabel = (a: string) => {
  const v = t(`act.${a}`)
  return v === `act.${a}` ? a : v
}

/** Where a change came from: панель, Telegram, кабінет or a named script. */
export const sourceLabel = (s: string | null | undefined) => (!s ? null : s.startsWith('script:') ? `${t('source.script')} ${s.slice(7)}` : t(`source.${s}`))

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
/** A stored value in words, aware of what kind of record it belongs to. */
export function historyValue(entity: string, field: string, v: unknown, fmtDate: (iso: string) => string, fmtAmount: (kop: number) => string): string {
  if (v === null || v === undefined || v === '') return t('history.empty')
  if (field === 'status' && typeof v === 'string') return entity === 'claim' ? t(`claimStatus.${v}`) : entity === 'change_set' ? t(`csStatus.${v}`) : entity === 'studio' ? studioStatusLabel(v) : statusLabel(v)
  if (field === 'role' && typeof v === 'string') return t(`role.${v}`)
  if (field === 'active' && typeof v === 'boolean') return v ? t('history.on') : t('history.off')
  if (field === 'dealAmountKop' && typeof v === 'number') return fmtAmount(v)
  if (field === 'fields' && Array.isArray(v)) return v.length ? v.map((f) => fieldLabel(String(f))).join(', ') : t('history.empty')
  if (typeof v === 'boolean') return v ? t('history.yes') : t('history.no')
  if (typeof v === 'string' && ISO.test(v)) return fmtDate(v)
  if (Array.isArray(v)) return v.length ? (v.every((x) => typeof x === 'string') ? v.join(', ') : `${v.length}`) : t('history.empty')
  if (typeof v === 'object') return '…'
  const s = String(v)
  return s.length > 80 ? `${s.slice(0, 80)}…` : s
}

/** The site chat's states (src/chat): waiting for a person is the one that needs attention. */
export const CHAT_TONE: Record<ChatStatus, StatusTone> = { ai: 'neutral', waiting: 'warn', human: 'good', closed: 'neutral' }
export const chatStatusOptions = CHAT_STATUS.map((value) => ({ value, label: t(`chat.status.${value}`) }))
