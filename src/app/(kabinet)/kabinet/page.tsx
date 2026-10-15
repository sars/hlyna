import Link from 'next/link'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { redirect } from 'next/navigation'
import React from 'react'

import { kabinetOwner } from '@/lib/kabinetData'

export default async function Kabinet() {
  const owner = await kabinetOwner()
  if (!owner) redirect('/kabinet/vhid')
  const studios = owner.studios
  return (
    <main className={cx(wrap, 'grid gap-4 pt-hero')}>
      <div className="grid max-w-narrow gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1.5">
            <Kicker>Кабінет</Kicker>
            <h1 className="m-0 font-display text-h1">Кабінет студії</h1>
          </div>
          <form action="/kabinet/api/logout" method="post">
            <button type="submit" className="cursor-pointer font-mono text-xs tracking-[.06em] text-ink-2 uppercase hover:text-cobalt">
              Вийти
            </button>
          </form>
        </div>
        <p className="m-0 max-w-read text-lead">Вітаємо, {owner.name}. Тут ви оновлюєте опис, ціни, умови для бізнесу й фото своїх профілів. Зміни з’являються на сайті після нашої перевірки.</p>
        <ul className="m-0 grid list-none border-t-2 border-ink p-0">
          {studios.map((s) => (
            <li key={s.id} className="grid gap-1 border-b border-rule py-3.5">
              <b className="font-display text-base leading-[1.2] font-semibold">{s.name}</b>
              {s.pending && <span className="text-sm text-ink-2">Зміни на перевірці</span>}
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href={`/kabinet/studiya/${s.slug}`}>Редагувати</Link>
                <Link href={`/vyrobnyky/${s.slug}`}>Профіль на сайті</Link>
              </div>
            </li>
          ))}
        </ul>
        {!studios.length && <p className="m-0 text-ink-2">До кабінету ще не додано студій. Напишіть нам.</p>}
      </div>
    </main>
  )
}
