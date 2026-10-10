import type { Metadata } from 'next'
import React from 'react'

import { RequestForm } from '@/components/site/RequestForm.client'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: 'Запит на посуд, подарунки чи корпоратив з кераміки',
  description:
    'Опишіть, що потрібно, кількість і термін — ми передамо запит 3–5 українським керамічним студіям, які роблять такі вироби. Для замовника безкоштовно.',
  alternates: { canonical: '/zapyt' },
}

export default function RequestPage() {
  return (
    <main className="mx-auto grid grid-cols-1 max-w-[1200px] gap-8 px-4 pt-11 pb-16 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 content-start gap-4">
        <span className="kicker">Один запит — кілька пропозицій</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Отримати пропозиції від студій</h1>
        <p className="m-0 text-lg text-umber">
          Опишіть, що потрібно: посуд для закладу, чашки з логотипом, подарунки для команди чи корпоратив з ліплення з глини. Ми передамо запит 3–5 студіям, які роблять такі вироби, і вони відповідатимуть вам напряму.
        </p>
        <ul className="m-0 grid grid-cols-1 gap-2 pl-5">
          <li>Зазвичай студії відповідають за 1–3 робочі дні.</li>
          <li>Терміни виготовлення партії — переважно {site.lead.batch}.</li>
          <li>{site.model}</li>
          <li id="dlya-studiy">Студія чи майстер? Профіль у каталозі безкоштовний: напишіть через цю ж форму (поле «Що потрібно» — «Інше»), додайте Instagram чи сайт.</li>
        </ul>
      </div>
      <RequestForm sourcePage="/zapyt" />
    </main>
  )
}
