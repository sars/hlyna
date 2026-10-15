import { redirect } from 'next/navigation'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import Link from 'next/link'
import React from 'react'

import { AuthForm } from '@/components/site/KabinetForms.client'
import { kabinetOwner } from '@/lib/kabinetData'

export default async function Login() {
  if (await kabinetOwner()) redirect('/kabinet')
  return (
    <main className={cx(wrap, 'grid gap-4 pt-hero')}>
      <div className="grid max-w-narrow gap-4">
        <Kicker>Кабінет студії</Kicker>
        <h1 className="m-0 font-display text-h1">Вхід до кабінету студії</h1>
        <p className="m-0 max-w-read text-lead">Кабінет для студій, які підтвердили свій профіль. Ще не маєте доступу? Відкрийте профіль своєї студії й натисніть «Це ваша студія? Керуйте профілем».</p>
        <AuthForm mode="login" />
        <p className="m-0 text-sm text-ink-2">Забули пароль? <Link href="/zapyt?vid=studiya">Напишіть нам через форму на сайті</Link> — надішлемо нове посилання.</p>
      </div>
    </main>
  )
}
