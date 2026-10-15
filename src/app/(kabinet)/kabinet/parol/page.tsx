import type { Metadata } from 'next'
import React from 'react'

import { AuthForm } from '@/components/site/KabinetForms.client'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'

export const metadata: Metadata = { title: 'Створіть пароль' }

export default async function SetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <main className={cx(wrap, 'flex-1 pt-hero pb-section')}>
      <div className="grid max-w-[520px] gap-4">
        <header className="grid gap-2">
          <Kicker>Кабінет студії</Kicker>
          <h1 className="m-0 font-display text-[clamp(24px,3.2vw,40px)] leading-[1.08] font-semibold tracking-[-.01em]">Створіть пароль</h1>
          <p className="m-0 text-[17px] leading-[1.5] text-ink-2">{token ? 'Посилання з нашого повідомлення діє 7 днів і спрацьовує один раз.' : 'Посилання неповне. Відкрийте його з нашого повідомлення ще раз.'}</p>
        </header>
        {token && <AuthForm mode="password" token={token} />}
      </div>
    </main>
  )
}
