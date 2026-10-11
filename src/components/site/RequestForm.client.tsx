'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

const WHAT = [
  { value: 'tableware', label: 'Посуд для закладу' },
  { value: 'logo-mugs', label: 'Чашки з логотипом' },
  { value: 'corporate-gifts', label: 'Корпоративні подарунки' },
  { value: 'corporate-workshop', label: 'Корпоратив з ліплення з глини' },
  { value: 'master-class', label: 'Майстер-клас' },
  { value: 'other', label: 'Інше' },
]

// Field wording by request kind: things are counted in pieces, classes in people; a logo only makes sense for things.
const KIND: Record<string, { qty: string; qtyPh: string; date: string; datePh: string; details: string; logo: boolean }> = {
  tableware: { qty: 'Кількість', qtyPh: 'напр. 50 тарілок', date: 'До якої дати', datePh: 'напр. 15 грудня', details: 'Які вироби, стиль, кольори, бюджет за штуку…', logo: true },
  'logo-mugs': { qty: 'Кількість', qtyPh: 'напр. 50', date: 'До якої дати', datePh: 'напр. 15 грудня', details: 'Об’єм, колір, де логотип, бюджет за штуку…', logo: true },
  'corporate-gifts': { qty: 'Кількість', qtyPh: 'напр. 30', date: 'До якої дати', datePh: 'напр. 15 грудня', details: 'Що дарувати, бюджет на подарунок, пакування…', logo: true },
  'corporate-workshop': { qty: 'Скільки людей', qtyPh: 'напр. 15', date: 'Дата', datePh: 'напр. п’ятниця, 24 жовтня', details: 'Формат (ліплення, коло, розпис), у студії чи у вас, побажання…', logo: false },
  'master-class': { qty: 'Скільки людей', qtyPh: 'напр. 2', date: 'Дата', datePh: 'напр. субота', details: 'Формат (коло, ліплення, розпис), для кого, вік дітей…', logo: false },
  // «Інше» (events, museums, guides, Etsy): no quantity field — there is nothing to count yet.
  other: { qty: '', qtyPh: '', date: 'Коли', datePh: 'напр. до кінця листопада', details: 'Що потрібно: виріб, майстер-клас, подарунок, місто, бюджет…', logo: false },
}

const field =
  'w-full min-w-0 rounded-xl border-[1.5px] border-line bg-cream px-3 py-2.5 text-[15px] text-ink placeholder:text-umber/60'
const label = 'grid gap-1 text-[13px] font-semibold text-umber'

