import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { AuthForm } from '@/components/site/KabinetForms.client'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { kabinetOwner } from '@/lib/kabinetData'

export const metadata: Metadata = { title: 'Вхід' }

export default async function Login() {
  if (await kabinetOwner()) redirect('/kabinet')
  return (
    <main className={cx(wrap, 'flex-1 pt-hero pb-section')}>
      <div className="grid max-w-[520px] gap-4">
        <header className="grid gap-2">
          <Kicker>Кабінет студії</Kicker>
          <h1 className="m-0 font-display text-[clamp(24px,3.2vw,40px)] leading-[1.08] font-semibold tracking-[-.01em]">Вхід</h1>
          <p className="m-0 text-[17px] leading-[1.5] text-ink-2">Для студій, які підтвердили свій профіль у каталозі.</p>
        </header>
        <AuthForm mode="login" />
        <p className="m-0 text-[15.5px] leading-[1.5] text-ink-2">
          Забули пароль? <Link href="/zapyt?vid=studiya">Напишіть нам</Link> — надішлемо нове посилання. Ще не маєте кабінету? Відкрийте профіль своєї студії на сайті й натисніть «Це ваша студія?».
        </p>
      </div>
    </main>
  )
}
