'use client'

import React from 'react'

import { Checkbox, Field, Input, Textarea } from '@/components/ui/Fields'
import { ChoiceChip } from '@/components/ui/ChoiceChip'
import { ListEditor } from '@/components/ui/ListEditor.client'
import type { B2bTerms, SectionExtras, SectionValues } from '@/shared/kabinet'
import { LOGO_METHODS, type KabinetSection } from '@/shared/options'

import { fieldId, plural } from './format'
import { NowBlock } from './NowBlock.client'

export type TextSection = Exclude<KabinetSection, 'foto'>
export type TextValues = SectionValues[TextSection]
export type Errors = Record<string, string | undefined>

type Props<S extends TextSection> = { values: SectionValues[S]; set: (next: SectionValues[S]) => void; errors: Errors }

const count = (list: string[]) => list.filter((x) => x.trim()).length

function ProStudiyu({ values, set, errors, publicNow }: Props<'pro-studiyu'> & { publicNow: string }) {
  const v = values
  return (
    <>
      {publicNow && <NowBlock text={publicNow} />}
      <Field variant="box" label="Розкажіть про студію своїми словами" htmlFor={fieldId('ownerAbout')} hint="Що робите, з якої глини, які поливи, хто веде заняття, для кого. Редактор перепише це голосом сайту й покаже вам." error={errors.ownerAbout}>
        <Textarea id={fieldId('ownerAbout')} name="ownerAbout" rows={5} value={v.ownerAbout} placeholder="Напр.: ліпимо з білої кам’яної маси, обпалюємо двічі, заняття веде…" onChange={(e) => set({ ...v, ownerAbout: e.target.value })} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field variant="box" label="Новини студії" optional htmlFor={fieldId('ownerNews')} hint="Нова колекція, розклад, ярмарок. Виходить як є, з датою і підписом «Новини від студії»; через пів року ховається." error={errors.ownerNews} counter={`${v.ownerNews.length} / 600`}>
          <Textarea id={fieldId('ownerNews')} name="ownerNews" rows={4} maxLength={600} value={v.ownerNews} placeholder="Напр.: у листопаді — групові МК по суботах о 12:00" onChange={(e) => set({ ...v, ownerNews: e.target.value })} />
        </Field>
        <Field variant="box" label="Одне речення від студії" optional htmlFor={fieldId('ownerQuote')} hint="Показуємо як цитату «Студія про себе»." error={errors.ownerQuote} counter={`${v.ownerQuote.length} / 200`}>
          <Input id={fieldId('ownerQuote')} name="ownerQuote" maxLength={200} value={v.ownerQuote} placeholder="Напр.: «Ліпимо повільно й даємо глині говорити»" onChange={(e) => set({ ...v, ownerQuote: e.target.value })} />
        </Field>
      </div>
    </>
  )
}

const rowErrors = (errors: Errors, key: string, n: number, suffix = '') => Array.from({ length: n }, (_, i) => errors[`${key}.${i}${suffix}`])

function Posluhy({ values, set, errors }: Props<'posluhy'>) {
  return (
    <>
      <ListEditor
        id={fieldId('services')}
        heading={<>Послуги · {count(values.services)}</>}
        noun="послуга"
        addLabel="+ Додати послугу"
        placeholder="Напр.: групові майстер-класи з ліплення"
        items={values.services}
        errors={rowErrors(errors, 'services', values.services.length)}
        onChange={(services) => set({ ...values, services })}
      />
      <ListEditor
        id={fieldId('products')}
        heading={<>Вироби · {count(values.products)}</>}
        noun="виріб"
        addLabel="+ Додати виріб"
        placeholder="Напр.: чашки"
        items={values.products}
        errors={rowErrors(errors, 'products', values.products.length)}
        onChange={(products) => set({ ...values, products })}
      />
    </>
  )
}

