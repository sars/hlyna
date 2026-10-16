'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'
import { SaveBar } from '@/components/ui/SaveBar'
import type { SaveError, SaveOk, SectionExtras, SectionValues } from '@/shared/kabinet'

import { fieldId, formatTime, formatWhen, plural } from './format'
import { SectionFields, type Errors, type TextSection, type TextValues } from './SectionFields.client'
import { useStudio } from './StudioFrame.client'

const DRAFT_DAYS = 7
const draftKey = (slug: string, section: string) => `hlyna:kabinet:draft:${slug}:${section}`

type Draft = { t: number; v: TextValues }
const readRaw = (slug: string, section: string): string | null => {
  try {
    return window.localStorage.getItem(draftKey(slug, section))
  } catch {
    return null
  }
}
function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Draft
    return d && typeof d.t === 'number' && d.v && Date.now() - d.t <= DRAFT_DAYS * 86_400_000 ? d : null
  } catch {
    return null
  }
}
const noSubscription = () => () => undefined
// What was in the browser when the section opened: our own later writes must not turn into «a draft from earlier».
const offered = new Map<string, string | null>()
function writeDraft(slug: string, section: string, v: TextValues) {
  try {
    window.localStorage.setItem(draftKey(slug, section), JSON.stringify({ t: Date.now(), v }))
  } catch {
    // Private mode or a full quota: the text just has no safety copy.
  }
}
function dropDraft(slug: string, section: string) {
  try {
    window.localStorage.removeItem(draftKey(slug, section))
  } catch {
    // nothing to drop
  }
}

const trimAll = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)

