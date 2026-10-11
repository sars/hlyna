'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { fieldLabel } from '@/components/panel/lib/labels'
import { Button } from '@/components/panel/ui/button'

type Changes = Record<string, { from: unknown; to: unknown }>

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return t('history.empty')
  if (typeof v === 'boolean') return v ? t('history.yes') : t('history.no')
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? (x as { text?: string }).text ?? JSON.stringify(x) : String(x))).join('; ')
  const s = String(v)
  return s.length > 240 ? `${s.slice(0, 240)}…` : s
}

/** One revision: who and when, what it changed (loaded on demand), and «restore». */
export function RevisionRow({ studioId, revisionId, revision, when, who, note, current, currentRevision }: { studioId: number; revisionId: number; revision: number; when: string; who: string | null; note: string | null; current: boolean; currentRevision: number }) {
  const router = useRouter()
  const [changes, setChanges] = useState<Changes | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (changes) return setChanges(null)
    setBusy(true)
    try {
      const r = await api<{ changes: Changes }>(`/studios/${studioId}/revisions/${revisionId}`)
      setChanges(r.changes)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium">{t('editor.revision', { n: revision })}</span>
        <span className="text-xs text-muted-foreground">
          {when}
          {who ? ` · ${who}` : ''}
          {note ? ` · ${note}` : ''}
        </span>
        <span className="ml-auto flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={load} disabled={busy}>
            {t('revisions.show')}
          </Button>
          {!current && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" size="sm">
                  {t('revisions.restore')}
                </Button>
              }
              title={t('revisions.restoreTitle', { n: revision })}
              body={t('revisions.restoreBody')}
              confirmLabel={t('revisions.restore')}
              onConfirm={async () => {
                try {
                  await api(`/studios/${studioId}/restore`, { body: { revisionId, expectedRevision: currentRevision } })
                  toast.success(t('revisions.restored'))
                  router.refresh()
                } catch (e) {
                  toast.error((e as Error).message)
                }
              }}
            />
          )}
        </span>
      </div>
      {changes && (
        Object.keys(changes).length ? (
          <dl className="grid gap-2 rounded-md bg-muted/40 p-3 text-xs">
            {Object.entries(changes).map(([k, v]) => (
              <div key={k} className="grid gap-0.5 sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium">{fieldLabel(k)}</dt>
                <dd className="min-w-0 break-words">
                  <span className="text-muted-foreground line-through">{show(v.from)}</span> → <span>{show(v.to)}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">{t('revisions.noChanges')}</p>
        )
      )}
    </div>
  )
}
