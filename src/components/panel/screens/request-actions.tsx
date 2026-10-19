'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { FormField, StatusBadge } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { formatAmount } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { STATUS_TONE, statusLabel } from '@/components/panel/lib/labels'
import { cn } from '@/components/panel/lib/utils'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { Textarea } from '@/components/panel/ui/textarea'
import { REQUEST_STATUS, type RequestStatus } from '@/shared/options'

/** Status in one tap (optimistic: the chip moves at once, the server confirms or the old one comes back). */
export function StatusPicker({ id, status }: { id: number; status: RequestStatus }) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useOptimistic(status)
  const [, start] = useTransition()
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('requests.status')}>
      {REQUEST_STATUS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={optimistic === s}
          onClick={() =>
            start(async () => {
              setOptimistic(s)
              try {
                await api(`/requests/${id}/status`, { body: { status: s } })
                toast.success(t('requests.statusSaved', { status: statusLabel(s) }))
                router.refresh()
              } catch (e) {
                toast.error((e as Error).message)
              }
            })
          }
          className={cn('min-h-9 rounded-md border px-2 text-sm', optimistic === s ? 'border-primary bg-primary/10' : 'hover:bg-muted')}
        >
          <StatusBadge label={statusLabel(s)} tone={STATUS_TONE[s]} className="border-0 px-0" />
        </button>
      ))}
    </div>
  )
}

/** Notes and the deal amount; the 10 % commission shows as you type (Postgres computes the stored value). */
export function RequestNotes({ id, notes, dealAmountKop }: { id: number; notes: string | null; dealAmountKop: number | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState(dealAmountKop != null ? String(dealAmountKop / 100) : '')
  const uah = amount.trim() === '' ? null : Number(amount.replace(',', '.'))
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setBusy(true)
        try {
          await api(`/requests/${id}`, { method: 'PATCH', body: { notes: String(form.get('notes') ?? ''), dealAmountUah: uah != null && Number.isFinite(uah) ? uah : null } })
          toast.success(t('requests.saved'))
          router.refresh()
        } catch (err) {
          toast.error((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <fieldset disabled={busy} className="space-y-4">
        <FormField id="notes" label={t('requests.notes')} hint={t('requests.notesHint')}>
          <Textarea id="notes" name="notes" defaultValue={notes ?? ''} rows={4} />
        </FormField>
        <FormField
          id="deal"
          label={t('requests.deal')}
          hint={uah != null && Number.isFinite(uah) && uah > 0 ? t('requests.commission', { amount: formatAmount(Math.round(uah * 10), 'UAH') }) : undefined}
        >
          <Input id="deal" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="sm:w-48" />
        </FormField>
        <Button type="submit">{busy ? t('action.saving') : t('action.save')}</Button>
      </fieldset>
    </form>
  )
}

type Pick = { id: number; name: string; city?: string | null }

/** The studios a request went to: search by name or Instagram, add, remove, save. */
export function RequestStudios({ id, initial }: { id: number; initial: Pick[] }) {
  const router = useRouter()
  const [chosen, setChosen] = useState<Pick[]>(initial)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Pick[]>([])
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)
  useEffect(() => {
    if (q.trim().length < 2) return
    const n = ++seq.current
    const timer = setTimeout(async () => {
      const res = await api<Pick[]>(`/studios/search?q=${encodeURIComponent(q.trim())}`).catch(() => [])
      if (n === seq.current) setFound(res)
    }, 250)
    return () => clearTimeout(timer)
  }, [q])
  const dirty = JSON.stringify(chosen.map((c) => c.id)) !== JSON.stringify(initial.map((c) => c.id))
  return (
    <div className="space-y-3">
      {chosen.length ? (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((s) => (
            <li key={s.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
              {s.name}
              {s.city ? <span className="text-xs text-muted-foreground">· {s.city}</span> : null}
              <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" aria-label={`× ${s.name}`} onClick={() => setChosen(chosen.filter((c) => c.id !== s.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('requests.noStudios')}</p>
      )}
      <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('requests.addStudio')} aria-label={t('requests.addStudio')} />
      {q.trim().length >= 2 && found.length > 0 && (
        <ul className="divide-y rounded-md border">
          {found
            .filter((f) => !chosen.some((c) => c.id === f.id))
            .map((f) => (
              <li key={f.id}>
                <button type="button" className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-muted" onClick={() => { setChosen([...chosen, f]); setQ('') }}>
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.city}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
      {dirty && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const res = await api<{ status?: string }>(`/requests/${id}/studios`, { method: 'PUT', body: { studioIds: chosen.map((c) => c.id) } })
              toast.success(res.status === 'forwarded' ? `${t('requests.saved')}. ${t('requests.forwardedAuto')}` : t('requests.saved'))
              router.refresh()
            } catch (e) {
              toast.error((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? t('action.saving') : t('action.save')}
        </Button>
      )}
    </div>
  )
}
