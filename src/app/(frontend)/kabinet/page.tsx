import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { container } from '@/components/site/Bits'
import { kabinetOwner } from '@/lib/kabinetData'

export default async function Kabinet() {
  const owner = await kabinetOwner()
  if (!owner) redirect('/kabinet/vhid')
  const studios = owner.studios
  return (
    <main className={`${container} grid gap-6 pt-8 pb-16`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">Кабінет студії</h1>
        <form action="/kabinet/api/logout" method="post">
          <button type="submit" className="text-sm text-umber hover:text-ink">Вийти</button>
        </form>
      </div>
      <p className="m-0 max-w-[65ch]">Вітаємо, {owner.name}. Тут ви оновлюєте опис, ціни, умови для бізнесу й фото своїх профілів. Зміни з’являються на сайті після нашої перевірки.</p>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {studios.map((s) => (
          <li key={s.id} className="grid gap-2 rounded-2xl bg-card p-4">
            <b>{s.name}</b>
            {s.pending && <span className="text-sm text-umber">Зміни на перевірці</span>}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={`/kabinet/studiya/${s.slug}`}>Редагувати</Link>
              <Link href={`/vyrobnyky/${s.slug}`}>Профіль на сайті</Link>
            </div>
          </li>
        ))}
      </ul>
      {!studios.length && <p className="m-0 text-umber">До кабінету ще не додано студій. Напишіть нам.</p>}
    </main>
  )
}
