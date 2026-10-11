// Labels and tones for stored values (one place, so a status reads the same on every screen).
import type { StatusTone } from '@/components/panel/inhouse/status-badge'
import { REQUEST_STATUS, REQUEST_WHAT, type RequestStatus } from '@/shared/options'
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
