'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Fields'
import { Kicker } from '@/components/ui/Kicker'
import { Note } from '@/components/ui/Note'
import { buttons, checkoutCopy as c } from '@/content/shop'
import { normalizePhone, PAYMENT_HINT, type EffectiveTerms } from '@/lib/shop'
import { track } from '@/lib/track'
import { cart, cartTotal, gaItems, groupCart, useCart } from '@/shop/cart'
import type { DeliveryMethod, PaymentMethod } from '@/shared/options'

import { OrderSummary } from './OrderSummary'

type StudioTerms = Record<string, { name: string; terms: EffectiveTerms }>
type Errors = Partial<Record<'buyerPhone' | 'buyerName' | 'deliveryMethod' | 'deliveryCity' | 'deliveryPoint' | 'paymentMethod' | 'buyerEmail' | 'form', string>>
type Delivery = Exclude<DeliveryMethod, 'none'>
type Payment = Exclude<PaymentMethod, 'card_online'>

const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false)
const DIGITS = /^\d{9}$/

/** The delivery and payment ways every studio in the cart accepts; one studio's list when they share nothing. */
function sharedTerms(slugs: string[], studios: StudioTerms) {
  const all = slugs.map((s) => studios[s]?.terms).filter((t): t is EffectiveTerms => Boolean(t))
  const inter = <T,>(xs: T[][]) => (xs.length ? xs.reduce((a, b) => a.filter((x) => b.includes(x))) : [])
  const delivery = inter(all.map((t) => t.delivery))
  const payment = inter(all.map((t) => t.payment))
  return { delivery: delivery.length ? delivery : (all[0]?.delivery ?? []), payment: payment.length ? payment : (all[0]?.payment ?? []), pickup: all.map((t) => t.pickupAddress).filter(Boolean) as string[] }
}

function ChoiceRow({ name, value, label, note, aside, checked, onChange, children }: { name: string; value: string; label: string; note?: string; aside?: string; checked: boolean; onChange: () => void; children?: React.ReactNode }) {
  const id = useId()
  return (
    <li className="ui-choice" data-checked={checked ? '' : undefined}>
      <label htmlFor={id}>
        <input id={id} type="radio" name={name} value={value} checked={checked} onChange={onChange} />
        <span className="grid min-w-0 gap-0.5">
          <span className="text-base leading-[1.3]">{label}</span>
          {note && <span className="text-[13px] leading-[1.4] text-ink-2">{note}</span>}
        </span>
        {aside && <span className="font-mono text-[11.5px] tracking-[.04em] text-ink-2 uppercase whitespace-nowrap">{aside}</span>}
      </label>
      {children && (
        <div className="ui-choice-more" aria-hidden={!checked}>
          <div>{children}</div>
        </div>
      )}
    </li>
  )
}

function Legend({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <legend className="mb-2.5 grid w-full gap-1 border-b-2 border-ink pb-2.5">
      <Kicker>{n}</Kicker>
      <span className="font-display text-[17px] leading-[1.2] font-semibold">{title}</span>
      {note && <span className="text-[13px] leading-[1.4] text-ink-2">{note}</span>}
    </legend>
  )
}

