'use client'

import { ExternalLink, History, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Choice, FormField } from '@/components/panel/inhouse'
import { ApiError } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { confidenceOptions, fieldLabel, formatOptions, precisionOptions, studioStatusOptions, typeOptions, visibilityOptions } from '@/components/panel/lib/labels'
import { cn } from '@/components/panel/lib/utils'
import { Button } from '@/components/panel/ui/button'
import { Card } from '@/components/panel/ui/card'
import { Checkbox } from '@/components/panel/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/panel/ui/dialog'
import { Input } from '@/components/panel/ui/input'
import { Label } from '@/components/panel/ui/label'
import { Textarea } from '@/components/panel/ui/textarea'
import type { StudioEdit } from '@/shared/schemas'
import { PriceList, StringList } from './list-editors'
import { MapPreview } from './map-preview'
import { PhotoManager, type PhotoItem } from './photo-manager'

type CityOption = { id: number; name: string }
type Owner = { about: string | null; news: string | null; quote: string | null }
type ConflictInfo = { current: number; changes: Record<string, unknown>; by: string | null }

/** What the editor compares to know whether there is anything to save (the revision is not part of it). */
const fingerprint = (f: StudioEdit, photoIds: number[]) => {
  const { expectedRevision: _r, photoIds: _p, ...rest } = f
  return JSON.stringify({ ...rest, prices: rest.prices.filter((p) => p.text.trim()), photoIds })
}

const SECTIONS = ['basics', 'texts', 'offer', 'formats', 'b2b', 'contacts', 'address', 'photos', 'instagram', 'names', 'publish'] as const
type Section = (typeof SECTIONS)[number]

/** A text box with a live length counter and the voice hint under it. */
function TextBox({ id, label, hint, value, max, soft, rows, onChange }: { id: string; label: string; hint?: string; value: string | null; max: number; soft?: number; rows?: number; onChange: (v: string | null) => void }) {
  const len = value?.length ?? 0
  const over = soft ? len > soft : len > max
  return (
    <FormField id={id} label={label} hint={hint}>
      <Textarea id={id} rows={rows ?? 4} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} maxLength={max} />
      <p className={cn('text-right text-xs tabular-nums', over ? 'text-warning' : 'text-muted-foreground')}>{t('editor.chars', { count: len, max: soft ?? max })}</p>
    </FormField>
  )
}

function Line({ id, label, hint, value, onChange, type, inputMode }: { id: string; label: string; hint?: string; value: string | null; onChange: (v: string | null) => void; type?: string; inputMode?: 'tel' | 'email' | 'url' }) {
  return (
    <FormField id={id} label={label} hint={hint}>
      <Input id={id} type={type} inputMode={inputMode} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="h-9" />
    </FormField>
  )
}

/** Yes / no / not known: b2b facts are often simply unknown, and «not known» must stay distinct from «no». */
function TriState({ id, label, value, onChange }: { id: string; label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <FormField id={id} label={label}>
      <Choice
        id={id}
        value={value === null ? '' : value ? 'yes' : 'no'}
        onChange={(v) => onChange(v === '' ? null : v === 'yes')}
        options={[
          { value: '', label: '—' },
          { value: 'yes', label: t('history.yes') },
          { value: 'no', label: t('history.no') },
        ]}
        className="w-full sm:w-40"
      />
    </FormField>
  )
}

function Block({ id, title, children }: { id: Section; title: string; children: ReactNode }) {
  return (
    <section id={`s-${id}`} aria-labelledby={`h-${id}`} className="scroll-mt-28">
      <Card className="gap-4 p-4 shadow-xs md:p-5">
        <h2 id={`h-${id}`} className="text-base font-semibold">
          {title}
        </h2>
        {children}
      </Card>
    </section>
  )
}

