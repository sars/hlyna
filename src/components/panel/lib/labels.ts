// Labels and tones for stored values (one place, so a status reads the same on every screen).
import type { StatusTone } from '@/components/panel/inhouse/status-badge'
import { CONFIDENCE, GEO_PRECISION, REQUEST_STATUS, REQUEST_WHAT, STUDIO_FORMATS, STUDIO_STATUSES, STUDIO_TYPES, STUDIO_VISIBILITY, type RequestStatus } from '@/shared/options'
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
