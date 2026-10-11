'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { Choice, Field, FilterBar } from '@/components/panel/inhouse'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/panel/ui/sheet'

export type FilterDef =
  | { kind: 'choice'; name: string; label: string; options: { value: string; label: string }[]; allLabel: string }
  | { kind: 'search'; name: string; label: string }

/**
 * Filters live in the URL (shareable, back button works); screens read them server-side.
 * With many choices (`compactOnPhone`), a phone shows the search, a «Фільтри (N)» button with a bottom sheet,
 * and the active filters as chips, so the list starts on the first screen.
 */
export function UrlFilters({ filters, compactOnPhone = false }: { filters: FilterDef[]; compactOnPhone?: boolean }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const go = (next: URLSearchParams) => start(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }))
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params?.toString())
    if (value) next.set(name, value)
    else next.delete(name)
    next.delete('before')
    next.delete('after')
    go(next)
  }
  const clearAll = () => {
    const next = new URLSearchParams(params?.toString())
    for (const f of filters) if (f.kind === 'choice') next.delete(f.name)
    next.delete('after')
    go(next)
  }

  const choice = (f: Extract<FilterDef, { kind: 'choice' }>, inSheet = false) => (
    <Field key={f.name} label={f.label} htmlFor={`f-${f.name}${inSheet ? '-m' : ''}`}>
      <Choice
        id={`f-${f.name}${inSheet ? '-m' : ''}`}
        value={params?.get(f.name) ?? ''}
        onChange={(v) => set(f.name, v)}
        options={[{ value: '', label: f.allLabel }, ...f.options]}
        className={inSheet ? 'w-full' : 'w-full sm:w-48'}
      />
    </Field>
  )
  const search = (f: Extract<FilterDef, { kind: 'search' }>, suffix = '') => <SearchField key={f.name + suffix} suffix={suffix} def={f} initial={params?.get(f.name) ?? ''} onSet={(v) => set(f.name, v)} />

  const full = (
    <FilterBar className={pending ? 'opacity-70' : undefined}>
      {filters.map((f) => (f.kind === 'choice' ? choice(f) : search(f)))}
    </FilterBar>
  )
  if (!compactOnPhone) return full

  const choices = filters.filter((f): f is Extract<FilterDef, { kind: 'choice' }> => f.kind === 'choice')
  const searches = filters.filter((f): f is Extract<FilterDef, { kind: 'search' }> => f.kind === 'search')
  const active = choices.flatMap((f) => {
    const v = params?.get(f.name)
    const o = v ? f.options.find((x) => x.value === v) : null
    return o ? [{ name: f.name, text: `${f.label}: ${o.label}` }] : []
  })
  return (
    <>
      <div className="hidden md:block">{full}</div>
      <div className={`space-y-3 md:hidden ${pending ? 'opacity-70' : ''}`}>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">{searches.map((f) => search(f, '-m'))}</div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" className="shrink-0" />}>
              <SlidersHorizontal aria-hidden /> {t('filters.open')}
              {active.length ? ` (${active.length})` : ''}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-4">
              <SheetHeader>
                <SheetTitle>{t('filters.title')}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3 px-4">{choices.map((f) => choice(f, true))}</div>
              {active.length > 0 && (
                <SheetFooter>
                  <Button variant="outline" onClick={clearAll}>
                    {t('filters.clear')}
                  </Button>
                </SheetFooter>
              )}
            </SheetContent>
          </Sheet>
        </div>
        {active.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {active.map((a) => (
              <li key={a.name}>
                <button type="button" onClick={() => set(a.name, '')} className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-muted/40 px-3 text-xs">
                  {a.text} <X className="size-3.5" aria-label={t('action.reset')} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function SearchField({ def, initial, onSet, suffix = '' }: { def: { name: string; label: string }; initial: string; onSet: (v: string) => void; suffix?: string }) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (value === initial) return
    const timer = setTimeout(() => onSet(value.trim()), 350)
    return () => clearTimeout(timer)
  }, [value, initial, onSet])
  return (
    <Field label={def.label} htmlFor={`f-${def.name}${suffix}`} className="sm:min-w-72 sm:flex-1">
      <Input id={`f-${def.name}${suffix}`} type="search" value={value} onChange={(e) => setValue(e.target.value)} />
    </Field>
  )
}
