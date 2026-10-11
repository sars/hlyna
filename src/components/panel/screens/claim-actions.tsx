'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog, FormField } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Card, CardContent } from '@/components/panel/ui/card'
import { Textarea } from '@/components/panel/ui/textarea'

type Owner = { id: string; name: string; login: string | null }
type Approved = { status: 'approved'; ownerId: string; link: string | null; message: string | null; already: boolean } | { status: 'rejected' }

export function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => null)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? t('action.copied') : t('action.copy')}
        </Button>
      </div>
      <pre className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-words">{text}</pre>
    </div>
  )
}

/** Approve (create or extend the owner, link shown once) or reject — the same service the Telegram buttons call. */
export function ClaimActions({ id, existingOwners }: { id: number; existingOwners: Owner[] }) {
  const router = useRouter()
  const [attachTo, setAttachTo] = useState<string>(existingOwners[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Approved | null>(null)
  const [reason, setReason] = useState('')

  if (result?.status === 'approved')
    return (
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <h2 className="text-sm font-medium">{t('claims.approved')}</h2>
          {result.link ? (
            <>
              <p className="text-xs text-muted-foreground">{t('claims.linkNote')}</p>
              <CopyBlock label={t('claims.linkTitle')} text={result.link} />
              {result.message && <CopyBlock label={t('claims.message')} text={result.message} />}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('claims.noLink')}</p>
          )}
        </CardContent>
      </Card>
    )

  return (
    <Card className="gap-0 py-0 shadow-xs">
      <CardContent className="space-y-4 p-4 sm:p-6">
        {existingOwners.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">{t('claims.existingOwners')}</legend>
            {existingOwners.map((o) => (
              <label key={o.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="attach" checked={attachTo === o.id} onChange={() => setAttachTo(o.id)} />
                {t('claims.attachTo')}: {o.name}
                {o.login ? <span className="text-xs text-muted-foreground">({o.login})</span> : null}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="attach" checked={attachTo === ''} onChange={() => setAttachTo('')} />
              {t('claims.newOwner')}
            </label>
          </fieldset>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                const res = await api<Approved>(`/claims/${id}/approve`, { body: { linkToOwnerId: attachTo || null } })
                setResult(res)
                toast.success(t('claims.approved'))
                router.refresh()
              } catch (e) {
                toast.error((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? t('claims.approving') : t('claims.approve')}
          </Button>
          <ConfirmDialog
            trigger={<Button variant="outline" disabled={busy}>{t('claims.reject')}</Button>}
            title={t('claims.rejectConfirm')}
            confirmLabel={t('claims.reject')}
            onConfirm={async () => {
              try {
                await api(`/claims/${id}/reject`, { body: { reason } })
                toast.success(t('claims.rejected'))
                router.refresh()
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          >
            <FormField id="reason" label={t('claims.rejectReason')}>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </FormField>
          </ConfirmDialog>
        </div>
      </CardContent>
    </Card>
  )
}
