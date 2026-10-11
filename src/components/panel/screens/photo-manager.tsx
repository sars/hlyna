'use client'

import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { FilePick } from './file-pick'
import { OrderedRows } from './list-editors'

export type PhotoItem = { id: number; fileName: string; alt: string | null; thumb: string | null; status?: string }

const src = (p: PhotoItem) => `/media/${encodeURIComponent(p.thumb ?? p.fileName)}`

/**
 * The profile's photos in order (the first is the hero). Uploading stores the file at once (sharp sizes, no EXIF)
 * and adds it to this form; the profile changes only when the form is saved. Alt text is saved on the photo itself.
 */
export function PhotoManager({ value, onChange, studioSlug }: { value: PhotoItem[]; onChange: (v: PhotoItem[]) => void; studioSlug: string }) {
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const [pickKey, setPickKey] = useState(0)

  async function upload() {
    const f = file.current?.files?.[0]
    if (!f) return
    if (!alt.trim()) {
      toast.error(t('editor.alt'))
      return
    }
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', f)
      body.set('alt', alt.trim())
      body.set('studioSlug', studioSlug)
      const res = await fetch('/api/panel/media', { method: 'POST', body, credentials: 'same-origin' })
      const json = (await res.json()) as { id?: number; error?: string }
      if (!res.ok || !json.id) throw new Error(json.error ?? t('error.save'))
      if (!value.some((p) => p.id === json.id)) {
        const meta = await fetch(`/api/panel/media/${json.id}`, { credentials: 'same-origin' }).then((r) => r.json() as Promise<PhotoItem>)
        onChange([...value, meta])
      }
      setAlt('')
      if (file.current) file.current.value = ''
      setPickKey((k) => k + 1) // the picker forgets the uploaded file's name
      toast.success(t('editor.photoAdded'))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function saveAlt(p: PhotoItem, next: string) {
    if ((p.alt ?? '') === next.trim()) return
    try {
      await api(`/media/${p.id}`, { method: 'PATCH', body: { alt: next } })
      toast.success(t('editor.saved'))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('editor.photosHint')}</p>
      <OrderedRows
        label={t('editor.photos')}
        items={value}
        onChange={onChange}
        render={(p, i, set) => (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- panel thumbnails from the media volume */}
            <img src={src(p)} alt="" className="size-16 shrink-0 rounded-md border object-cover" loading="lazy" />
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                aria-label={t('editor.alt')}
                placeholder={t('editor.alt')}
                defaultValue={p.alt ?? ''}
                onBlur={(e) => {
                  set({ ...p, alt: e.target.value })
                  void saveAlt(p, e.target.value)
                }}
                className="h-9"
              />
              <p className="truncate text-xs text-muted-foreground">
                {i === 0 ? '★ ' : ''}
                {p.fileName}
              </p>
            </div>
          </div>
        )}
      />
      <div className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <FilePick key={pickKey} ref={file} accept="image/jpeg,image/png,image/webp" />
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={t('editor.alt')} aria-label={t('editor.alt')} className="h-9" />
        <Button type="button" variant="outline" onClick={upload} disabled={busy}>
          <Upload />
          {busy ? t('editor.uploading') : t('editor.upload')}
        </Button>
      </div>
    </div>
  )
}
