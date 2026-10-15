'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input } from '@/components/ui/Fields'
import { Kicker } from '@/components/ui/Kicker'
import { PasswordInput } from '@/components/ui/PasswordInput.client'

// Cabinet forms are on paper: white boxes (`Field variant="box"`, SYSTEM.md §4.4), a ruled block instead of a card.
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
    <form method="post" onSubmit={onSubmit} className={box} noValidate>
      <Kicker as="p">Керувати профілем «{studio.name}»</Kicker>
      <Field variant="box" label="Ваше ім’я" htmlFor="claim-name">
        <Input id="claim-name" name="name" required autoComplete="name" />
      </Field>
      <Field variant="box" label="Телефон, Telegram або email" htmlFor="claim-contact">
        <Input id="claim-contact" name="contact" required autoComplete="off" placeholder="+380… або @нік або ви@студія.ua" />
      </Field>
      <Field variant="box" label="Ще мої профілі" optional hint="До 5. Почніть вводити назву студії." htmlFor="claim-others">
        <Input id="claim-others" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Почніть вводити назву" />
      </Field>
      {hits.length > 0 && q.length >= 2 && (
        <ul className="m-0 grid list-none gap-0 p-0">
          {hits.map((h) => (
            <li key={h.slug}>
              <button
                type="button"
                className="min-h-11 w-full cursor-pointer border-b border-rule px-0 py-2 text-left text-[15px] font-normal text-ink hover:text-cobalt"
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
      <div className="ui-checks">
        <Checkbox name="represents" required label="Я представляю цю студію" />
      </div>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="mt-2">
        <Button type="submit" disabled={state === 'sending'} className="w-full sm:w-auto">
          {state === 'sending' ? 'Надсилаємо…' : 'Надіслати заявку'}
        </Button>
      </div>
      {error && <p className="ui-error m-0 text-[13.5px]" role="alert">{error}</p>}
      <p className="m-0 text-[13.5px] text-ink-2">Після перевірки ви зможете самі оновлювати опис, ціни, умови для бізнесу й додавати фото. Профіль безкоштовний.</p>
    </form>
  )
}

/** Login or set-password form (the white boxes of the cabinet; «Показати» on the passwords). */
export function AuthForm({ mode, token }: { mode: 'login' | 'password'; token?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ field: 'login' | 'password' | 'password2'; text: string } | null>(null)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const fail = (field: 'login' | 'password' | 'password2', text: string) => {
      setError({ field, text })
      setBusy(false)
      requestAnimationFrame(() => document.getElementById(`auth-${field === 'password2' ? 'password' : field}`)?.focus())
    }
    if (mode === 'password' && f.get('password') !== f.get('password2')) return fail('password2', 'Паролі не збігаються. Перевірте обидва поля.')
    setBusy(true)
    setError(null)
    try {
      await postJson(mode === 'login' ? '/kabinet/api/login' : '/kabinet/api/password', { token, login: f.get('login'), password: f.get('password') })
      router.push('/kabinet')
      router.refresh()
    } catch (err) {
      fail('password', (err as Error).message)
    }
  }
  const mismatch = error?.field === 'password2'
  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-1.5" noValidate>
      <Field
        variant="box"
        label={mode === 'login' ? 'Email або телефон' : 'Логін — ваш email або телефон'}
        hint={mode === 'password' ? 'Ним ви будете входити.' : undefined}
        htmlFor="auth-login"
        error={error?.field === 'login' ? error.text : undefined}
      >
        <Input id="auth-login" name="login" required inputMode="text" autoComplete="username" autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field
        variant="box"
        label="Пароль"
        hint={mode === 'password' ? 'Щонайменше 10 символів. Підійде коротка фраза, яку легко запам’ятати.' : undefined}
        htmlFor="auth-password"
        error={error?.field === 'password' ? error.text : undefined}
      >
        <PasswordInput id="auth-password" name="password" required aria-invalid={mismatch || undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </Field>
      {mode === 'password' && (
        <Field variant="box" label="Пароль ще раз" htmlFor="auth-password2" error={mismatch ? error.text : undefined}>
          <PasswordInput id="auth-password2" name="password2" required autoComplete="new-password" />
        </Field>
      )}
      <div className="mt-2.5">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Зберегти й увійти'}
        </Button>
      </div>
    </form>
  )
}
