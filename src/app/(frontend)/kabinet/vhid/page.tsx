import { redirect } from 'next/navigation'
import React from 'react'

import { container } from '@/components/site/Bits'
import { AuthForm } from '@/components/site/KabinetForms.client'
import { kabinetOwner } from '@/lib/kabinetData'

export default async function Login() {
  if (await kabinetOwner()) redirect('/kabinet')
  return (
    <main className={`${container} grid gap-5 pt-8 pb-16`}>
      <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">Вхід до кабінету студії</h1>
      <p className="m-0 max-w-[60ch]">Кабінет для студій, які підтвердили свій профіль. Ще не маєте доступу? Відкрийте профіль своєї студії й натисніть «Це ваша студія? Керуйте профілем».</p>
      <AuthForm mode="login" />
      <p className="m-0 text-sm text-umber">Забули пароль? Напишіть нам через форму на сайті — надішлемо нове посилання.</p>
    </main>
  )
}