/** What is sent and compared: trimmed, empty rows dropped. */
function clean(section: TextSection, v: TextValues): TextValues {
  switch (section) {
    case 'pro-studiyu': {
      const x = v as SectionValues['pro-studiyu']
      return { ownerAbout: x.ownerAbout.trim(), ownerNews: x.ownerNews.trim(), ownerQuote: x.ownerQuote.trim() }
    }
    case 'posluhy': {
      const x = v as SectionValues['posluhy']
      return { services: trimAll(x.services), products: trimAll(x.products) }
    }
    case 'tsiny': {
      const x = v as SectionValues['tsiny']
      return { prices: x.prices.filter((p) => p.text.trim()).map((p) => ({ ...p, text: p.text.trim() })) }
    }
    case 'biznes': {
      const x = v as SectionValues['biznes']
      return { ...x, minOrder: x.minOrder.trim(), leadTime: x.leadTime.trim(), logoMethods: [...new Set(trimAll(x.logoMethods))] }
    }
    case 'kontakty': {
      const x = v as SectionValues['kontakty']
      return { address: x.address.trim(), phone: x.phone.trim(), email: x.email.trim(), website: x.website.trim(), instagram: x.instagram.trim(), instagramPosts: trimAll(x.instagramPosts) }
    }
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** For list fields: which row of the form each sent row came from (empty rows are not sent, so the server's index is not the row's). */
function keptRows(section: TextSection, v: TextValues): Record<string, number[]> {
  const idx = (xs: string[]) => xs.flatMap((x, i) => (x.trim() ? [i] : []))
  if (section === 'posluhy') return { services: idx((v as SectionValues['posluhy']).services), products: idx((v as SectionValues['posluhy']).products) }
  if (section === 'tsiny') return { prices: idx((v as SectionValues['tsiny']).prices.map((p) => p.text)) }
  if (section === 'kontakty') return { instagramPosts: idx((v as SectionValues['kontakty']).instagramPosts) }
  return {}
}
function remap(fields: Record<string, string>, kept: Record<string, number[]>): Errors {
  const out: Errors = {}
  for (const [key, msg] of Object.entries(fields)) {
    const m = /^(\w+)\.(\d+)(.*)$/.exec(key)
    const orig = m && kept[m[1]]?.[Number(m[2])]
    out[m && orig !== undefined ? `${m[1]}.${orig}${m[3]}` : key] = msg
  }
  return out
}

const FIELD_NAME: Record<string, string> = {
  ownerAbout: 'про студію',
  ownerNews: 'новини',
  ownerQuote: 'цитата',
  address: 'адреса',
  phone: 'телефон',
  email: 'email',
  website: 'сайт',
  instagram: 'Instagram',
  minOrder: 'мінімальне замовлення',
  leadTime: 'термін',
  logoMethods: 'логотип',
}
const ROW_NAME: Record<string, string> = { services: 'послуга', products: 'виріб', prices: 'ціна', instagramPosts: 'пост' }
function fieldName(key: string) {
  const m = /^(\w+)\.(\d+)(.*)$/.exec(key)
  if (m && ROW_NAME[m[1]]) return `${m[3] === '.date' ? 'дата, ' : ''}${ROW_NAME[m[1]]} ${Number(m[2]) + 1}`
  return FIELD_NAME[key] ?? key
}

function goTo(key: string) {
  const el = document.getElementById(fieldId(key))
  if (!el) return
  el.scrollIntoView({ block: 'center' })
  el.focus({ preventScroll: true })
}

/** A text section's form: one explicit «Зберегти» per section, a safety draft in the browser, errors under the fields. */
export function SectionEditor({ slug, section, initial, extras, next }: { slug: string; section: TextSection; initial: TextValues; extras: SectionExtras[TextSection]; next: { href: string; label: string } }) {
  const { studio, setStudio } = useStudio()
  const [values, setValues] = useState<TextValues>(initial)
  // Bumped when a draft is restored: the fields remount, so their own state (e.g. the «Інше» chip) starts from the values.
  const [restored, setRestored] = useState(0)
  const [baseline, setBaseline] = useState<TextValues>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [problem, setProblem] = useState<null | { kind: 'net' } | { kind: 'fail'; text: string; login?: boolean }>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  // The last save changed nothing (the values were already there): no «sent for review» note then.
  const [unchanged, setUnchanged] = useState(false)
  const [answered, setAnswered] = useState(false)
  // A draft from an earlier visit (the phone put the tab to sleep, a call came in): read from the browser, offered back.
  const key = draftKey(slug, section)
  const rawDraft = useSyncExternalStore(
    noSubscription,
    () => {
      if (!offered.has(key)) offered.set(key, readRaw(slug, section))
      return offered.get(key) ?? null
    },
    () => null,
  )
  useEffect(() => () => void offered.delete(key), [key])
  const stored = parseDraft(rawDraft)
  const draft = !answered && stored && !same(clean(section, stored.v), clean(section, initial)) ? stored : null
  const note = useRef<HTMLDivElement>(null)
  const focusFirst = useRef(false)

  const dirty = !same(clean(section, values), clean(section, baseline))

  // Keep a copy of unsaved text for a week; paused while an older draft waits for the owner's answer.
  useEffect(() => {
    if (!dirty || draft) return
    const t = setTimeout(() => writeDraft(slug, section, values), 500)
    return () => clearTimeout(t)
  }, [dirty, draft, slug, section, values])

  useEffect(() => {
    if (!dirty || saving) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  useEffect(() => {
    if (savedAt) note.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [savedAt])

  useEffect(() => {
    if (!focusFirst.current) return
    focusFirst.current = false
    const els = Object.keys(errors)
      .map((k) => document.getElementById(fieldId(k)))
      .filter((el): el is HTMLElement => !!el)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    els[0]?.focus()
  }, [errors])

  const set = useCallback(
    (nextValues: TextValues) => {
      // A field's message goes away as soon as that field is touched.
      const changed = (Object.keys(nextValues) as (keyof TextValues)[]).filter((k) => !same(nextValues[k as never], values[k as never]))
      if (changed.length) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => !changed.some((k) => key === k || key.startsWith(`${String(k)}.`)))))
      setProblem(null)
      setUnchanged(false)
      setValues(nextValues)
    },
    [values],
  )

  async function save(e?: React.FormEvent) {
    e?.preventDefault()
    if (saving || !dirty) return
    const body = clean(section, values)
    const kept = keptRows(section, values)
    setSaving(true)
    setProblem(null)
    try {
      const res = await fetch(`/kabinet/api/studio/${slug}/${section}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = (await res.json().catch(() => ({}))) as Partial<SaveOk> & Partial<SaveError>
      if (res.ok && json.ok && json.studio) {
        const saved = (json.values ?? body) as TextValues
        setStudio(json.studio)
        setBaseline(saved)
        setValues((cur) => (same(clean(section, cur), body) ? saved : cur))
        setErrors({})
        if (json.changed) setSavedAt(Date.now())
        setUnchanged(!json.changed)
        setAnswered(true)
        dropDraft(slug, section)
      } else if (res.status === 400 && json.fields && Object.keys(json.fields).length) {
        focusFirst.current = true
        setErrors(remap(json.fields, kept))
      } else if (res.status === 401) {
        setProblem({ kind: 'fail', text: 'Сеанс завершився.', login: true })
      } else {
        setProblem({ kind: 'fail', text: json.error || 'Не вдалося зберегти. Спробуйте ще раз.' })
      }
    } catch {
      setProblem({ kind: 'net' })
    } finally {
      setSaving(false)
    }
  }

  const errorKeys = Object.keys(errors)
  const sectionState = studio.sections.find((s) => s.key === section)?.state
  const afterSave = (savedAt !== null || unchanged) && !dirty && !draft

  let status: React.ReactNode
  let tone: 'error' | undefined
  if (saving) status = 'Зберігаємо…'
  else if (errorKeys.length) {
    tone = 'error'
    status = (
      <>
        Перевірте {errorKeys.length} {plural(errorKeys.length, 'поле', 'поля', 'полів')}:{' '}
        {errorKeys.map((k, i) => (
          <React.Fragment key={k}>
            {i > 0 && ', '}
            <a
              href={`#${fieldId(k)}`}
              onClick={(e) => {
                e.preventDefault()
                goTo(k)
              }}
            >
              {fieldName(k)}
            </a>
          </React.Fragment>
        ))}
      </>
    )
  } else if (problem?.kind === 'net') {
    tone = 'error'
    status = (
      <>
        <span className="sm:hidden">Немає зв’язку — текст на місці.</span>
        <span className="hidden sm:inline">Не вдалося зберегти — немає зв’язку. Текст нікуди не зник.</span>{' '}
        <button type="button" onClick={() => void save()}>
          Спробувати ще раз
        </button>
      </>
    )
  } else if (problem) {
    tone = 'error'
    status = problem.login ? (
      <>
        {problem.text} <Link href="/kabinet/vhid">Увійдіть знову</Link> — текст у цій вкладці лишається.
      </>
    ) : (
      problem.text
    )
  } else if (draft) {
    status = (
      <>
        Є незбережена чернетка з {formatTime(draft.t)}
        <span className="whitespace-nowrap">
          {' '}
          ·{' '}
          <button
            type="button"
            onClick={() => {
              setValues({ ...initial, ...draft.v })
              setRestored((n) => n + 1)
              setAnswered(true)
            }}
          >
            Відновити
          </button>{' '}
          ·{' '}
          <button
            type="button"
            onClick={() => {
              dropDraft(slug, section)
              setAnswered(true)
            }}
          >
            Відкинути
          </button>
        </span>
      </>
    )
  } else if (dirty) {
    const added =
      section === 'tsiny'
        ? (clean(section, values) as SectionValues['tsiny']).prices.filter((p) => !(clean(section, baseline) as SectionValues['tsiny']).prices.some((b) => b.text === p.text)).length
        : 0
    status = (
      <>
        Є незбережені зміни
        {added > 0 && (
          <>
            {' '}
            · <b>{added} {plural(added, 'нова ціна', 'нові ціни', 'нових цін')}</b>
          </>
        )}
      </>
    )
  } else if (unchanged) {
    status = (
      <>
        <b>Збережено</b> · змін не було
      </>
    )
  } else if (savedAt || sectionState === 'review') {
    status = (
      <>
        <b>Збережено</b> · на перевірці
      </>
    )
  } else if (sectionState === 'live') {
    status = (
      <>
        <b>Збережено</b> · на сайті
      </>
    )
  } else
    status = (
      <>
        <span className="sm:hidden">Поки порожньо</span>
        <span className="hidden sm:inline">Тут поки порожньо — заповніть і збережіть</span>
      </>
    )

  return (
    <form method="post" onSubmit={save} noValidate aria-busy={saving} className="flex flex-1 flex-col">
      <div className="grid gap-0.5 pb-7">
        {savedAt && (
          <div className="kb-note" role="status" ref={note}>
            <Kicker as="p">Надіслано на перевірку · {formatWhen(savedAt)}</Kicker>
            <p>
              <b>Дякуємо. Опублікуємо зазвичай протягом доби.</b>
            </p>
            <p>До того на сайті лишається попередня версія. Можна редагувати далі — нові зміни додадуться до цієї ж перевірки.</p>
          </div>
        )}
        <SectionFields key={restored} section={section} values={values} set={set} errors={errors} extras={extras} />
      </div>
      <SaveBar
        busy={saving}
        tone={tone}
        status={status}
        action={
          afterSave ? (
            <Button variant="ghost" size="sm" href={next.href}>
              Далі: {next.label}
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={saving}>
              Зберегти
            </Button>
          )
        }
      />
    </form>
  )
}
