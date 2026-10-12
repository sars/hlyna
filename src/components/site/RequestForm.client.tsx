'use client'

import Link from 'next/link'
import React, { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Checkbox, Field, FieldRow, Input, Select, Textarea } from '@/components/ui/Fields'
import { Kicker } from '@/components/ui/Kicker'
import { Note } from '@/components/ui/Note'

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


// Posts to Payload's REST API (collection `requests`, public create). `website2` is a honeypot.
// defaultWhat / defaultCity come from the page (a master-class city page asks about a master class in that city).
// /zapyt?vid=studiya (or forStudio, on /dlya-studiy) opens the form for studios that want to add or update their profile.
// /zapyt?what=<kind>&misto=<city slug> (set by the header button from the page the visitor came from) pre-fills the form.
// /zapyt?vid=keys&slug=<case slug> asks us to remove or correct a case page («Інше» with a prefilled note).
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
  const uid = useId()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState<number | null>(null)
  const [what, setWhat] = useState(defaultWhat)
  const [city, setCity] = useState(defaultCity)
  const [details, setDetails] = useState('')
  const [studio, setStudio] = useState(forStudio)
  // /zapyt?vid=keys: a neutral «correct or remove this case» note, not a buyer request.
  const [caseFix, setCaseFix] = useState(false)
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
    const caseSlug = q.get('vid') === 'keys' ? (q.get('slug') ?? '').replace(/[^a-z0-9/-]/g, '').slice(0, 160) : ''
    if (caseSlug) {
      setWhat('other')
      setCaseFix(true)
      setDetails(`Прошу зняти або виправити кейс /vyrobnyky/${caseSlug}. Що саме: `)
    }
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
      setError(caseFix ? 'Вкажіть телефон, Telegram або email, щоб ми могли відповісти.' : 'Вкажіть телефон, Telegram або email, щоб студії могли відповісти.')
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

  // The cobalt panel of the new design (SYSTEM.md §4.2): kicker, heading, underline fields, one paper button.
  // `compact` (home hero) leaves out the details field and is the form the «Отримати пропозиції» links of the home page point to.
  const panel = 'group/tone grid content-start gap-0.5 bg-cobalt p-[clamp(18px,2.4vw,28px)] text-paper'
  const small = 'm-0 max-w-[52ch] text-[12.5px] leading-[1.4] text-on-cobalt-2'

  if (state === 'done')
    return (
      <div id="zapyt-forma" data-tone="cobalt" role="status" className={`${panel} gap-2.5`}>
        <p className="m-0 font-serif text-xl leading-[1.3] italic">
          {studio ? 'Дані студії отримали' : caseFix ? 'Повідомлення отримали' : 'Запит надіслано'}
          {requestId ? ` · № ${requestId}` : ''}
        </p>
        {caseFix ? (
          <p className="m-0 text-[15px]">Ми перевіримо кейс за вашим повідомленням і виправимо або знімемо його, а потім напишемо вам.</p>
        ) : studio ? (
          <p className="m-0 text-[15px]">Ми перевіримо профіль і напишемо вам, щоб уточнити деталі. Нічого не публікуємо без перевірки, а фото — лише зі згоди власника.</p>
        ) : (
          <>
            <p className="m-0 text-[15px]">Що далі: ми передамо запит студіям, які роблять саме таке, і напишемо вам. Студії відповідатимуть напряму — з цінами й термінами.</p>
            <p className="m-0 text-[15px] text-on-cobalt-2">Якщо щось змінилося, відповідайте на наше повідомлення й вкажіть номер запиту.</p>
          </>
        )}
      </div>
    )

  const honeypot = <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
  const errorLine = state === 'error' && (
    <p className="ui-error m-0 mt-2" role="alert">
      {error}
    </p>
  )

  if (caseFix && !studio)
    return (
      <form id="zapyt-forma" onSubmit={onSubmit} data-tone="cobalt" className={panel} noValidate>
        <Kicker>Виправити або зняти кейс</Kicker>
        <input type="hidden" name="what" value="other" />
        <Field label="Що виправити або чому зняти" htmlFor={`${uid}-d`}>
          <Textarea id={`${uid}-d`} name="details" rows={5} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        <FieldRow>
          <Field label="Ваше ім’я і хто ви (студія, замовник)" htmlFor={`${uid}-n`}>
            <Input id={`${uid}-n`} name="contactName" />
          </Field>
          <Field label="Телефон, Telegram або email" htmlFor={`${uid}-c`}>
            <Input id={`${uid}-c`} name="contactPhoneOrTelegram" placeholder="+380… або @нік" />
          </Field>
        </FieldRow>
        {honeypot}
        <div className="mt-2.5">
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Надсилаємо…' : 'Надіслати'}
          </Button>
        </div>
        {errorLine}
      </form>
    )

  if (studio)
    return (
      <form id="zapyt-forma" onSubmit={onSubmit} data-tone="cobalt" className={panel} noValidate>
        <Kicker>Додати нову студію</Kicker>
        <p className="m-0 mt-1.5 mb-1 text-[14.5px] leading-[1.45] text-on-cobalt-2">
          Ваша студія вже є в каталозі? Відкрийте її профіль у{' '}
          <Link href="/vyrobnyky" className="underline underline-offset-[3px]">
            списку виробників
          </Link>{' '}
          чи на{' '}
          <Link href="/mapa" className="underline underline-offset-[3px]">
            мапі
          </Link>{' '}
          й натисніть «Керувати профілем».
        </p>
        <FieldRow>
          <Field label="Назва студії чи ім’я майстра" htmlFor={`${uid}-sn`}>
            <Input id={`${uid}-sn`} name="studioName" required value={sName} onChange={(e) => { setSName(e.target.value); if (e.target.value.trim().length < 3 && sLinks.trim().length < 3) setExisting([]) }} />
          </Field>
          <Field label="Місто" htmlFor={`${uid}-sc`}>
            <Input id={`${uid}-sc`} name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ваше місто" autoComplete="address-level2" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Instagram або сайт" htmlFor={`${uid}-sl`}>
            <Input id={`${uid}-sl`} name="studioLinks" placeholder="@студія або https://…" value={sLinks} onChange={(e) => { setSLinks(e.target.value); if (e.target.value.trim().length < 3 && sName.trim().length < 3) setExisting([]) }} />
          </Field>
          <Field label="Телефон, Telegram або email" htmlFor={`${uid}-st`}>
            <Input id={`${uid}-st`} name="contactPhoneOrTelegram" placeholder="+380… або @нік" />
          </Field>
        </FieldRow>
        {existing.length > 0 && (
          <Note className="mt-2 grid gap-1.5 text-ink [&_a]:text-cobalt" >
            <div role="status" className="grid gap-1.5 text-[14.5px]">
              {existing.map((x) => (
                <p key={x.slug} className="m-0">
                  Ця студія вже є в каталозі: <b>{x.name}</b>
                  {x.city ? ` (${x.city})` : ''} — <Link href={`/kabinet/zayavka?studio=${x.slug}`} className="underline underline-offset-[3px]">подайте заявку на керування профілем</Link>.
                </p>
              ))}
            </div>
          </Note>
        )}
        {honeypot}
        <div className="mt-2.5">
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Надсилаємо…' : 'Додати студію'}
          </Button>
        </div>
        {errorLine}
        <p className={`${small} mt-2.5`}>Профіль безкоштовний. Студія платить 5% лише з замовлень, укладених через наш запит.</p>
      </form>
    )

  // Compact (home hero): the same fields, paired in rows so the panel is no taller than the hero text; a short «Відповідь напряму від студій»
  // sits by the button (the 5% model is stated in the FAQ and the footer).
  if (compact) {
    const pair = 'grid grid-cols-2 gap-x-4 [&>*:last-child:nth-child(odd)]:col-span-2'
    return (
      <form id="zapyt-forma" data-tone="cobalt" onSubmit={onSubmit} aria-labelledby={`${uid}-h`} className={`${panel} p-[clamp(16px,2vw,24px)]`} noValidate>
        <Kicker>Запит · безкоштовно</Kicker>
        <h2 id={`${uid}-h`} className="m-0 mt-1 mb-1.5 font-display text-[18px] leading-[1.15] font-semibold sm:text-[19px]">
          Опишіть, що потрібно — відповідять 3–5 студій
        </h2>
        <div className={pair}>
          <Field label="Що потрібно" htmlFor={`${uid}-what`}>
            <Select id={`${uid}-what`} name="what" value={what} onChange={(e) => setWhat(e.target.value)}>
              {WHAT.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </Field>
          {kind.qty && (
            <Field label={kind.qty} htmlFor={`${uid}-qty`}>
              <Input id={`${uid}-qty`} name="quantity" inputMode="numeric" placeholder={kind.qtyPh} />
            </Field>
          )}
          <Field label={kind.date} htmlFor={`${uid}-date`}>
            <Input id={`${uid}-date`} name="deadline" placeholder={kind.datePh} />
          </Field>
          <Field label="Місто" htmlFor={`${uid}-city`}>
            <Input id={`${uid}-city`} name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ваше місто" autoComplete="address-level2" />
          </Field>
          <Field label="Телефон або Telegram" htmlFor={`${uid}-tel`}>
            <Input id={`${uid}-tel`} name="contactPhoneOrTelegram" inputMode="tel" placeholder="+380… або @нік" />
          </Field>
          <Field label="Email" htmlFor={`${uid}-mail`}>
            <Input id={`${uid}-mail`} name="contactEmail" type="email" placeholder="ви@компанія.ua" />
          </Field>
        </div>
        {kind.logo && <Checkbox name="logo" label="Потрібен логотип" className="!py-1.5" />}
        {honeypot}
        <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Надсилаємо…' : 'Надіслати запит'}
          </Button>
          <small className="font-mono text-[11px] tracking-[.03em] text-on-cobalt-2">Відповідь напряму від студій</small>
        </div>
        {errorLine}
      </form>
    )
  }

  return (
    <form id="zapyt-forma" data-tone="cobalt" onSubmit={onSubmit} aria-labelledby={`${uid}-h`} className={panel} noValidate>
      <Kicker>Запит · безкоштовно</Kicker>
      <h2 id={`${uid}-h`} className="m-0 mt-1.5 mb-2 font-display text-[19px] leading-[1.15] font-semibold sm:text-xl">
        Опишіть, що потрібно — відповідять 3–5 студій
      </h2>
      <Field label="Що потрібно" htmlFor={`${uid}-what`}>
        <Select id={`${uid}-what`} name="what" value={what} onChange={(e) => setWhat(e.target.value)}>
          {WHAT.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </Field>
      {kind.qty ? (
        <FieldRow>
          <Field label={kind.qty} htmlFor={`${uid}-qty`}>
            <Input id={`${uid}-qty`} name="quantity" inputMode="numeric" placeholder={kind.qtyPh} />
          </Field>
          <Field label={kind.date} htmlFor={`${uid}-date`}>
            <Input id={`${uid}-date`} name="deadline" placeholder={kind.datePh} />
          </Field>
        </FieldRow>
      ) : (
        <Field label={kind.date} htmlFor={`${uid}-date`}>
          <Input id={`${uid}-date`} name="deadline" placeholder={kind.datePh} />
        </Field>
      )}
      <Field label="Місто" htmlFor={`${uid}-city`}>
        <Input id={`${uid}-city`} name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ваше місто" autoComplete="address-level2" />
      </Field>
      <Field label="Деталі" htmlFor={`${uid}-details`}>
        <Textarea id={`${uid}-details`} name="details" rows={3} placeholder={kind.details} value={details} onChange={(e) => setDetails(e.target.value)} />
      </Field>
      <FieldRow>
        <Field label="Телефон або Telegram" htmlFor={`${uid}-tel`}>
          <Input id={`${uid}-tel`} name="contactPhoneOrTelegram" inputMode="tel" placeholder="+380… або @нік" />
        </Field>
        <Field label="Email" htmlFor={`${uid}-mail`}>
          <Input id={`${uid}-mail`} name="contactEmail" type="email" placeholder="ви@компанія.ua" />
        </Field>
      </FieldRow>
      {kind.logo && <Checkbox name="logo" label="Потрібен логотип" />}
      {honeypot}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <Button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Надсилаємо…' : 'Отримати пропозиції'}
        </Button>
        <small className="font-mono text-[11px] tracking-[.03em] text-on-cobalt-2">Відповідь напряму від студій</small>
      </div>
      {errorLine}
      <p className={`${small} mt-2.5`}>Безкоштовно для замовника. Запит отримають 3–5 студій, які роблять такі вироби. Студії платять нам 5% лише з укладених замовлень.</p>
    </form>
  )
}
