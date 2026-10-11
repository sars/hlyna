'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog, FormField } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Card, CardContent } from '@/components/panel/ui/card'
import { Checkbox } from '@/components/panel/ui/checkbox'
import { Textarea } from '@/components/panel/ui/textarea'

export type ReviewField = { key: string; label: string; changed: boolean; ownerText: boolean; diff: ReactNode }

/**
 * Field-by-field review of an owner's change set. Owner text is never published as is: tick it only to store it
 * internally, and write our own public description in the box below (saved in the same step).
 */
export function ChangeReview({
  id,
  fields,
  publicDescription,
  recentNote,
  hasQuote,
}: {
  id: number
  fields: ReviewField[]
  publicDescription: string | null
  recentNote: string | null
  hasQuote: boolean
}) {
  const router = useRouter()
  const [accept, setAccept] = useState<Set<string>>(new Set(fields.filter((f) => f.changed && !f.ownerText).map((f) => f.key)))
  const [desc, setDesc] = useState(publicDescription ?? '')
  const [note, setNote] = useState(recentNote ?? '')
  const [quote, setQuote] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const hasText = fields.some((f) => f.ownerText && f.changed)
  const changed = fields.filter((f) => f.changed)
  const unchanged = fields.filter((f) => !f.changed)
  const labelsOf = (keys: string[]) => fields.filter((f) => keys.includes(f.key)).map((f) => f.label).join(', ')
  const allButText = changed.filter((f) => !f.ownerText).map((f) => f.key)

  const submit = async (keys: string[] | 'all-but-text') => {
    setBusy(true)
    try {
      const res = await api<{ applied: string[] }>(`/change-sets/${id}/apply`, {
        body: {
          accept: keys,
          ...(desc !== (publicDescription ?? '') ? { publicDescription: desc || null } : {}),
          ...(note !== (recentNote ?? '') ? { recentNote: note || null } : {}),
          ...(quote ? { approveQuote: true } : {}),
        },
      })
      toast.success(t('changes.applied', { count: res.applied.length }))
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset disabled={busy} className="space-y-5">
      {changed.map((f) => (
        <Card key={f.key} className="gap-0 py-0 shadow-xs">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <label className="flex min-h-11 items-center gap-3">
              <Checkbox
                checked={accept.has(f.key)}
                onCheckedChange={(on) => {
                  const next = new Set(accept)
                  if (on) next.add(f.key)
                  else next.delete(f.key)
                  setAccept(next)
                }}
              />
              <span className="text-sm font-medium">{f.label}</span>
            </label>
            {f.ownerText && <p className="text-xs text-warning">{t('changes.ownerText')}</p>}
            {f.diff}
          </CardContent>
        </Card>
      ))}

      {unchanged.length > 0 && (
        <details className="rounded-lg border px-4 py-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center text-muted-foreground">{t('changes.unchanged', { count: unchanged.length })}</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {unchanged.map((f) => (
              <li key={f.key}>{f.label}</li>
            ))}
          </ul>
        </details>
      )}

      {hasText && (
        <Card className="gap-0 py-0 shadow-xs">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <FormField id="desc" label={t('changes.rewrite')} hint={t('changes.rewriteHint')}>
              <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={8} />
            </FormField>
            <FormField id="note" label={t('changes.recentNote')}>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </FormField>
            {hasQuote && (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox checked={quote} onCheckedChange={(on) => setQuote(Boolean(on))} />
                {t('changes.approveQuote')}
              </label>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger={<Button disabled={busy || accept.size === 0}>{busy ? t('action.saving') : t('changes.applySelected')}</Button>}
          title={t('changes.publishConfirm', { count: accept.size })}
          body={labelsOf([...accept])}
          destructive={false}
          confirmLabel={t('changes.publish')}
          onConfirm={() => submit([...accept])}
        />
        {hasText && (
          <ConfirmDialog
            trigger={<Button variant="outline" disabled={busy}>{t('changes.applyAllButText')}</Button>}
            title={t('changes.publishConfirm', { count: allButText.length })}
            body={`${labelsOf(allButText)}. ${t('changes.ownerTextStays')}`}
            destructive={false}
            confirmLabel={t('changes.publish')}
            onConfirm={() => submit('all-but-text')}
          />
        )}
        <ConfirmDialog
          trigger={<Button variant="outline">{t('changes.reject')}</Button>}
          title={t('changes.reject')}
          confirmLabel={t('changes.reject')}
          onConfirm={async () => {
            try {
              await api(`/change-sets/${id}/reject`, { body: { note: reason } })
              toast.success(t('changes.rejected'))
              router.refresh()
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        >
          <FormField id="reason" label={t('changes.note')}>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </FormField>
        </ConfirmDialog>
      </div>
    </fieldset>
  )
}