// One page, four sections, guest only (DESIGN.md §1 Оформлення, §2 CheckoutForm): phone first, the studio's delivery and
// payment ways as radio rows, the summary beside the form (a details above it on phones). Prices come from the server at
// submit; the browser sends item ids and quantities only.
export function CheckoutForm({ studios }: { studios: StudioTerms }) {
  const router = useRouter()
  const lines = useCart()
  const hydrated = useHydrated()
  const uid = useId()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [deliveryPick, setDelivery] = useState<Delivery | ''>('')
  const [city, setCity] = useState('')
  const [point, setPoint] = useState('')
  const [paymentPick, setPayment] = useState<Payment | ''>('')
  const [comment, setComment] = useState('')
  const [noCall, setNoCall] = useState(false)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const began = useRef(false)
  // Set once the order is in: the cart empties, and the empty-cart redirect below must not race the order page.
  const placed = useRef(false)

  /** A field's error goes as soon as the buyer touches the field again. */
  const fix = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))

  const groups = groupCart(lines)
  const terms = sharedTerms(groups.map((g) => g.studio.slug), studios)
  const digital = lines.some((l) => l.fulfillment === 'digital')
  // A studio with one way needs no choice: it is taken as chosen.
  const delivery: Delivery | '' = deliveryPick || (terms.delivery.length === 1 ? terms.delivery[0]! : '')
  const payment: Payment | '' = paymentPick || (terms.payment.length === 1 ? terms.payment[0]! : '')
  const needsCity = delivery === 'np_branch' || delivery === 'np_postomat' || delivery === 'np_courier' || delivery === 'ukrposhta'

  useEffect(() => {
    if (!hydrated || placed.current) return
    if (!lines.length) {
      router.replace('/kramnytsia/koshyk')
      return
    }
    if (!began.current) {
      began.current = true
      track('begin_checkout', { currency: 'UAH', value: cartTotal(lines) / 100, items: JSON.stringify(gaItems(lines)) })
    }
    // the cart is read once it is in the browser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lines.length])

  if (!hydrated || !lines.length) return <div className="min-h-[40vh]" aria-busy="true" />

  const validate = (): Errors => {
    const e: Errors = {}
    if (!DIGITS.test(phone.replace(/\D/g, '')) || !normalizePhone(`+380${phone.replace(/\D/g, '')}`)) e.buyerPhone = c.phone.error
    if (name.trim().length < 2) e.buyerName = c.name.error
    if (!delivery) e.deliveryMethod = c.chooseDelivery
    if (needsCity && !city.trim()) e.deliveryCity = c.city.error
    if (needsCity && !point.trim()) e.deliveryPoint = delivery === 'np_courier' ? c.address.error : c.point.error
    if (!payment) e.paymentMethod = c.choosePayment
    if (digital && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.buyerEmail = c.email.error
    return e
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    const first = Object.keys(e)[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/kramnytsia/zamovlennia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, ...(l.options ? { options: l.options } : {}) })),
          buyerName: name.trim(),
          buyerPhone: `+380${phone.replace(/\D/g, '')}`,
          buyerEmail: email.trim() || undefined,
          noCall,
          comment: comment.trim() || undefined,
          deliveryMethod: delivery,
          deliveryCity: needsCity ? city.trim() : undefined,
          deliveryPoint: needsCity ? point.trim() : undefined,
          paymentMethod: payment,
          sourcePage: '/kramnytsia/oformlennia',
          website2: (formRef.current?.elements.namedItem('website2') as HTMLInputElement | null)?.value ?? '',
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; token?: string; error?: string; field?: string } | null
      if (!res.ok || !json?.ok || !json.token) {
        setErrors(json?.field && json.field !== 'lines' ? { [json.field]: json.error ?? c.failed } : { form: json?.error ?? c.failed })
        setSending(false)
        return
      }
      placed.current = true
      cart.clear()
      router.replace(`/kramnytsia/zamovlennia/${json.token}?new=1`)
    } catch {
      setErrors({ form: c.failed })
      setSending(false)
    }
  }

  const cta = (
    <Button type="submit" form={`${uid}-form`} variant="cobalt" full arrow disabled={sending}>
      {buttons.confirm}
    </Button>
  )
  const consent = (
    <>
      {c.consent.split('умовами крамниці')[0]}
      <a href={c.consentHref} className="text-ink-2 underline underline-offset-[3px]">
        умовами крамниці
      </a>
      {c.consent.split('умовами крамниці')[1]}
    </>
  )

  return (
    <div className="grid items-start gap-[clamp(28px,4vw,56px)] pt-[clamp(24px,3vw,40px)] lg:grid-cols-[minmax(0,640px)_minmax(0,.85fr)]">
      <div className="lg:hidden">
        <OrderSummary groups={groups} collapsed />
      </div>
      <form id={`${uid}-form`} ref={formRef} onSubmit={submit} noValidate className="grid gap-8" aria-busy={sending}>
        <fieldset className="m-0 grid min-w-0 gap-1 border-0 p-0">
          <Legend n={c.sections.contact} title="Куди писати і кому відправляти" />
          <Field label={c.phone.label} htmlFor={`${uid}-phone`} hint={c.phone.hint} error={errors.buyerPhone} variant="box">
            <div className="ui-tel" data-invalid={errors.buyerPhone ? '' : undefined}>
              <span aria-hidden>+380</span>
              <input id={`${uid}-phone`} name="buyerPhone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={12} placeholder="67 000 00 00" value={phone} onChange={(e) => (setPhone(e.target.value.replace(/[^\d ]/g, '')), fix('buyerPhone'))} aria-invalid={errors.buyerPhone ? true : undefined} />
            </div>
          </Field>
          <Field label={c.name.label} htmlFor={`${uid}-name`} hint={c.name.hint} error={errors.buyerName} variant="box">
            <Input id={`${uid}-name`} name="buyerName" autoComplete="name" value={name} onChange={(e) => (setName(e.target.value), fix('buyerName'))} invalid={Boolean(errors.buyerName)} />
          </Field>
          {digital && (
            <Field label={c.email.label} htmlFor={`${uid}-email`} hint={c.email.hint} error={errors.buyerEmail} variant="box">
              <Input id={`${uid}-email`} name="buyerEmail" type="email" autoComplete="email" value={email} onChange={(e) => (setEmail(e.target.value), fix('buyerEmail'))} invalid={Boolean(errors.buyerEmail)} />
            </Field>
          )}
        </fieldset>

        <fieldset className="m-0 grid min-w-0 gap-0 border-0 p-0">
          <Legend n={c.sections.delivery} title="Як отримати" note={c.deliveryNote} />
          <ul className="m-0 list-none p-0" role="radiogroup" aria-invalid={errors.deliveryMethod ? true : undefined}>
            {terms.delivery.map((d) => (
              <ChoiceRow key={d} name="deliveryMethod" value={d} label={c.delivery[d].label} note={d === 'pickup' ? (terms.pickup.join('; ') || undefined) : ('note' in c.delivery[d] ? (c.delivery[d] as { note?: string }).note : undefined)} aside={c.delivery[d].aside} checked={delivery === d} onChange={() => (setDelivery(d), fix('deliveryMethod'))}>
                {d !== 'pickup' && (
                  <div className="grid gap-1">
                    <Field label={c.city.label} htmlFor={`${uid}-city-${d}`} error={delivery === d ? errors.deliveryCity : undefined} variant="box">
                      <Input id={`${uid}-city-${d}`} name={delivery === d ? 'deliveryCity' : undefined} autoComplete="address-level2" value={city} onChange={(e) => (setCity(e.target.value), fix('deliveryCity'))} invalid={delivery === d && Boolean(errors.deliveryCity)} />
                    </Field>
                    <Field label={d === 'np_courier' ? c.address.label : c.point.label} htmlFor={`${uid}-point-${d}`} hint={d === 'np_courier' ? undefined : c.point.hint} error={delivery === d ? errors.deliveryPoint : undefined} variant="box">
                      <Input id={`${uid}-point-${d}`} name={delivery === d ? 'deliveryPoint' : undefined} autoComplete={d === 'np_courier' ? 'street-address' : 'off'} value={point} onChange={(e) => (setPoint(e.target.value), fix('deliveryPoint'))} invalid={delivery === d && Boolean(errors.deliveryPoint)} />
                    </Field>
                  </div>
                )}
              </ChoiceRow>
            ))}
          </ul>
          {errors.deliveryMethod && (
            <p className="m-0 pt-2 text-[13.5px] text-terracotta-text" role="alert">
              {errors.deliveryMethod}
            </p>
          )}
        </fieldset>

        <fieldset className="m-0 grid min-w-0 gap-0 border-0 p-0">
          <Legend n={c.sections.payment} title="Як оплатити" />
          <ul className="m-0 list-none p-0" role="radiogroup">
            {terms.payment.map((p) => (
              <ChoiceRow key={p} name="paymentMethod" value={p} label={c.payment[p].label} note={c.payment[p].note ?? PAYMENT_HINT[p]} checked={payment === p} onChange={() => (setPayment(p), fix('paymentMethod'))} />
            ))}
          </ul>
          {errors.paymentMethod && (
            <p className="m-0 pt-2 text-[13.5px] text-terracotta-text" role="alert">
              {errors.paymentMethod}
            </p>
          )}
        </fieldset>

        <fieldset className="m-0 grid min-w-0 gap-1 border-0 p-0">
          <Legend n={c.sections.comment} title="Побажання" />
          <Field label={c.comment.label} htmlFor={`${uid}-comment`} hint={c.comment.hint} optional variant="box">
            <Textarea id={`${uid}-comment`} name="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <Checkbox name="noCall" label={c.noCall.label} hint={c.noCall.hint} checked={noCall} onChange={(e) => setNoCall(e.target.checked)} />
          <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" defaultValue="" />
        </fieldset>

        <div className="grid gap-3">
          {errors.form && <Note>{errors.form}</Note>}
          <div className="lg:hidden">{cta}</div>
          <p className="m-0 text-[12.5px] leading-[1.4] text-ink-2">{consent}</p>
        </div>
      </form>
      <div className="hidden lg:sticky lg:top-[84px] lg:block">
        <OrderSummary groups={groups} cta={cta} note={consent} />
      </div>
    </div>
  )
}
