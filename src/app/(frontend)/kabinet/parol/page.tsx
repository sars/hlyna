import React from 'react'

import { container } from '@/components/site/Bits'
import { AuthForm } from '@/components/site/KabinetForms.client'

export default async function SetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <main className={`${container} grid gap-5 pt-8 pb-16`}>
      <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">Пароль до кабінету студії</h1>
      {token ? (
        <>
          <p className="m-0 max-w-[60ch]">Оберіть логін — ваш email або номер телефону — і пароль. Посилання спрацьовує один раз і діє 7 днів.</p>
          <AuthForm mode="password" token={token} />
        </>
      ) : (
        <p className="m-0">Посилання неповне. Відкрийте його з нашого повідомлення ще раз.</p>
      )}
    </main>
  )
}
