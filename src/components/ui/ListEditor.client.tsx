'use client'

import React, { useEffect, useRef, useState } from 'react'

import type { PriceLine } from '@/shared/kabinet'

import { Button } from './Button'

/** A textarea that grows with its text (a price line is not cut off), never below the box's own minimum. */
function GrowTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [props.value])
  return <textarea ref={ref} {...props} />
}

const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень']

/** The last 12 months, newest first, as «жовтень 2026» (the date text a price stores). Kyiv time, so server and browser agree. */
function monthOptions(): string[] {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', year: 'numeric', month: 'numeric' }).formatToParts(new Date())
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  return Array.from({ length: 12 }, (_, k) => {
    const total = year * 12 + month - k
    return `${MONTHS[((total % 12) + 12) % 12]} ${Math.floor(total / 12)}`
  })
}

type Common = {
  /** Prefix of the row ids: `${id}-${row}` (text) or `${id}-${row}-text` / `-date` (price). */
  id: string
  /** The group title, e.g. «Послуги · 7». */
  heading: React.ReactNode
  /** One line under the title: how to fill the list. */
  hint?: string
  addLabel: string
  max?: number
  placeholder?: string
  /** What a row is called for the «×» label when it is empty: «послуга», «пост». */
  noun: string
  /** Row messages by index, shown under the row. */
  errors?: (string | undefined)[]
}
type TextProps = Common & { kind?: 'text'; items: string[]; onChange: (items: string[]) => void; inputMode?: 'url' | 'text' }
type PriceProps = Common & { kind: 'price'; items: PriceLine[]; onChange: (items: PriceLine[]) => void; inputMode?: never }

// A list of values, one box per row with «×», «+ Додати …» below. Prices carry a month («Коли актуально»); a new row gets the
// current month. Empty rows are dropped by the form on save; the list always shows at least one row.
export function ListEditor(props: TextProps | PriceProps) {
  const { id, heading, hint, addLabel, max, placeholder, noun, errors } = props
  const price = props.kind === 'price'
  const months = monthOptions()
  const blank = (): string | PriceLine => (price ? { text: '', date: months[0], source: '' } : '')
  const items = props.items as (string | PriceLine)[]
  const rows = items.length ? items : [blank()]
  // A stable key per row, so a removed row does not hand its focus and text to the next one.
  const [ids, setIds] = useState<number[]>(() => rows.map((_, i) => i))
  const [nextId, setNextId] = useState(rows.length)
  if (ids.length !== rows.length) {
    // The list changed from outside (a draft was restored, a save returned fewer rows).
    const grow = Math.max(0, rows.length - ids.length)
    setIds([...ids.slice(0, rows.length), ...Array.from({ length: grow }, (_, k) => nextId + k)])
    setNextId(nextId + grow)
  }
  const focusId = useRef<string | null>(null)
  useEffect(() => {
    const el = focusId.current ? document.getElementById(focusId.current) : null
    focusId.current = null
    if (el) (el.matches('button, input, textarea, select') ? el : el.querySelector('button'))?.focus()
  })

  const rowId = (i: number) => (price ? `${id}-${i}-text` : `${id}-${i}`)
  const commit = (next: (string | PriceLine)[]) => (props.onChange as (v: (string | PriceLine)[]) => void)(next)
  const textOf = (r: string | PriceLine) => (typeof r === 'string' ? r : r.text)
  const setAt = (i: number, value: string | PriceLine) => commit(rows.map((r, k) => (k === i ? value : r)))
  const insertAfter = (i: number) => {
    if (max && rows.length >= max) return
    setIds([...ids.slice(0, i + 1), nextId, ...ids.slice(i + 1)])
    setNextId(nextId + 1)
    focusId.current = rowId(i + 1)
    const next = rows.slice()
    next.splice(i + 1, 0, blank())
    commit(next)
  }
  const removeAt = (i: number) => {
    setIds(ids.filter((_, k) => k !== i))
    focusId.current = i > 0 ? rowId(i - 1) : rows.length > 1 ? rowId(0) : `${id}-add`
    commit(rows.filter((_, k) => k !== i))
  }
  const canAdd = !max || rows.length < max

  return (
    <div className="ui-list" data-kind={price ? 'price' : undefined}>
      <h2 className="ui-list-h">
        {heading}
        {price && (
          <span className="ui-list-hd" aria-hidden>
            Коли актуально
          </span>
        )}
      </h2>
      {hint && <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.4] text-ink-2">{hint}</p>}
      <div role="list" className="grid gap-2" style={price ? { gap: 0 } : undefined}>
        {rows.map((r, i) => {
          const text = textOf(r)
          const err = errors?.[i]
          const errId = err ? `${rowId(i)}-err` : undefined
          const errNode = err && (
            <span className="ui-error text-[13.5px] leading-[1.4]" id={errId} role="alert">
              {err}
            </span>
          )
          const label = text.trim() ? `Прибрати: ${text.trim()}` : `Прибрати ${noun} ${i + 1}`
          return (
            <div key={ids[i] ?? i} role="listitem" className="grid gap-1.5">
              <div className="ui-list-r">
                {price ? (
                  <>
                    <div className="ui-pr-t grid gap-1.5">
                      <GrowTextarea
                        id={rowId(i)}
                        className="ui-box"
                        rows={2}
                        value={text}
                        placeholder={placeholder}
                        aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} ${i + 1}`}
                        aria-invalid={err ? true : undefined}
                        aria-describedby={errId}
                        onChange={(e) => setAt(i, { ...(r as PriceLine), text: e.target.value })}
                      />
                      {errNode}
                    </div>
                    <div className="ui-pr-d">
                      <label htmlFor={`${id}-${i}-date`} className="ui-pr-l">
                        Коли актуально
                      </label>
                      <select
                        id={`${id}-${i}-date`}
                        className="ui-box"
                        aria-label={`Коли актуально: ${noun} ${i + 1}`}
                        value={(r as PriceLine).date}
                        onChange={(e) => setAt(i, { ...(r as PriceLine), date: e.target.value })}
                      >
                        {months.map((m, k) => (
                          <option key={m} value={m}>
                            {k === 0 ? `${m} (зараз)` : m}
                          </option>
                        ))}
                        <option value="">місяць не вказано</option>
                        {(r as PriceLine).date && !months.includes((r as PriceLine).date) && <option value={(r as PriceLine).date}>{(r as PriceLine).date}</option>}
                      </select>
                    </div>
                  </>
                ) : (
                  <input
                    id={rowId(i)}
                    className="ui-box"
                    value={text}
                    placeholder={placeholder}
                    inputMode={props.inputMode}
                    autoComplete="off"
                    aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} ${i + 1}`}
                    aria-invalid={err ? true : undefined}
                    aria-describedby={errId}
                    onChange={(e) => setAt(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (text.trim()) insertAfter(i)
                      }
                    }}
                  />
                )}
                <button type="button" className="ui-x" aria-label={label} onClick={() => removeAt(i)}>
                  ×
                </button>
              </div>
              {!price && errNode}
            </div>
          )
        })}
      </div>
      {canAdd && (
        <div className="ui-add" id={`${id}-add`}>
          <Button variant="ghost" size="sm" onClick={() => insertAfter(rows.length - 1)}>
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