// Posts to Payload's REST API (collection `requests`, public create). `website2` is a honeypot.
// defaultWhat / defaultCity come from the page (a master-class city page asks about a master class in that city).
// /zapyt?vid=studiya (or forStudio, on /dlya-studiy) opens the form for studios that want to add or update their profile.
// /zapyt?what=<kind>&misto=<city slug> (set by the header button from the page the visitor came from) pre-fills the form.
export function RequestForm({
  sourcePage,
  compact = false,
  defaultWhat = 'tableware',
  defaultCity = '',
  forStudio = false,
  cityNames,
}: {
  sourcePage: string
  compact?: boolean
  defaultWhat?: string
  defaultCity?: string
  forStudio?: boolean
  cityNames?: Record<string, string>
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState<number | null>(null)
  const [what, setWhat] = useState(defaultWhat)
  const [city, setCity] = useState(defaultCity)
  const [studio, setStudio] = useState(forStudio)
  const kind = KIND[what] ?? KIND.other
  // New-studio form: warn when the studio is already in the catalogue and point to the claim instead.
  const [sName, setSName] = useState('')
  const [sLinks, setSLinks] = useState('')
  const [existing, setExisting] = useState<{ slug: string; name: string; city: string }[]>([])
  useEffect(() => {
    if (!studio) return
    if (sName.trim().length < 3 && sLinks.trim().length < 3) return
    const t = setTimeout(() => {
      fetch(`/kabinet/api/studios?name=${encodeURIComponent(sName)}&ig=${encodeURIComponent(sLinks)}`)
        .then((r) => r.json())
        .then((r: typeof existing) => setExisting(Array.isArray(r) ? r : []))
        .catch(() => setExisting([]))
    }, 400)
    return () => clearTimeout(t)
  }, [studio, sName, sLinks])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL after hydration */
    if (q.get('vid') === 'studiya') setStudio(true)
    const w = q.get('what')
    if (w && KIND[w]) setWhat(w)
    const m = q.get('misto')
    if (m && cityNames?.[m]) setCity(cityNames[m])
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [cityNames])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = Object.fromEntries(form.entries()) as Record<string, string | boolean>
    body.logo = form.get('logo') === 'on'
    body.photoConsent = form.get('photoConsent') === 'on'
    body.sourcePage = sourcePage
    if (studio) body.what = 'studio'
    if (!body.contactPhoneOrTelegram && !body.contactEmail) {
      setError('Вкажіть телефон, Telegram або email, щоб студії могли відповісти.')
      setState('error')
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/zapyt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json().catch(() => null)) as { id?: number | null; doc?: { id?: number } } | null
      setRequestId(json?.id ?? json?.doc?.id ?? null)
      setState('done')
    } catch {
      setError('Не вдалося надіслати. Спробуйте ще раз за хвилину.')
      setState('error')
    }
  }

  if (state === 'done')
    return (
      <div className="grid gap-2 rounded-[20px] border border-line bg-card p-5" role="status">
        <p className="font-display m-0 text-sm uppercase">{studio ? 'Дані студії отримали' : 'Запит надіслано'}{requestId ? ` · № ${requestId}` : ''}</p>
        {studio ? (
          <p className="m-0">Ми перевіримо профіль і напишемо вам, щоб уточнити деталі. Нічого не публікуємо без перевірки, а фото — лише з вашої згоди.</p>
        ) : (
          <>
            <p className="m-0">Що далі: ми передамо запит студіям, які роблять саме таке, і напишемо вам. Студії відповідатимуть напряму — з цінами й термінами.</p>
            <p className="m-0 text-sm text-umber">Якщо щось змінилося, відповідайте на наше повідомлення й вкажіть номер запиту.</p>
          </>
        )}
      </div>
    )

  if (studio)
    return (
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]" noValidate>
        <p className="font-display m-0 text-sm tracking-wide uppercase">Додати нову студію</p>
        <p className="m-0 text-sm text-umber">
          Ваша студія вже є в каталозі? Відкрийте її профіль у <Link href="/vyrobnyky">списку виробників</Link> чи на <Link href="/mapa">мапі</Link> й натисніть «Керувати профілем» — так ви отримаєте доступ до кабінету. Вже маєте кабінет? <Link href="/kabinet/vhid">Увійти</Link>.
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className={label}>
            Назва студії чи ім’я майстра
            <input name="studioName" required value={sName} onChange={(e) => { setSName(e.target.value); if (e.target.value.trim().length < 3 && sLinks.trim().length < 3) setExisting([]) }} className={field} />
          </label>
          <label className={label}>
            Місто
            <input name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ваше місто" autoComplete="address-level2" className={field} />
          </label>
          <label className={label}>
            Instagram або сайт
            <input name="studioLinks" placeholder="@студія або https://…" value={sLinks} onChange={(e) => { setSLinks(e.target.value); if (e.target.value.trim().length < 3 && sName.trim().length < 3) setExisting([]) }} className={field} />
          </label>
          <label className={label}>
            Телефон, Telegram або email
            <input name="contactPhoneOrTelegram" placeholder="+380… або @нік" className={field} />
          </label>
        </div>
        {existing.length > 0 && (
          <div className="grid gap-1.5 rounded-2xl border border-terra/40 bg-sand p-3.5 text-[14.5px]" role="status">
            {existing.map((x) => (
              <p key={x.slug} className="m-0">
                Ця студія вже є в каталозі: <b>{x.name}</b>
                {x.city ? ` (${x.city})` : ''} — <Link href={`/kabinet/zayavka?studio=${x.slug}`}>подайте заявку на керування профілем</Link>.
              </p>
            ))}
          </div>
        )}
        <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button type="submit" disabled={state === 'sending'} className="justify-self-start rounded-full bg-terra px-5 py-3 font-bold text-cream hover:bg-terra-dark disabled:opacity-60">
          {state === 'sending' ? 'Надсилаємо…' : 'Додати студію'}
        </button>
        {state === 'error' && <p className="m-0 text-sm text-[var(--error)]">{error}</p>}
        <p className="m-0 text-[12.5px] text-umber">Профіль безкоштовний. Студія платить 5% лише з замовлень, укладених через наш запит.</p>
      </form>
    )

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]" noValidate>
      <p className="font-display m-0 text-sm tracking-wide uppercase">Швидкий запит</p>
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
        {kind.qty && (
          <label className={label}>
            {kind.qty}
            <input name="quantity" inputMode="numeric" placeholder={kind.qtyPh} className={field} />
          </label>
        )}
        <label className={label}>
          {kind.date}
          <input name="deadline" placeholder={kind.datePh} className={field} />
        </label>
        <label className={label}>
          Місто
          <input name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ваше місто" autoComplete="address-level2" className={field} />
        </label>
        {!compact && (
          <label className={`${label} sm:col-span-2`}>
            Деталі
            <textarea name="details" rows={3} placeholder={kind.details} className={field} />
          </label>
        )}
        <label className={label}>
          Телефон або Telegram
          <input name="contactPhoneOrTelegram" inputMode="tel" placeholder="+380… або @нік" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="contactEmail" type="email" placeholder="ви@компанія.ua" className={field} />
        </label>
      </div>
      {kind.logo && (
        <label className="flex items-center gap-2 text-sm text-umber">
          <input type="checkbox" name="logo" className="size-4 accent-[var(--color-terra)]" /> Потрібен логотип
        </label>
      )}
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
