'use client'

import React, { useState } from 'react'

import { kButton, kField, kLabel } from './KabinetForms.client'

export type EditInitial = {
  slug: string
  name: string
  summary: string
  publicDescription: string
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

const MAX_PHOTOS = 10
const section = 'grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]'
const h = 'font-display m-0 text-sm tracking-wide uppercase'
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
      summary: g('summary'),
      publicDescription: g('publicDescription'),
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
        <p className={h}>Опис</p>
        <label className={kLabel}>
          Коротко, до 200 знаків (для карток і пошуку)
          <input name="summary" defaultValue={initial.summary} maxLength={200} className={kField} />
        </label>
        <label className={kLabel}>
          Опис студії
          <textarea name="publicDescription" defaultValue={initial.publicDescription} rows={8} className={kField} />
          <span className="font-normal">Пишіть фактами: що робите, з якої глини, які поливи, хто проводить заняття, для кого. Без «унікальний» і «найкращий» — конкретика переконує краще. Абзаци розділяйте порожнім рядком.</span>
        </label>
      </section>

      <section className={section}>
        <p className={h}>Що робите й продаєте</p>
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
              <button type="button" className="justify-self-start rounded-full px-3 py-1 text-[14px] text-umber hover:text-ink sm:justify-self-auto" aria-label="Прибрати рядок" onClick={() => setPrices(prices.filter((_, j) => j !== i))}>
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
        <p className={h}>Для бізнесу</p>
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
              <input type="checkbox" name={k} defaultChecked={initial.b2b[k]} className="mt-0.5 size-4 accent-[var(--color-terra)]" /> {l}
            </label>
          ))}
        </div>
      </section>

      <section className={section}>
        <p className={h}>Контакти (лише робочі)</p>
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
        <p className={h}>Фото ({total} з {MAX_PHOTOS})</p>
        <p className="m-0 text-sm text-umber">Ваші роботи, студія, заняття. Перше фото стане головним у профілі. Завантажуючи фото, ви дозволяєте показувати їх на сайті з підписом студії.</p>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {initial.photos
            .filter((p) => keep.includes(p.id))
            .map((p) => (
              <li key={p.id} className="grid gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt} className="aspect-square w-full rounded-xl object-cover" />
                <button type="button" className="text-left text-[13px] text-umber hover:text-ink" onClick={() => setKeep(keep.filter((id) => id !== p.id))}>
                  Прибрати
                </button>
              </li>
            ))}
          {newFiles.map((n, i) => (
            <li key={n.preview} className="grid gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.preview} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <input aria-label="Що на фото" value={n.alt} onChange={(e) => setNewFiles(newFiles.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Що на фото" className={`${kField} py-1.5 text-[13px]`} />
              <button type="button" className="text-left text-[13px] text-umber hover:text-ink" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}>
                Прибрати
              </button>
            </li>
          ))}
        </ul>
        {total < MAX_PHOTOS && (
          <label className={kLabel}>
            Додати фото (JPG, PNG або WebP, до 8 МБ)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="text-sm"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, MAX_PHOTOS - total)
                setNewFiles([...newFiles, ...files.map((file) => ({ file, alt: '', preview: URL.createObjectURL(file) }))])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </section>

      <section className={section}>
        <p className={h}>Instagram-пости для показу</p>
        <label className={kLabel}>
          До 3 посилань на пости, кожне з нового рядка
          <textarea name="instagramPosts" defaultValue={initial.instagramPosts.join('\n')} rows={3} placeholder="https://www.instagram.com/p/…" className={kField} />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={kButton}>
          {busy ? 'Зберігаємо…' : 'Зберегти зміни'}
        </button>
        {msg && (
          <p role="status" className={`m-0 text-sm ${msg.ok ? 'text-umber' : 'text-[var(--error)]'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  )
}