function Tsiny({ values, set, errors }: Props<'tsiny'>) {
  const n = values.prices.filter((p) => p.text.trim()).length
  return (
    <>
      <ListEditor
        kind="price"
        id={fieldId('prices')}
        heading={n ? `${n} ${plural(n, 'ціна', 'ціни', 'цін')}` : 'Ціни'}
        noun="ціна"
        addLabel="+ Додати ціну"
        placeholder="Напр.: Дитячий МК, 1,5 год — 500 грн з дитини"
        items={values.prices}
        errors={rowErrors(errors, 'prices', values.prices.length, '.text')}
        onChange={(prices) => set({ ...values, prices })}
      />
      <p className="mt-3 mb-0 max-w-[60ch] text-[13px] leading-[1.4] text-ink-2">Джерело у дужках («сайт, 2026») дописав редактор — його можна лишити або прибрати, ми підпишемо «від студії».</p>
    </>
  )
}

const CHECKS: { key: keyof Pick<B2bTerms, 'foodSafe' | 'dishwasherSafe' | 'worksWithHoreca' | 'worksWithCorporate'>; label: string; hint?: string }[] = [
  { key: 'foodSafe', label: 'Полива безпечна для їжі', hint: 'Якщо є сертифікат чи протокол — напишіть про нього в «Про студію».' },
  { key: 'dishwasherSafe', label: 'Можна мити в посудомийці' },
  { key: 'worksWithHoreca', label: 'Робимо посуд для закладів', hint: 'Профіль потрапить у списки для ресторанів і кав’ярень.' },
  { key: 'worksWithCorporate', label: 'Беремо корпоративні замовлення', hint: 'Подарунки, чашки з логотипом, майстер-класи для команд.' },
]

function Biznes({ values, set, errors }: Props<'biznes'>) {
  const known = (m: string) => (LOGO_METHODS as readonly string[]).includes(m)
  const other = values.logoMethods.filter((m) => !known(m))
  // «Інше» is on when the owner switched it on or when a method is not one of the chips (a restored draft brings one).
  const [picked, setPicked] = React.useState(false)
  const otherOn = picked || other.length > 0
  const otherText = other.join(', ')
  const setOther = (text: string) => set({ ...values, logoMethods: [...values.logoMethods.filter(known), ...(text ? [text] : [])] })
  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field variant="box" label="Мінімальне замовлення" optional htmlFor={fieldId('minOrder')} error={errors.minOrder}>
          <Input id={fieldId('minOrder')} name="minOrder" value={values.minOrder} placeholder="Напр.: від 20 чашок або від 10 000 грн" onChange={(e) => set({ ...values, minOrder: e.target.value })} />
        </Field>
        <Field variant="box" label="Термін виготовлення партії" optional htmlFor={fieldId('leadTime')} error={errors.leadTime}>
          <Input id={fieldId('leadTime')} name="leadTime" value={values.leadTime} placeholder="Напр.: 4–6 тижнів" onChange={(e) => set({ ...values, leadTime: e.target.value })} />
        </Field>
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0 py-2">
        <legend className="p-0 pb-1.5 text-[15px] leading-[1.3] font-medium">Як наносите логотип</legend>
        <p className="m-0 text-[13.5px] leading-[1.4] text-ink-2" id="kb-logo-hint">Оберіть усе, що вмієте.</p>
        <div className="ui-chips" aria-describedby="kb-logo-hint">
          {LOGO_METHODS.map((m) => (
            <ChoiceChip
              key={m}
              label={m}
              name="logoMethods"
              value={m}
              checked={values.logoMethods.includes(m)}
              onChange={(e) => set({ ...values, logoMethods: e.target.checked ? [...values.logoMethods, m] : values.logoMethods.filter((x) => x !== m) })}
            />
          ))}
          <ChoiceChip
            label="Інше"
            checked={otherOn}
            onChange={(e) => {
              setPicked(e.target.checked)
              if (!e.target.checked) setOther('')
            }}
          />
        </div>
        {otherOn && (
          <Field variant="box" label="Свій спосіб" htmlFor={fieldId('logoMethods')} error={errors.logoMethods}>
            <Input id={fieldId('logoMethods')} value={otherText} placeholder="Напр.: шовкографія" onChange={(e) => setOther(e.target.value)} />
          </Field>
        )}
      </fieldset>
      <div role="group" aria-labelledby="kb-true-h" className="grid">
        <h2 id="kb-true-h" className="ui-list-h">
          Що правда про ваш посуд
        </h2>
        <div className="ui-checks mt-0">
          {CHECKS.map((c) => (
            <Checkbox key={c.key} name={c.key} label={c.label} hint={c.hint} checked={values[c.key]} onChange={(e) => set({ ...values, [c.key]: e.target.checked })} />
          ))}
        </div>
      </div>
    </>
  )
}

