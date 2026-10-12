import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { RequestForm } from '@/components/site/RequestForm.client'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Kicker } from '@/components/ui/Kicker'
import { Updated } from '@/components/ui/Updated'
import { cx, wrap } from '@/components/ui/layout'
import { site } from '@/content/site'
import { getAllWithShops } from '@/lib/catalog'

type Search = Promise<{ vid?: string; what?: string; misto?: string }>

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { vid } = await searchParams
  if (vid === 'keys')
    return { title: 'Виправити або зняти кейс', description: 'Повідомте про неточність у кейсі студії або попросіть його зняти.', alternates: { canonical: '/zapyt' }, robots: { index: false } }
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
  for (const s of await getAllWithShops()) if (s.cityDoc?.slug) cityNames[s.cityDoc.slug] = s.cityDoc.name

  const dash = "before:text-terracotta-text before:content-['—_']"
  const crumb = vid === 'keys' ? 'Виправити або зняти кейс' : studio ? 'Додати або оновити студію' : 'Запит студіям'
  return (
    <main className={cx(wrap, 'pt-hero')}>
      <div className="grid max-w-narrow gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: crumb }]} />
        {vid === 'keys' ? (
          <>
            <Kicker>Кейси студій</Kicker>
            <h1 className="m-0 font-display text-h1">Виправити або зняти кейс</h1>
            <p className="m-0 text-lead">Кейси ми пишемо за відкритими джерелами й позначаємо дату перевірки. Якщо ви зі студії чи від замовника й бачите неточність або не хочете, щоб кейс був на сайті, напишіть нам — ми перевіримо й виправимо або знімемо його.</p>
          </>
        ) : studio ? (
          <>
            <Kicker>Для студій і майстрів</Kicker>
            <h1 className="m-0 font-display text-h1">Додати або оновити студію</h1>
            <p className="m-0 text-lead">Профіль у каталозі безкоштовний. Напишіть назву, місто, Instagram чи сайт і що додати або виправити: адресу, ціни, формати, умови для бізнесу. Ми перевіримо й оновимо профіль, фото показуємо лише з вашої згоди.</p>
          </>
        ) : (
          <>
            <Kicker>Один запит — кілька пропозицій</Kicker>
            <h1 className="m-0 font-display text-h1">Отримати пропозиції від студій</h1>
            <p className="m-0 text-lead">
              Опишіть, що потрібно: посуд для закладу, чашки з логотипом, подарунки для команди, корпоратив з ліплення з глини чи майстер-клас. Ми передамо запит студіям, які роблять саме таке, і вони відповідатимуть вам напряму.
            </p>
          </>
        )}
        <Updated />
        <div className="pt-2">
          <RequestForm sourcePage={studio ? '/zapyt?vid=studiya' : '/zapyt'} forStudio={studio} cityNames={cityNames} />
        </div>
        {vid !== 'keys' && (
          <section aria-labelledby="next" className="grid gap-3 pt-4">
            <h2 id="next" className="m-0 border-b-2 border-ink pb-2 font-display text-[17px] leading-[1.15] font-semibold">
              Що далі
            </h2>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {studio ? (
                <>
                  <li className={dash}>Місця в каталозі не продаються: порядок не залежить від оплати.</li>
                  <li className={dash}>{site.model}</li>
                </>
              ) : (
                <>
                  <li className={dash}>Шукаєте подарунок, майстер-клас для двох чи дитяче свято? Ця форма теж для вас: оберіть «Майстер-клас» або «Інше», вкажіть місто й дату.</li>
                  <li className={dash}>Терміни виготовлення партії — переважно {site.lead.batch}.</li>
                  <li className={dash}>{site.model}</li>
                  <li id="dlya-studiy" className={dash}>
                    Студія чи майстер? <Link href="/zapyt?vid=studiya">Додайте або оновіть профіль</Link> — це безкоштовно.
                  </li>
                </>
              )}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
