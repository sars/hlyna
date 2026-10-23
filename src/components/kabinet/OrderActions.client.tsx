'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Fields'
import { SaveBar } from '@/components/ui/SaveBar'
import { nextStatuses, orderStatusLabel } from '@/lib/shop'
import type { OrderStatus } from '@/shared/options'

/** What the button says (the status itself is shown as text above). */
const VERB: Record<OrderStatus, string> = { new: 'Відновити', confirmed: 'Підтвердити', in_progress: 'Взяти в роботу', shipped: 'Відправлено', done: 'Виконано', cancelled: 'Скасувати' }

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<string | null> {
  try {
    const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) return null
    return ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Не вдалося зберегти. Спробуйте ще раз.'
  } catch {
    return 'Немає зв’язку. Спробуйте ще раз.'
  }
}

// The studio's steps on one order: the status buttons (cancelling asks for a reason the buyer sees), the tracking
// number and a private note. Every change goes to the route handlers under /kabinet/api/studio/[slug]/orders/[id].
export function OrderActions({ slug, id, status, tracking, studioNote, cancelReason }: { slug: string; id: number; status: OrderStatus; tracking: string; studioNote: string; cancelReason: string | null }) {
  const router = useRouter()
  const api = `/kabinet/api/studio/${slug}/orders/${id}`
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [t, setT] = useState(tracking)
  const [note, setNote] = useState(studioNote)
  const [saved, setSaved] = useState<{ t: string; note: string }>({ t: tracking, note: studioNote })
  const dirty = t.trim() !== saved.t.trim() || note.trim() !== saved.note.trim()

  async function move(to: OrderStatus) {
    setBusy(true)
    setError(null)
    const err = await send(`${api}/status`, 'POST', { status: to, ...(to === 'cancelled' ? { reason: reason.trim() } : {}) })
    setBusy(false)
    if (err) return setError(err)
    setCancelling(false)
    setReason('')
    router.refresh()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty || busy) return
    setBusy(true)
    setError(null)
    const err = await send(api, 'PATCH', { tracking: t.trim(), studioNote: note.trim() })
    setBusy(false)
    if (err) return setError(err)
    setSaved({ t, note })
    router.refresh()
  }

  const next = nextStatuses(status)
  return (
    <>
      <section aria-labelledby="status" className="grid gap-3">
        <h2 id="status" className="m-0 font-display text-[17px] leading-[1.2] font-semibold">
          Статус
        </h2>
        <p className="m-0 text-[15.5px]">
          Зараз: <b>{orderStatusLabel(status)}</b>
          {status === 'cancelled' && cancelReason && <> · причина: {cancelReason}</>}
        </p>
        {next.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {next
              .filter((s) => s !== 'cancelled')
              .map((s, i) => (
                <Button key={s} size="sm" variant={i === 0 ? 'ink' : 'ghost'} disabled={busy} onClick={() => move(s)}>
                  {VERB[s]}
                </Button>
              ))}
            {next.includes('cancelled') && !cancelling && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(true)}>
                {VERB.cancelled}
              </Button>
            )}
          </div>
        )}
        {cancelling && (
          <div className="grid gap-3">
            <Field variant="box" label="Причина (побачить покупець)" htmlFor="kb-cancel-reason" optional>
              <Textarea id="kb-cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => move('cancelled')}>
                Скасувати замовлення
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(false)}>
                Не скасовувати
              </Button>
            </div>
          </div>
        )}
      </section>
      <form onSubmit={save} noValidate aria-busy={busy} className="grid gap-5">
        <Field variant="box" label="ТТН" htmlFor="kb-tracking" optional hint="Номер накладної Нової пошти — покупець побачить його на сторінці замовлення">
          <Input id="kb-tracking" value={t} maxLength={60} inputMode="numeric" onChange={(e) => setT(e.target.value)} />
        </Field>
        <Field variant="box" label="Нотатка для себе" htmlFor="kb-note" optional>
          <Textarea id="kb-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <SaveBar
          busy={busy}
          tone={error ? 'error' : undefined}
          status={error ?? (dirty ? 'Є незбережені зміни' : <><b>Збережено</b></>)}
          action={
            <Button type="submit" size="sm" disabled={busy || !dirty}>
              Зберегти
            </Button>
          }
        />
      </form>
    </>
  )
}
