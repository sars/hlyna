'use client'

import { Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { FilePick } from './file-pick'

/** Upload a photo to the library (not attached to any profile yet). */
export function MediaUpload() {
  const router = useRouter()
  const file = useRef<HTMLInputElement>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  async function upload() {
    const f = file.current?.files?.[0]
    if (!f || !alt.trim()) {
      toast.error(t('editor.alt'))
      return
    }
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', f)
      body.set('alt', alt.trim())
      const res = await fetch('/api/panel/media', { method: 'POST', body, credentials: 'same-origin' })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? t('error.save'))
      setAlt('')
      if (file.current) file.current.value = ''
      toast.success(t('editor.saved'))
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
      <FilePick ref={file} accept="image/jpeg,image/png,image/webp" />
      <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={t('editor.alt')} aria-label={t('editor.alt')} className="h-9" />
      <Button type="button" variant="outline" onClick={upload} disabled={busy}>
        <Upload />
        {busy ? t('editor.uploading') : t('media.upload')}
      </Button>
    </div>
  )
}

/** One photo in the library: its alt (saved on blur) and, for admins, delete when no profile uses it. */
export function MediaCard({ id, src, alt, info, usage, canDelete }: { id: number; src: string; alt: string | null; info: string; usage: string; canDelete: boolean }) {
  const router = useRouter()
  return (
    <figure className="flex flex-col gap-2 rounded-lg border bg-card p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- panel thumbnails from the media volume */}
      <img src={src} alt="" className="aspect-square w-full rounded-md object-cover" loading="lazy" />
      <Input
        aria-label={t('editor.alt')}
        defaultValue={alt ?? ''}
        placeholder={t('editor.alt')}
        className="h-8 text-xs"
        onBlur={async (e) => {
          const next = e.target.value.trim()
          if (next === (alt ?? '')) return
          try {
            await api(`/media/${id}`, { method: 'PATCH', body: { alt: next } })
            toast.success(t('editor.saved'))
          } catch (err) {
            toast.error((err as Error).message)
          }
        }}
      />
      <figcaption className="text-[11px] leading-snug text-muted-foreground">
        {info}
        <br />
        {usage}
      </figcaption>
      {canDelete && (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="sm" className="self-start text-destructive">
              <Trash2 />
              {t('media.delete')}
            </Button>
          }
          title={t('media.deleteTitle')}
          body={t('media.deleteBody')}
          confirmLabel={t('media.delete')}
          destructive
          onConfirm={async () => {
            try {
              await api(`/media/${id}`, { method: 'DELETE' })
              toast.success(t('media.deleted'))
              router.refresh()
            } catch (err) {
              toast.error((err as Error).message)
            }
          }}
        />
      )}
    </figure>
  )
}
