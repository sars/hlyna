'use client'

import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { t } from '@/components/panel/lib/i18n'
import { cn } from '@/components/panel/lib/utils'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'

/** Moves one item of a list (immutable). */
export const move = <T,>(xs: T[], from: number, to: number) => {
  if (to < 0 || to >= xs.length || from === to) return xs
  const next = [...xs]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/**
 * Ordered rows with drag (pointer, desktop) and «вище/нижче» buttons (phone, keyboard). The order matters on the
 * site (first service is the one shown on cards), so both ways stay.
 */
export function OrderedRows<T>({
  items,
  onChange,
  render,
  empty,
  label,
}: {
  items: T[]
  onChange: (next: T[]) => void
  render: (item: T, i: number, set: (v: T) => void) => ReactNode
  empty?: ReactNode
  label: string
}) {
  const dragFrom = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  if (!items.length) return <p className="text-xs text-muted-foreground">{empty ?? t('history.empty')}</p>
  return (
    <ol className="space-y-2" aria-label={label}>
      {items.map((item, i) => (
        <li
          key={i}
          draggable
          onDragStart={(e) => {
            dragFrom.current = i
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(i)
          }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => {
            e.preventDefault()
            if (dragFrom.current !== null) onChange(move(items, dragFrom.current, i))
            dragFrom.current = null
            setOver(null)
          }}
          className={cn('flex items-start gap-1.5 rounded-lg', over === i && 'ring-2 ring-primary/40')}
        >
          <GripVertical className="mt-2 hidden size-4 shrink-0 cursor-grab text-muted-foreground md:block" aria-hidden />
          <div className="min-w-0 flex-1">{render(item, i, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}</div>
          <div className="flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))} aria-label={t('editor.moveUp')}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))} aria-label={t('editor.moveDown')}>
              <ArrowDown />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t('editor.remove')}>
              <X />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** A list of short strings (services, products, links, other names). */
export function StringList({ id, value, onChange, placeholder, max }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <OrderedRows
        label={placeholder ?? id}
        items={value}
        onChange={onChange}
        render={(item, i, set) => <Input id={`${id}-${i}`} value={item} onChange={(e) => set(e.target.value)} className="h-9" />}
      />
      {(max === undefined || value.length < max) && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className="h-9"
          />
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus />
            {t('editor.add')}
          </Button>
        </div>
      )}
    </div>
  )
}

export type PriceRow = { text: string; source?: string | null; dateText?: string | null }

/** Price lines: what and how much, where we read it, and when (the site shows the date beside the price). */
export function PriceList({ value, onChange }: { value: PriceRow[]; onChange: (v: PriceRow[]) => void }) {
  return (
    <div className="space-y-2">
      <OrderedRows
        label={t('editor.prices')}
        items={value}
        onChange={onChange}
        render={(p, i, set) => (
          <div className="grid gap-1.5 sm:grid-cols-[1fr_9rem_7rem]">
            <Input aria-label={t('editor.priceText')} placeholder={t('editor.priceText')} value={p.text} onChange={(e) => set({ ...p, text: e.target.value })} className="h-9" id={`price-${i}`} />
            <Input aria-label={t('editor.priceSource')} placeholder={t('editor.priceSource')} value={p.source ?? ''} onChange={(e) => set({ ...p, source: e.target.value || null })} className="h-9" />
            <Input aria-label={t('editor.priceDate')} placeholder="10.2026" value={p.dateText ?? ''} onChange={(e) => set({ ...p, dateText: e.target.value || null })} className="h-9" />
          </div>
        )}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { text: '', source: null, dateText: null }])}>
        <Plus />
        {t('editor.addLine')}
      </Button>
    </div>
  )
}
