'use client'

import React, { useEffect, useState } from 'react'

const WHAT = [
  { value: 'tableware', label: 'Посуд для закладу' },
  { value: 'logo-mugs', label: 'Чашки з логотипом' },
  { value: 'corporate-gifts', label: 'Корпоративні подарунки' },
  { value: 'corporate-workshop', label: 'Корпоратив з ліплення з глини' },
  { value: 'master-class', label: 'Майстер-клас' },
  { value: 'other', label: 'Інше' },
]

const field =
  'w-full min-w-0 rounded-xl border-[1.5px] border-line bg-cream px-3 py-2.5 text-[15px] text-ink placeholder:text-umber/60'
const label = 'grid gap-1 text-[13px] font-semibold text-umber'

// Posts to Payload's REST API (collection `requests`, public create). `website2` is a honeypot.
// defaultWhat / defaultCity come from the page (a master-class city page asks about a master class in that city).
// /zapyt?vid=studiya (or forStudio, on /dlya-studiy) opens the form for studios that want to add or update their profile.
export function RequestForm({ sourcePage, compact = false, defaultWhat = 'tableware', defaultCity = '', forStudio = false }: { sourcePage: string; compact?: boolean; defaultWhat?: string; defaultCity?: string; forStudio?: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [what, setWhat] = useState(forStudio ? 'other' : defaultWhat)
  const [studio, setStudio] = useState(forStudio)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('vid') === 'studiya') {
      setStudio(true)
      setWhat('other')
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = Object.fromEntries(form.entries()) as Record<string, string | boolean>
    body.logo = form.get('logo') === 'on'
    body.sourcePage = sourcePage
    if (!body.contactPhoneOrTelegram && !body.contactEmail) {
      setError('Вкажіть телефон, Telegram або email, щоб студії могли відповісти.')
      setState('error')
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(String(res.status))
      setState('done')
    } catch {
      setError('Не вдалося надіслати. Спробуйте ще раз за хвилину.')
      setState('error')
    }
  }

  if (state === 'done')
    return (
      <div className="rounded-[20px] border border-line bg-card p-5">
        <p className="font-display m-0 text-sm uppercase">Запит надіслано</p>
        <p className="mt-2 mb-0">Ми передамо його студіям, які роблять такі вироби, і напишемо вам, коли вони відповідатимуть. Зазвичай це 1–3 робочі дні.</p>
      </div>
    )

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]" noValidate>
      <p className="font-display m-0 text-sm tracking-wide uppercase">{studio ? 'Додати студію' : 'Швидкий запит'}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className={label}>
          Що потрібно
          <select name="what" className={field} value={what} onChange={(e) => setWhat(e.target.value)}>
            {WHAT.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Кількість
          <input name="quantity" inputMode="numeric" placeholder="напр. 50" className={field} />
        </label>
        <label className={label}>
          До якої дати
          <input name="deadline" placeholder="напр. 15 грудня" className={field} />
        </label>
        <label className={label}>
          Місто
          <input name="city" defaultValue={defaultCity} placeholder="Ваше місто" autoComplete="address-level2" className={field} />
        </label>
        {!compact && (
          <label className={`${label} sm:col-span-2`}>
            Деталі
            <textarea
              key={studio ? 'studio' : 'buyer'}
              name="details"
              rows={3}
              defaultValue={studio ? 'Я студія / майстер. Хочу додати або оновити профіль: назва, Instagram чи сайт, місто, що робимо.' : undefined}
              placeholder="Стиль, кольори, бюджет за штуку, логотип…"
              className={field}
            />
          </label>
        )}
        <label className={label}>
          Телефон або Telegram
          <input name="contactPhoneOrTelegram" placeholder="+380… або @нік" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="contactEmail" type="email" placeholder="ви@компанія.ua" className={field} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-umber">
        <input type="checkbox" name="logo" className="size-4 accent-[var(--color-terra)]" /> Потрібен логотип
      </label>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button type="submit" disabled={state === 'sending'} className="justify-self-start rounded-full bg-terra px-5 py-3 font-bold text-cream hover:bg-terra-dark disabled:opacity-60">
        {state === 'sending' ? 'Надсилаємо…' : 'Отримати пропозиції'}
      </button>
      {state === 'error' && <p className="m-0 text-sm text-[var(--error)]">{error}</p>}
      <p className="m-0 text-[12.5px] text-umber">
        Безкоштовно для замовника. Запит отримають 3–5 студій, які роблять такі вироби. Студії платять нам 5% лише з укладених замовлень.
      </p>
    </form>
  )
}