function Kontakty({ values, set, errors }: Props<'kontakty'>) {
  const v = values
  return (
    <>
      <Field variant="box" label="Адреса студії" htmlFor={fieldId('address')} error={errors.address}>
        <Input id={fieldId('address')} name="address" autoComplete="off" value={v.address} placeholder="Місто, вулиця, будинок" onChange={(e) => set({ ...v, address: e.target.value })} />
      </Field>
      <Field variant="box" label="Телефон студії" optional htmlFor={fieldId('phone')} hint="Для дзвінків від замовників; у запитах ми його не розсилаємо." error={errors.phone}>
        <Input id={fieldId('phone')} name="phone" type="tel" inputMode="tel" autoComplete="off" value={v.phone} placeholder="+380 …" onChange={(e) => set({ ...v, phone: e.target.value })} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field variant="box" label="Email студії" htmlFor={fieldId('email')} error={errors.email}>
          <Input id={fieldId('email')} name="email" type="email" inputMode="email" autoComplete="off" value={v.email} placeholder="studio@example.com" onChange={(e) => set({ ...v, email: e.target.value })} />
        </Field>
        <Field variant="box" label="Сайт" optional htmlFor={fieldId('website')} error={errors.website}>
          <Input id={fieldId('website')} name="website" type="url" inputMode="url" autoComplete="off" value={v.website} placeholder="https://…" onChange={(e) => set({ ...v, website: e.target.value })} />
        </Field>
      </div>
      <Field variant="box" label="Instagram" htmlFor={fieldId('instagram')} error={errors.instagram}>
        <Input id={fieldId('instagram')} name="instagram" inputMode="url" autoComplete="off" autoCapitalize="none" value={v.instagram} placeholder="@нік або посилання" onChange={(e) => set({ ...v, instagram: e.target.value })} />
      </Field>
      <ListEditor
        id={fieldId('instagramPosts')}
        heading={
          <>
            Пости для показу в профілі <small>до 3</small>
          </>
        }
        hint="Посилання на три пости, які найкраще показують роботи. Вони вбудовуються в профіль."
        noun="пост"
        addLabel="+ Додати пост"
        max={3}
        inputMode="url"
        placeholder="https://www.instagram.com/p/…"
        items={v.instagramPosts}
        errors={rowErrors(errors, 'instagramPosts', v.instagramPosts.length)}
        onChange={(instagramPosts) => set({ ...v, instagramPosts })}
      />
    </>
  )
}

/** The fields of one text section. `values` is typed by the section; the cast below keeps one switch for the editor. */
export function SectionFields({ section, values, set, errors, extras }: { section: TextSection; values: TextValues; set: (v: TextValues) => void; errors: Errors; extras: SectionExtras[TextSection] }) {
  switch (section) {
    case 'pro-studiyu':
      return <ProStudiyu values={values as SectionValues['pro-studiyu']} set={set} errors={errors} publicNow={(extras as SectionExtras['pro-studiyu']).publicNow} />
    case 'posluhy':
      return <Posluhy values={values as SectionValues['posluhy']} set={set} errors={errors} />
    case 'tsiny':
      return <Tsiny values={values as SectionValues['tsiny']} set={set} errors={errors} />
    case 'biznes':
      return <Biznes values={values as SectionValues['biznes']} set={set} errors={errors} />
    case 'kontakty':
      return <Kontakty values={values as SectionValues['kontakty']} set={set} errors={errors} />
  }
}
