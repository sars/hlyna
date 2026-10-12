'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'

// Cabinet forms are on paper: underline controls (`ui-control`), mono caps labels (`ui-flabel`), a ruled box instead of a card.
export const kField = 'ui-control'
export const kLabel = 'ui-flabel'
const box = 'grid grid-cols-1 gap-2 border-t-2 border-ink pt-4'

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
  if (!res.ok) throw new Error(json.error || 'Не вдалося. Спробуйте ще раз.')
  return json
}

/** «Це ваша студія?» claim: name, contact, confirmation, optional other profiles. */
export function ClaimForm({ studio }: { studio: { slug: string; name: string } }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<{ slug: string; name: string; city: string }[]>([])
  const [others, setOthers] = useState<{ slug: string; name: string }[]>([])

  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(() => {
      fetch(`/kabinet/api/studios?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((r: typeof hits) => setHits(r.filter((h) => h.slug !== studio.slug)))
        .catch(() => setHits([]))
    }, 250)
    return () => clearTimeout(t)
  }, [q, studio.slug])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setState('sending')
    setError('')
    try {
      await postJson('/kabinet/api/claim', {
        studio: studio.slug,
        name: f.get('name'),
        contact: f.get('contact'),
        represents: f.get('represents') === 'on',
        otherStudios: others.map((o) => o.slug),
        website2: f.get('website2'),
      })
      setState('done')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }

  if (state === 'done')
    return (
      <div className={box} role="status">
        <Kicker as="p">Заявку отримали</Kicker>
        <p className="m-0">Ми перевіримо, що контакт належить студії (зазвичай за публічним Instagram чи сайтом), і надішлемо посилання, щоб ви встановили пароль. Якщо контакт не збігається, попросимо написати нам з акаунта студії.</p>
      </div>
    )

  return (
    <form onSubmit={onSubmit} className={box} noValidate>
      <Kicker as="p">Керувати профілем «{studio.name}»</Kicker>
      <label className={kLabel}>
        Ваше ім’я
        <input name="name" required autoComplete="name" className={kField} />
      </label>
      <label className={kLabel}>
        Телефон, Telegram або email
        <input name="contact" required placeholder="+380… або @нік або ви@студія.ua" className={kField} />
      </label>
      <div className={kLabel}>
        Ще мої профілі (необов’язково, до 5)
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Почніть вводити назву" className={kField} aria-label="Пошук інших профілів" />
        {hits.length > 0 && q.length >= 2 && (
          <ul className="m-0 grid list-none gap-1 p-0">
            {hits.map((h) => (
              <li key={h.slug}>
                <button
                  type="button"
                  className="w-full border-b border-rule px-0 py-2 text-left text-[14px] font-normal text-ink normal-case hover:text-cobalt"
                  onClick={() => {
                    if (others.length < 5 && !others.some((o) => o.slug === h.slug)) setOthers([...others, h])
                    setQ('')
                    setHits([])
                  }}
                >
                  {h.name} <span className="text-ink-2">· {h.city}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {others.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {others.map((o) => (
              <li key={o.slug} className="flex items-center gap-1 rounded-btn px-2 py-1 font-mono text-[11px] tracking-[.04em] text-ink uppercase inset-ring-[1.5px] inset-ring-ink">
                {o.name}
                <button type="button" aria-label={`Прибрати ${o.name}`} className="font-bold text-ink-2" onClick={() => setOthers(others.filter((x) => x.slug !== o.slug))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <label className="flex items-start gap-2 py-2 text-sm text-ink">
        <input type="checkbox" name="represents" required className="mt-0.5 size-4 accent-cobalt" /> Я представляю цю студію
      </label>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="mt-2">
        <Button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Надсилаємо…' : 'Надіслати заявку'}
        </Button>
      </div>
      {error && <p className="ui-error m-0" role="alert">{error}</p>}
      <p className="m-0 text-[12.5px] text-ink-2">Після перевірки ви зможете самі оновлювати опис, ціни, умови для бізнесу й додавати фото. Профіль безкоштовний.</p>
    </form>
  )
}

/** Login or set-password form. */
export function AuthForm({ mode, token }: { mode: 'login' | 'password'; token?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (mode === 'password' && f.get('password') !== f.get('password2')) return setError('Паролі не збігаються.')
    setBusy(true)
    setError('')
    try {
      await postJson(mode === 'login' ? '/kabinet/api/login' : '/kabinet/api/password', { token, login: f.get('login'), password: f.get('password') })
      router.push('/kabinet')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  return (
    <form onSubmit={onSubmit} className={`${box} max-w-[440px]`} noValidate>
      <label className={kLabel}>
        {mode === 'login' ? 'Email або телефон' : 'Логін: ваш email або телефон'}
        <input name="login" required autoComplete="username" className={kField} />
      </label>
      <label className={kLabel}>
        Пароль{mode === 'password' ? ' (щонайменше 10 символів)' : ''}
        <input name="password" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={kField} />
      </label>
      {mode === 'password' && (
        <label className={kLabel}>
          Пароль ще раз
          <input name="password2" type="password" required autoComplete="new-password" className={kField} />
        </label>
      )}
      <div className="mt-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Зберегти й увійти'}
        </Button>
      </div>
      {error && <p className="ui-error m-0" role="alert">{error}</p>}
    </form>
  )
}
