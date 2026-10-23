'use client'

import { useRouter } from 'next/navigation'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { FormField, StatusBadge } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { ORDER_STATUS_TONE, orderStatusLabel } from '@/components/panel/lib/labels'
import { cn } from '@/components/panel/lib/utils'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { Textarea } from '@/components/panel/ui/textarea'
import { ORDER_STATUS, PAYMENT_STATUS, type OrderStatus, type PaymentStatus } from '@/shared/options'

/** Status in one tap (optimistic); «Скасовано» first asks for a reason in an inline field. */
export function OrderStatusPicker({ id, status }: { id: number; status: OrderStatus }) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useOptimistic(status)
  const [, start] = useTransition()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const send = (s: OrderStatus, why?: string) =>
    start(async () => {
      setOptimistic(s)
      try {
        await api(`/orders/${id}/status`, { body: { status: s, ...(why ? { reason: why } : {}) } })
        toast.success(t('orders.statusSaved', { status: orderStatusLabel(s) }))
        setCancelling(false)
        setReason('')
        router.refresh()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('orders.status')}>
        {ORDER_STATUS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={optimistic === s}
            onClick={() => {
              if (s === 'cancelled') return setCancelling(optimistic !== 'cancelled')
              setCancelling(false)
              send(s)
            }}
            className={cn('min-h-9 rounded-md border px-2 text-sm', optimistic === s ? 'border-primary bg-primary/10' : 'hover:bg-muted')}
          >
            <StatusBadge label={orderStatusLabel(s)} tone={ORDER_STATUS_TONE[s]} className="border-0 px-0" />
          </button>
        ))}
      </div>
      {cancelling && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            send('cancelled', reason.trim())
          }}
        >
          <FormField id="cancel-reason" label={t('orders.cancelReason')} hint={t('orders.cancelReasonHint')}>
            <Input id="cancel-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} autoFocus />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive">{t('orders.cancelConfirm')}</Button>
            <Button type="button" variant="outline" onClick={() => setCancelling(false)}>{t('orders.cancelAbort')}</Button>
          </div>
        </form>
      )}
    </div>
  )
}

const PAYMENT_KEY = { unpaid: 'orders.paymentUnpaid', paid: 'orders.paymentPaid', refunded: 'orders.paymentRefunded' } as const

/** Tracking number, the studio's note, payment state and the delivery cost. */
export function OrderNotes({ id, tracking, studioNote, paymentStatus, deliveryKop }: { id: number; tracking: string | null; studioNote: string | null; paymentStatus: PaymentStatus; deliveryKop: number | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const cost = String(form.get('delivery') ?? '').trim().replace(',', '.')
        const costNum = cost === '' ? null : Number(cost)
        if (costNum !== null && !Number.isFinite(costNum)) return toast.error(t('orders.deliveryCost'))
        setBusy(true)
        try {
          await api(`/orders/${id}`, {
            method: 'PATCH',
            body: {
              tracking: String(form.get('tracking') ?? '').trim() || null,
              studioNote: String(form.get('studioNote') ?? '').trim() || null,
              paymentStatus: String(form.get('paymentStatus')),
              deliveryUah: costNum,
            },
          })
          toast.success(t('orders.saved'))
          router.refresh()
        } catch (err) {
          toast.error((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <fieldset disabled={busy} className="space-y-4">
        <FormField id="tracking" label={t('orders.tracking')}>
          <Input id="tracking" name="tracking" defaultValue={tracking ?? ''} maxLength={60} className="sm:w-72" />
        </FormField>
        <FormField id="paymentStatus" label={t('orders.paymentStatus')}>
          <select id="paymentStatus" name="paymentStatus" defaultValue={paymentStatus} className="h-9 min-h-9 rounded-md border bg-transparent px-2 text-sm sm:w-48">
            {PAYMENT_STATUS.map((p) => (
              <option key={p} value={p}>{t(PAYMENT_KEY[p])}</option>
            ))}
          </select>
        </FormField>
        <FormField id="delivery" label={t('orders.deliveryCost')} hint={t('orders.deliveryCostHint')}>
          <Input id="delivery" name="delivery" inputMode="decimal" defaultValue={deliveryKop != null ? String(deliveryKop / 100) : ''} className="sm:w-48" />
        </FormField>
        <FormField id="studioNote" label={t('orders.note')} hint={t('orders.noteHint')}>
          <Textarea id="studioNote" name="studioNote" defaultValue={studioNote ?? ''} rows={4} maxLength={2000} />
        </FormField>
        <Button type="submit">{busy ? t('action.saving') : t('action.save')}</Button>
      </fieldset>
    </form>
  )
}
