'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { FormField } from '@/components/panel/inhouse/form-field'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'

/** Staff sign-in: Better Auth email + password (rate limit and lockout live on the server). */
export function SignInForm() {
  const router = useRouter()
  const next = useSearchParams()?.get('next')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setBusy(true)
        setError(undefined)
        const res = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? ''), rememberMe: true }),
        }).catch(() => null)
        if (res?.ok) {
          router.replace(next?.startsWith('/panel') ? next : '/panel')
          router.refresh()
          return
        }
        setBusy(false)
        setError(res?.status === 429 ? t('auth.locked') : res?.status === 403 ? t('auth.off') : res?.status === 401 ? t('auth.invalid') : t('auth.error'))
      }}
    >
      <fieldset disabled={busy} className="space-y-4">
        <FormField id="email" label={t('auth.email')}>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </FormField>
        <FormField id="password" label={t('auth.password')} error={error}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(error)} />
        </FormField>
        <Button type="submit" className="w-full">
          {busy ? t('auth.submitting') : t('auth.submit')}
        </Button>
      </fieldset>
    </form>
  )
}

/** Staff set their password from a one-time link (no e-mail service: the link is forwarded by hand). */
export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setBusy(true)
        setError(undefined)
        const res = await fetch('/api/panel/auth/set-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, login: String(form.get('login') ?? '').trim(), password: String(form.get('password') ?? '') }),
        }).catch(() => null)
        if (res?.ok) {
          router.replace('/panel')
          router.refresh()
          return
        }
        const json = (await res?.json().catch(() => null)) as { error?: string; message?: string } | null
        setBusy(false)
        setError(json?.error ?? json?.message ?? t('auth.error'))
      }}
    >
      <fieldset disabled={busy} className="space-y-4">
        <FormField id="login" label={t('auth.login')}>
          <Input id="login" name="login" type="email" defaultValue={email.endsWith('.invalid') ? '' : email} autoComplete="username" required />
        </FormField>
        <FormField id="password" label={t('auth.newPassword')} error={error}>
          <Input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required aria-invalid={Boolean(error)} />
        </FormField>
        <Button type="submit" className="w-full">
          {busy ? t('action.saving') : t('auth.setSubmit')}
        </Button>
      </fieldset>
    </form>
  )
}
