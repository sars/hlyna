'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormField } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Checkbox } from '@/components/panel/ui/checkbox'
import { Input } from '@/components/panel/ui/input'
import { SLUG_RE } from '@/shared/options'

export type CityValue = { name: string; slug: string; oblast: string | null; locative: string | null; population: number | null; isOver100k: boolean | null }


/** One city: create (id absent) or edit. A slug change is allowed; the old slug keeps redirecting. */
export function CityForm({ id, initial }: { id?: number; initial: CityValue }) {
  const router = useRouter()
  const [v, setV] = useState<CityValue>(initial)
  const [busy, setBusy] = useState(false)
  const slugError = v.slug && !SLUG_RE.test(v.slug) ? t('editor.slugHint') : undefined
  const set = <K extends keyof CityValue>(k: K, val: CityValue[K]) => setV((x) => ({ ...x, [k]: val }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!v.name.trim() || !SLUG_RE.test(v.slug)) return
    setBusy(true)
    try {
      if (id) {
        await api(`/cities/${id}`, { method: 'PUT', body: v })
        toast.success(t('editor.saved'))
        router.refresh()
      } else {
        const r = await api<{ id: number }>('/cities', { body: v })
        toast.success(t('cities.created'))
        router.push(`/panel/mista/${r.id}`)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <FormField id="c-name" label={t('cities.name')}>
        <Input id="c-name" value={v.name} onChange={(e) => set('name', e.target.value)} required className="h-9" />
      </FormField>
      <FormField id="c-slug" label={t('cities.slug')} hint={id ? t('cities.slugHint') : undefined} error={slugError}>
        <Input id="c-slug" value={v.slug} onChange={(e) => set('slug', e.target.value.trim().toLowerCase())} required className="h-9 font-mono" />
      </FormField>
      <FormField id="c-locative" label={t('cities.locative')} hint={t('cities.locativeHint')}>
        <Input id="c-locative" value={v.locative ?? ''} onChange={(e) => set('locative', e.target.value || null)} className="h-9" />
      </FormField>
      <FormField id="c-oblast" label={t('cities.oblast')}>
        <Input id="c-oblast" value={v.oblast ?? ''} onChange={(e) => set('oblast', e.target.value || null)} className="h-9" />
      </FormField>
      <FormField id="c-pop" label={t('cities.population')}>
        <Input id="c-pop" inputMode="numeric" value={v.population ?? ''} onChange={(e) => set('population', e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null)} className="h-9 tabular-nums" />
      </FormField>
      <label className="flex min-h-9 items-center gap-2 self-end text-sm">
        <Checkbox checked={Boolean(v.isOver100k)} onCheckedChange={(c) => set('isOver100k', Boolean(c))} />
        {t('cities.over100k')}
      </label>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy || Boolean(slugError) || !v.name.trim()}>
          {busy ? t('action.saving') : t('action.save')}
        </Button>
      </div>
    </form>
  )
}
