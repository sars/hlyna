import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { RequestForm } from '@/components/site/RequestForm.client'
import { site } from '@/content/site'
import { getAllStudios } from '@/lib/catalog'

type Search = Promise<{ vid?: string; what?: string; misto?: string }>

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { vid } = await searchParams
  if (vid === 'studiya')
    return {
      title: 'Додати або оновити студію в каталозі',
      description: 'Профіль студії кераміки в каталозі «Глина» безкоштовний. Надішліть назву, місто, Instagram чи сайт і що змінити — ми перевіримо й оновимо профіль.',
      alternates: { canonical: '/dlya-studiy' },
      robots: { index: false },
    }
  return {
    title: 'Запит до керамічних студій: посуд, подарунки, майстер-класи',
    description:
      'Опишіть, що потрібно, кількість і термін — ми передамо запит українським керамічним студіям, які роблять саме таке. Для замовника безкоштовно.',
    alternates: { canonical: '/zapyt' },
  }
}

export default async function RequestPage({ searchParams }: { searchParams: Search }) {
  const { vid } = await searchParams
  const studio = vid === 'studiya'
  const cityNames: Record<string, string> = {}
  for (const s of await getAllStudios()) if (s.cityDoc?.slug) cityNames[s.cityDoc.slug] = s.cityDoc.name

  return (
    <main className="mx-auto grid grid-cols-1 max-w-[1200px] gap-8 px-4 pt-11 pb-16 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 content-start gap-4">
        {studio ? (
          <>
            <span className="kicker">Для студій і майстрів</span>
            <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Додати або оновити студію</h1>
            <p className="m-0 text-lg text-umber">Профіль у каталозі безкоштовний. Напишіть назву, місто, Instagram чи сайт і що додати або виправити: адресу, ціни, формати, умови для бізнесу. Ми перевіримо й оновимо профіль, фото показуємо лише з вашої згоди.</p>
            <ul className="m-0 grid grid-cols-1 gap-2 pl-5">
              <li>Місця в каталозі не продаються: порядок не залежить від оплати.</li>
              <li>{site.model}</li>
            </ul>
          </>
        ) : (
          <>
            <span className="kicker">Один запит — кілька пропозицій</span>
            <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">Отримати пропозиції від студій</h1>
            <p className="m-0 text-lg text-umber">
              Опишіть, що потрібно: посуд для закладу, чашки з логотипом, подарунки для команди, корпоратив з ліплення з глини чи майстер-клас. Ми передамо запит студіям, які роблять саме таке, і вони відповідатимуть вам напряму.
            </p>
            <ul className="m-0 grid grid-cols-1 gap-2 pl-5">
              <li>Шукаєте подарунок, майстер-клас для двох чи дитяче свято? Ця форма теж для вас: оберіть «Майстер-клас» або «Інше», вкажіть місто й дату.</li>
              <li>Терміни виготовлення партії — переважно {site.lead.batch}.</li>
              <li>{site.model}</li>
              <li id="dlya-studiy">
                Студія чи майстер? <Link href="/zapyt?vid=studiya">Додайте або оновіть профіль</Link> — це безкоштовно.
              </li>
            </ul>
          </>
        )}
      </div>
      <RequestForm sourcePage={studio ? '/zapyt?vid=studiya' : '/zapyt'} forStudio={studio} cityNames={cityNames} />
    </main>
  )
}
