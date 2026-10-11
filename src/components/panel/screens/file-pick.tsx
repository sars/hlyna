'use client'

import { ImagePlus } from 'lucide-react'
import { forwardRef, useState } from 'react'

import { t } from '@/components/panel/lib/i18n'

/** The browser's file input speaks the browser's language («Choose File»); this one speaks Ukrainian. */
export const FilePick = forwardRef<HTMLInputElement, { accept: string }>(function FilePick({ accept }, ref) {
  const [name, setName] = useState('')
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 text-sm hover:bg-muted">
      <ImagePlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium">{t('editor.chooseFile')}</span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">{name || t('editor.noFile')}</span>
      <input ref={ref} type="file" accept={accept} className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? '')} />
    </label>
  )
})
