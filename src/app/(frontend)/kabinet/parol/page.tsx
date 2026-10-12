import React from 'react'

import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { AuthForm } from '@/components/site/KabinetForms.client'

export default async function SetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <main className={cx(wrap, 'grid gap-4 pt-hero pb-section')}>
      <div className="grid max-w-narrow gap-4">
        <Kicker>Кабінет студії</Kicker>
        <h1 className="m-0 font-display text-h1">Пароль до кабінету студії</h1>
        {token ? (
          <>
            <p className="m-0 max-w-read text-lead">Оберіть логін — ваш email або номер телефону — і пароль. Посилання спрацьовує один раз і діє 7 днів.</p>
            <AuthForm mode="password" token={token} />
          </>
        ) : (
          <p className="m-0 max-w-read text-lead">Посилання неповне. Відкрийте його з нашого повідомлення ще раз.</p>
        )}
      </div>
    </main>
  )
}
