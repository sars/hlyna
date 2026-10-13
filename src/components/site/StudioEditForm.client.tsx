'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'

import { kField, kLabel } from './KabinetForms.client'
import { MAX_OWNER_PHOTOS } from '@/shared/options'

export type EditInitial = {
  slug: string
  name: string
  publicNow: string
  ownerAbout: string
  ownerNews: string
  ownerQuote: string
  services: string[]
  products: string[]
  prices: { text: string; date: string; source?: string }[]
  address: string
  website: string
  instagram: string
  phone: string
  email: string
  b2b: { minOrder: string; leadTime: string; logoMethods: string[]; foodSafe: boolean; dishwasherSafe: boolean; worksWithHoreca: boolean; worksWithCorporate: boolean }
  photos: { id: number; url: string; alt: string }[]
  instagramPosts: string[]
  pending: boolean
}

const section = 'grid grid-cols-1 gap-2 border-t-2 border-ink pt-4'
const split = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** Owner's edit form. Saves a draft; the site shows it after our review. */
export function StudioEditForm({ initial }: { initial: EditInitial }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(initial.pending ? { ok: true, text: 'Попередні зміни ще на перевірці. Нові збереження додадуться до них.' } : null)
  const [prices, setPrices] = useState(initial.prices.length ? initial.prices : [{ text: '', date: '' }])
  const [keep, setKeep] = useState(initial.photos.map((p) => p.id))
  const [newFiles, setNewFiles] = useState<{ file: File; alt: string; preview: string }[]>([])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const g = (k: string) => String(f.get(k) ?? '')
    if (newFiles.some((n) => !n.alt.trim())) return setMsg({ ok: false, text: 'Додайте короткий опис до кожного нового фото (що на ньому).' })
    const data = {
      ownerAbout: g('ownerAbout'),
      ownerNews: g('ownerNews'),
      ownerQuote: g('ownerQuote'),
      services: split(g('services')),
      products: split(g('products')),
      prices: prices.filter((p) => p.text.trim()),
      address: g('address'),
      website: g('website'),
      instagram: g('instagram'),
      phone: g('phone'),
      email: g('email'),
      b2b: {
        minOrder: g('minOrder'),
        leadTime: g('leadTime'),
        logoMethods: split(g('logoMethods')),
        foodSafe: f.get('foodSafe') === 'on',
        dishwasherSafe: f.get('dishwasherSafe') === 'on',
        worksWithHoreca: f.get('worksWithHoreca') === 'on',
        worksWithCorporate: f.get('worksWithCorporate') === 'on',
      },
      keepPhotos: keep,
      instagramPosts: split(g('instagramPosts')),
    }
    const body = new FormData()
    body.set('data', JSON.stringify(data))
    for (const n of newFiles) {
      body.append('newPhotos', n.file)
      body.append('newAlts', n.alt)
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/kabinet/api/studio/${initial.slug}`, { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Не вдалося зберегти.')
      setMsg({ ok: true, text: 'Збережено. Ми переглянемо зміни й опублікуємо їх, зазвичай протягом доби.' })
      window.setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const total = keep.length + newFiles.length

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5" noValidate>
      <section className={section}>
        <Kicker as="p">Про студію</Kicker>
        {initial.publicNow && (
          <details className="bg-paper-2 px-3.5 py-2.5 text-[14px]">
            <summary className="cursor-pointer font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">Що зараз написано на сайті</summary>
            <p className="m-0 mt-2 whitespace-pre-line">{initial.publicNow}</p>
          </details>
        )}
        <label className={kLabel}>
          Розкажіть про студію своїми словами
          <textarea name="ownerAbout" defaultValue={initial.ownerAbout} rows={7} className={kField} />
          <span>Що робите, з якої глини, які поливи, хто веде заняття, для кого, що вирізняє. Ми не публікуємо цей текст напряму: редактор перепише його в єдиному стилі сайту.</span>
        </label>
        <label className={kLabel}>
          Новини студії (нова колекція, формат, розклад, ярмарок)
          <textarea name="ownerNews" defaultValue={initial.ownerNews} rows={3} maxLength={600} className={kField} />
          <span>Публікуємо як є, з підписом «Новини від студії» і датою, після короткої перевірки. Через пів року новина ховається: оновіть її, коли буде щось нове. Пишіть українською, з датами подій.</span>
        </label>
        <label className={kLabel}>
          Одне речення від студії для цитати (до 200 знаків, необов’язково)
          <input name="ownerQuote" defaultValue={initial.ownerQuote} maxLength={200} placeholder="Наприклад: «Ліпимо повільно й даємо глині говорити»" className={kField} />
          <span>Показується як «Студія про себе» після нашого схвалення.</span>
        </label>
      </section>

      <section className={section}>
        <Kicker as="p">Що робите й продаєте</Kicker>
        <label className={kLabel}>
          Послуги (кожна з нового рядка)
          <textarea name="services" defaultValue={initial.services.join('\n')} rows={5} placeholder={'Майстер-клас на гончарному колі\nКорпоративи до 12 людей'} className={kField} />
        </label>
        <label className={kLabel}>
          Вироби (кожен з нового рядка)
          <textarea name="products" defaultValue={initial.products.join('\n')} rows={4} placeholder={'Чашки 300 мл\nТарілки 26 см'} className={kField} />
        </label>
        <div className={kLabel}>
          Ціни (з роком або місяцем, щоб відвідувачі бачили, що вони актуальні)
          {prices.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
              <input aria-label="Ціна" value={p.text} onChange={(e) => setPrices(prices.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Майстер-клас на колі, 2 год — 1 200 грн з особи" className={kField} />
              <input aria-label="Коли актуально" value={p.date} onChange={(e) => setPrices(prices.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} placeholder="жовтень 2026" className={kField} />
              <button type="button" className="justify-self-start px-0 py-1 text-[14px] text-ink-2 hover:text-ink sm:justify-self-auto" aria-label="Прибрати рядок" onClick={() => setPrices(prices.filter((_, j) => j !== i))}>
                Прибрати
              </button>
            </div>
          ))}
          <button type="button" className="justify-self-start text-[14px] text-cobalt" onClick={() => setPrices([...prices, { text: '', date: '' }])}>
            + Додати ціну
          </button>
        </div>
      </section>

      <section className={section}>
        <Kicker as="p">Для бізнесу</Kicker>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className={kLabel}>
            Мінімальне замовлення
            <input name="minOrder" defaultValue={initial.b2b.minOrder} placeholder="від 20 чашок" className={kField} />
          </label>
          <label className={kLabel}>
            Термін виготовлення партії
            <input name="leadTime" defaultValue={initial.b2b.leadTime} placeholder="4–6 тижнів" className={kField} />
          </label>
        </div>
        <label className={kLabel}>
          Як наносите логотип (кожен спосіб з нового рядка)
          <textarea name="logoMethods" defaultValue={initial.b2b.logoMethods.join('\n')} rows={3} placeholder={'Штамп\nДеколь\nРучний розпис'} className={kField} />
        </label>
        <div className="grid grid-cols-1 gap-2 text-sm text-ink sm:grid-cols-2">
          {(
            [
              ['foodSafe', 'Полива безпечна для їжі'],
              ['dishwasherSafe', 'Можна в посудомийку'],
              ['worksWithHoreca', 'Робимо посуд для закладів'],
              ['worksWithCorporate', 'Беремо корпоративні замовлення'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-start gap-2">
              <input type="checkbox" name={k} defaultChecked={initial.b2b[k]} className="mt-0.5 size-4 accent-cobalt" /> {l}
            </label>
          ))}
        </div>
      </section>

      <section className={section}>
        <Kicker as="p">Контакти (лише робочі)</Kicker>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className={`${kLabel} sm:col-span-2`}>
            Адреса студії
            <input name="address" defaultValue={initial.address} placeholder="вул. …, Київ" className={kField} />
          </label>
          <label className={kLabel}>
            Сайт
            <input name="website" defaultValue={initial.website} className={kField} />
          </label>
          <label className={kLabel}>
            Instagram
            <input name="instagram" defaultValue={initial.instagram} placeholder="https://www.instagram.com/…" className={kField} />
          </label>
          <label className={kLabel}>
            Телефон студії
            <input name="phone" defaultValue={initial.phone} inputMode="tel" className={kField} />
          </label>
          <label className={kLabel}>
            Email студії
            <input name="email" type="email" defaultValue={initial.email} className={kField} />
          </label>
        </div>
      </section>

      <section className={section}>
        <Kicker as="p">Фото ({total} з {MAX_OWNER_PHOTOS})</Kicker>
        <p className="m-0 text-sm text-ink-2">Ваші роботи, студія, заняття. Перше фото стане головним у профілі. Завантажуючи фото, ви дозволяєте показувати їх на сайті з підписом студії.</p>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {initial.photos
            .filter((p) => keep.includes(p.id))
            .map((p) => (
              <li key={p.id} className="grid gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt} className="aspect-square w-full object-cover" />
                <button type="button" className="text-left text-[13px] text-ink-2 hover:text-ink" onClick={() => setKeep(keep.filter((id) => id !== p.id))}>
                  Прибрати
                </button>
              </li>
            ))}
          {newFiles.map((n, i) => (
            <li key={n.preview} className="grid gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.preview} alt="" className="aspect-square w-full object-cover" />
              <input aria-label="Що на фото" value={n.alt} onChange={(e) => setNewFiles(newFiles.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Що на фото" className={`${kField} py-1.5 text-[13px]`} />
              <button type="button" className="text-left text-[13px] text-ink-2 hover:text-ink" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}>
                Прибрати
              </button>
            </li>
          ))}
        </ul>
        {total < MAX_OWNER_PHOTOS && (
          <label className={kLabel}>
            Додати фото (JPG, PNG або WebP, до 8 МБ)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="text-sm"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, MAX_OWNER_PHOTOS - total)
                setNewFiles([...newFiles, ...files.map((file) => ({ file, alt: '', preview: URL.createObjectURL(file) }))])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </section>

      <section className={section}>
        <Kicker as="p">Instagram-пости для показу</Kicker>
        <label className={kLabel}>
          До 3 посилань на пости, кожне з нового рядка
          <textarea name="instagramPosts" defaultValue={initial.instagramPosts.join('\n')} rows={3} placeholder="https://www.instagram.com/p/…" className={kField} />
        </label>
      </section>

      <div className="grid gap-3 border-t-2 border-ink pt-4">
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Зберігаємо…' : 'Зберегти зміни'}
          </Button>
        </div>
        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={`m-0 ${msg.ok ? 'text-[15px]' : 'ui-error'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  )
}
