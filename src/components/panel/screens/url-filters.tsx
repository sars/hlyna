'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { Choice, Field, FilterBar } from '@/components/panel/inhouse'
import { Input } from '@/components/panel/ui/input'

export type FilterDef =
  | { kind: 'choice'; name: string; label: string; options: { value: string; label: string }[]; allLabel: string }
  | { kind: 'search'; name: string; label: string }

/** Filters live in the URL (shareable, back button works); screens read them server-side. */
export function UrlFilters({ filters }: { filters: FilterDef[] }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params?.toString())
    if (value) next.set(name, value)
    else next.delete(name)
    next.delete('before')
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }))
  }
  return (
    <FilterBar className={pending ? 'opacity-70' : undefined}>
      {filters.map((f) =>
        f.kind === 'choice' ? (
          <Field key={f.name} label={f.label} htmlFor={`f-${f.name}`}>
            <Choice
              id={`f-${f.name}`}
              value={params?.get(f.name) ?? ''}
              onChange={(v) => set(f.name, v)}
              options={[{ value: '', label: f.allLabel }, ...f.options]}
              className="w-full sm:w-48"
            />
          </Field>
        ) : (
          <SearchField key={f.name} def={f} initial={params?.get(f.name) ?? ''} onSet={(v) => set(f.name, v)} />
        ),
      )}
    </FilterBar>
  )
}

function SearchField({ def, initial, onSet }: { def: { name: string; label: string }; initial: string; onSet: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (value === initial) return
    const timer = setTimeout(() => onSet(value.trim()), 350)
    return () => clearTimeout(timer)
  }, [value, initial, onSet])
  return (
    <Field label={def.label} htmlFor={`f-${def.name}`} className="sm:min-w-72 sm:flex-1">
      <Input id={`f-${def.name}`} type="search" value={value} onChange={(e) => setValue(e.target.value)} />
    </Field>
  )
}