export function StudioEditor({
  studioId,
  initial,
  initialPhotos,
  cities,
  owner,
  revision,
}: {
  studioId: number
  initial: StudioEdit
  initialPhotos: PhotoItem[]
  cities: CityOption[]
  owner: Owner
  revision: number
}) {
  const router = useRouter()
  const [form, setForm] = useState<StudioEdit>(initial)
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos)
  const [base, setBase] = useState(() => fingerprint(initial, initialPhotos.map((p) => p.id)))
  const [rev, setRev] = useState(revision)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)

  const current = useMemo(() => ({ ...form, photoIds: photos.map((p) => p.id), expectedRevision: rev }), [form, photos, rev])
  const dirty = fingerprint(form, current.photoIds) !== base

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof StudioEdit>(key: K, value: StudioEdit[K]) => setForm((f) => ({ ...f, [key]: value }))
  const cityName = cities.find((c) => c.id === form.cityId)?.name

  async function save(overwriteRevision?: number) {
    const payload: StudioEdit = { ...current, expectedRevision: overwriteRevision ?? rev, prices: current.prices.filter((p) => p.text.trim()) }
    // Quick checks here; the server validates everything with the shared schema (zod stays out of this bundle).
    const local: Record<string, string> = {}
    if (!payload.name.trim()) local.name = 'Назва обовʼязкова.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) local.slug = 'Лише латиниця, цифри й дефіси.'
    if (payload.instagramPosts.some((u) => !/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(u))) local.instagramPosts = 'Посилання на пост Instagram (p або reel).'
    if (Object.keys(local).length) {
      setErrors(local)
      const [field, message] = Object.entries(local)[0]!
      toast.error(t('editor.invalid', { field: fieldLabel(field), message }))
      return
    }
    const parsed = { data: payload }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetch(`/api/panel/studios/${studioId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed.data), credentials: 'same-origin' })
      const json = (await res.json().catch(() => null)) as ({ revision?: number; changes?: Record<string, unknown>; error?: unknown } & Partial<ConflictInfo>) | null
      if (res.status === 409 && json) {
        setConflict({ current: json.current!, changes: json.changes ?? {}, by: json.by ?? null })
        return
      }
      if (res.status === 400 && json && typeof (json as { field?: unknown }).field === 'string') {
        const field = (json as { field: string }).field
        setErrors({ [field]: String(json.error) })
        throw new ApiError(400, t('editor.invalid', { field: fieldLabel(field), message: String(json.error) }))
      }
      if (!res.ok || !json) throw new ApiError(res.status, typeof json?.error === 'string' ? json.error : t('error.save'))
      setRev(json.revision!)
      setForm(parsed.data)
      setBase(fingerprint(parsed.data, parsed.data.photoIds))
      toast.success(Object.keys(json.changes ?? {}).length ? t('editor.saved') : t('editor.nothing'))
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function findCoords() {
    if (!cityName) {
      toast.error(t('editor.city'))
      return
    }
    setGeoBusy(true)
    try {
      const res = await fetch('/api/panel/geocode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: form.address, city: cityName, oblast: form.oblast }), credentials: 'same-origin' })
      const json = (await res.json()) as { lat?: number; lng?: number; kind?: 'address' | 'street' | 'settlement'; displayName?: string; error?: string }
      if (!res.ok || json.lat === undefined) throw new Error(json.error ?? t('error.save'))
      setForm((f) => ({ ...f, geoLat: json.lat!, geoLng: json.lng!, geoPrecision: json.kind! }))
      toast.success(t('editor.geoFound', { name: (json.displayName ?? '').split(',').map((x) => x.trim()).filter((x) => !/^\d{5}$/.test(x) && x !== 'Україна').slice(0, 3).join(', ') }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGeoBusy(false)
    }
  }

  const err = (k: keyof StudioEdit) => errors[k]
  const label = (s: Section) => t(`editor.${s}`)

  return (
    <div className="space-y-4 pb-20 md:pb-16">
      <nav aria-label={t('editor.sections')} className="sticky top-14 z-10 -mx-4 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur md:top-0 md:mx-0 md:rounded-lg md:border md:px-2">
        <ul className="flex gap-1 whitespace-nowrap md:flex-wrap">
          {SECTIONS.map((s) => (
            <li key={s}>
              <a href={`#s-${s}`} className="inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {label(s)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Block id="basics" title={label('basics')}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="name" label={t('editor.name')} error={err('name')}>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} className="h-9" aria-invalid={Boolean(err('name'))} />
          </FormField>
          <FormField id="slug" label={t('editor.slug')} hint={t('editor.slugHint')} error={err('slug')}>
            <Input id="slug" value={form.slug} onChange={(e) => set('slug', e.target.value.trim().toLowerCase())} className="h-9 font-mono" aria-invalid={Boolean(err('slug'))} />
          </FormField>
          <FormField id="type" label={t('editor.type')}>
            <Choice id="type" value={form.type ?? ''} onChange={(v) => set('type', (v || null) as StudioEdit['type'])} options={[{ value: '', label: '—' }, ...typeOptions]} className="w-full" />
          </FormField>
          <FormField id="cityId" label={t('editor.city')}>
            <Choice
              id="cityId"
              value={form.cityId ? String(form.cityId) : ''}
              onChange={(v) => set('cityId', v ? Number(v) : null)}
              options={[{ value: '', label: t('editor.noCity') }, ...cities.map((c) => ({ value: String(c.id), label: c.name }))]}
              className="w-full"
            />
          </FormField>
          <Line id="oblast" label={t('editor.oblast')} value={form.oblast} onChange={(v) => set('oblast', v)} />
        </div>
      </Block>

      <Block id="texts" title={label('texts')}>
        <TextBox id="summary" label={t('editor.summary')} hint={t('editor.summaryHint')} value={form.summary} max={200} soft={160} rows={2} onChange={(v) => set('summary', v)} />
        <TextBox id="publicDescription" label={t('editor.publicDescription')} hint={t('editor.publicDescriptionHint')} value={form.publicDescription} max={8000} rows={8} onChange={(v) => set('publicDescription', v)} />
        <TextBox id="recentNote" label={t('editor.recentNote')} hint={t('editor.recentNoteHint')} value={form.recentNote} max={1000} rows={2} onChange={(v) => set('recentNote', v)} />
        <TextBox id="descriptionInternal" label={t('editor.descriptionInternal')} hint={t('editor.descriptionInternalHint')} value={form.descriptionInternal} max={20000} rows={4} onChange={(v) => set('descriptionInternal', v)} />
        {(owner.about || owner.news || owner.quote) && (
          <div className="space-y-2 rounded-lg border border-dashed p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">{t('editor.ownerText')}</p>
            {owner.about && <p className="whitespace-pre-line">{owner.about}</p>}
            {owner.news && <p className="whitespace-pre-line text-muted-foreground">{owner.news}</p>}
            {owner.quote && (
              <label className="flex items-start gap-2">
                <Checkbox checked={Boolean(form.ownerQuoteApproved)} onCheckedChange={(v) => set('ownerQuoteApproved', Boolean(v))} />
                <span>
                  «{owner.quote}» — {t('editor.ownerQuoteApproved')}
                </span>
              </label>
            )}
          </div>
        )}
      </Block>

      <Block id="offer" title={label('offer')}>
        <div className="space-y-1.5">
          <Label htmlFor="services">{t('editor.services')}</Label>
          <StringList id="services" value={form.services} onChange={(v) => set('services', v)} placeholder={t('editor.services')} max={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="products">{t('editor.products')}</Label>
          <StringList id="products" value={form.products} onChange={(v) => set('products', v)} placeholder={t('editor.products')} max={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price-0">{t('editor.prices')}</Label>
          <PriceList value={form.prices} onChange={(v) => set('prices', v)} />
          {err('prices') && <p className="text-xs text-destructive">{err('prices')}</p>}
        </div>
      </Block>

      <Block id="formats" title={label('formats')}>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {formatOptions.map((o) => (
            <label key={o.value} className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={form.formats.includes(o.value)}
                onCheckedChange={(v) => set('formats', v ? [...form.formats, o.value] : form.formats.filter((f) => f !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      </Block>

      <Block id="b2b" title={label('b2b')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Line id="b2bMinOrder" label={t('editor.minOrder')} value={form.b2bMinOrder} onChange={(v) => set('b2bMinOrder', v)} />
          <Line id="b2bLeadTime" label={t('editor.leadTime')} value={form.b2bLeadTime} onChange={(v) => set('b2bLeadTime', v)} />
          <TriState id="b2bFoodSafe" label={t('editor.foodSafe')} value={form.b2bFoodSafe} onChange={(v) => set('b2bFoodSafe', v)} />
          <TriState id="b2bDishwasherSafe" label={t('editor.dishwasherSafe')} value={form.b2bDishwasherSafe} onChange={(v) => set('b2bDishwasherSafe', v)} />
          <TriState id="b2bWorksWithHoreca" label={t('editor.worksWithHoreca')} value={form.b2bWorksWithHoreca} onChange={(v) => set('b2bWorksWithHoreca', v)} />
          <TriState id="b2bWorksWithCorporate" label={t('editor.worksWithCorporate')} value={form.b2bWorksWithCorporate} onChange={(v) => set('b2bWorksWithCorporate', v)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b2bLogoMethods">{t('editor.logoMethods')}</Label>
          <StringList id="b2bLogoMethods" value={form.b2bLogoMethods} onChange={(v) => set('b2bLogoMethods', v)} placeholder={t('editor.logoMethods')} max={10} />
        </div>
      </Block>

      <Block id="contacts" title={label('contacts')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Line id="instagram" label={t('editor.instagramField')} value={form.instagram} onChange={(v) => set('instagram', v)} inputMode="url" />
          <Line id="website" label={t('editor.website')} value={form.website} onChange={(v) => set('website', v)} inputMode="url" />
          <Line id="facebook" label={t('editor.facebook')} value={form.facebook} onChange={(v) => set('facebook', v)} inputMode="url" />
          <Line id="phone" label={t('editor.phone')} value={form.phone} onChange={(v) => set('phone', v)} type="tel" inputMode="tel" />
          <Line id="email" label={t('editor.email')} value={form.email} onChange={(v) => set('email', v)} type="email" inputMode="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salesChannels">{t('editor.salesChannels')}</Label>
          <StringList id="salesChannels" value={form.salesChannels} onChange={(v) => set('salesChannels', v)} placeholder={t('editor.salesChannels')} max={40} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="otherLinks">{t('editor.otherLinks')}</Label>
          <StringList id="otherLinks" value={form.otherLinks} onChange={(v) => set('otherLinks', v)} placeholder="https://" max={40} />
        </div>
      </Block>

      <Block id="address" title={label('address')}>
        <Line id="address" label={t('editor.addressField')} hint={t('editor.addressHint')} value={form.address} onChange={(v) => set('address', v)} />
        <div className="flex flex-wrap items-end gap-3">
          <Button type="button" variant="outline" onClick={findCoords} disabled={geoBusy}>
            <MapPin />
            {geoBusy ? t('editor.geocoding') : t('editor.geocode')}
          </Button>
          <FormField id="geoPrecision" label={t('editor.precision')}>
            <Choice id="geoPrecision" value={form.geoPrecision ?? ''} onChange={(v) => set('geoPrecision', (v || null) as StudioEdit['geoPrecision'])} options={[{ value: '', label: '—' }, ...precisionOptions]} className="w-44" />
          </FormField>
          <FormField id="geoLat" label={t('editor.lat')}>
            <Input id="geoLat" inputMode="decimal" value={form.geoLat ?? ''} onChange={(e) => set('geoLat', e.target.value === '' ? null : Number(e.target.value))} className="h-9 w-32 tabular-nums" />
          </FormField>
          <FormField id="geoLng" label={t('editor.lng')}>
            <Input id="geoLng" inputMode="decimal" value={form.geoLng ?? ''} onChange={(e) => set('geoLng', e.target.value === '' ? null : Number(e.target.value))} className="h-9 w-32 tabular-nums" />
          </FormField>
        </div>
        {form.geoLat !== null && form.geoLng !== null && !Number.isNaN(form.geoLat) && !Number.isNaN(form.geoLng) ? (
          <MapPreview lat={form.geoLat} lng={form.geoLng} onMove={(lat, lng) => setForm((f) => ({ ...f, geoLat: lat, geoLng: lng, geoPrecision: 'address' }))} />
        ) : (
          <p className="text-xs text-muted-foreground">{t('editor.noCoords')}</p>
        )}
      </Block>

      <Block id="photos" title={label('photos')}>
        <PhotoManager value={photos} onChange={setPhotos} studioSlug={form.slug} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <Checkbox checked={Boolean(form.consentPhotos)} onCheckedChange={(v) => set('consentPhotos', Boolean(v))} />
            {t('editor.consentPhotos')}
          </label>
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <Checkbox checked={Boolean(form.consentRequests)} onCheckedChange={(v) => set('consentRequests', Boolean(v))} />
            {t('editor.consentRequests')}
          </label>
        </div>
        <TextBox id="consentNotes" label={t('editor.consentNotes')} value={form.consentNotes} max={2000} rows={2} onChange={(v) => set('consentNotes', v)} />
      </Block>

      <Block id="instagram" title={label('instagram')}>
        <p className="text-xs text-muted-foreground">{t('editor.instagramPostsHint')}</p>
        <StringList id="instagramPosts" value={form.instagramPosts} onChange={(v) => set('instagramPosts', v)} placeholder="https://www.instagram.com/p/…" max={3} />
        {err('instagramPosts') && <p className="text-xs text-destructive">{err('instagramPosts')}</p>}
      </Block>

      <Block id="names" title={label('names')}>
        <div className="space-y-1.5">
          <Label htmlFor="alternateNames">{t('editor.alternateNames')}</Label>
          <StringList id="alternateNames" value={form.alternateNames} onChange={(v) => set('alternateNames', v)} placeholder={t('editor.alternateNames')} max={30} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sources">{t('editor.sources')}</Label>
          <StringList id="sources" value={form.sources} onChange={(v) => set('sources', v)} placeholder="https://" max={80} />
        </div>
      </Block>

      <Block id="publish" title={label('publish')}>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField id="visibility" label={t('editor.visibility')}>
            <Choice id="visibility" value={form.visibility} onChange={(v) => set('visibility', v as StudioEdit['visibility'])} options={visibilityOptions} className="w-full" />
          </FormField>
          <FormField id="status" label={t('editor.status')}>
            <Choice id="status" value={form.status ?? ''} onChange={(v) => set('status', (v || null) as StudioEdit['status'])} options={[{ value: '', label: '—' }, ...studioStatusOptions]} className="w-full" />
          </FormField>
          <FormField id="confidence" label={t('editor.confidence')}>
            <Choice id="confidence" value={form.confidence ?? ''} onChange={(v) => set('confidence', (v || null) as StudioEdit['confidence'])} options={[{ value: '', label: '—' }, ...confidenceOptions]} className="w-full" />
          </FormField>
        </div>
      </Block>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t bg-card/95 px-4 py-2.5 backdrop-blur md:sticky md:bottom-0 md:mx-0 md:rounded-lg md:border">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className={cn('min-w-0 flex-1 truncate text-xs', dirty ? 'text-warning' : 'text-muted-foreground')}>{dirty ? t('editor.unsaved') : t('editor.revision', { n: rev })}</span>
          <Link href={`/panel/studii/${studioId}/istoriia`} className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex">
            <History className="size-3.5" />
            {t('studios.history')}
          </Link>
          <a href={`/vyrobnyky/${initial.slug}`} target="_blank" rel="noopener" className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex">
            <ExternalLink className="size-3.5" />
            {t('studios.open')}
          </a>
          <Button type="button" onClick={() => save()} disabled={saving || !dirty}>
            {saving ? t('action.saving') : t('action.save')}
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(conflict)} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editor.conflictTitle')}</DialogTitle>
            <DialogDescription>{t('editor.conflictBody', { by: conflict?.by ?? t('editor.conflictSomeone') })}</DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {Object.keys(conflict?.changes ?? {}).map((k) => (
              <li key={k}>{fieldLabel(k)}</li>
            ))}
          </ul>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" onClick={() => window.location.reload()}>
              {t('editor.conflictReload')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const r = conflict!.current
                setConflict(null)
                setRev(r)
                void save(r)
              }}
            >
              {t('editor.conflictOverwrite')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConflict(null)}>
              {t('editor.conflictKeep')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
