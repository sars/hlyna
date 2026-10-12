import type { Metadata } from 'next'
import Link from 'next/link'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { notFound } from 'next/navigation'
import React from 'react'

import { ClaimForm } from '@/components/site/KabinetForms.client'
import { getStudioBySlug } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Заявка на профіль · Кабінет студії · Глина' }

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ studio?: string }> }) {
  const { studio: slug } = await searchParams
  const studio = slug ? await getStudioBySlug(slug) : null
  if (slug && !studio) notFound()
  if (!studio)
    return (
      <main className={cx(wrap, 'grid gap-4 pt-hero')}>
        <div className="grid max-w-narrow gap-4">
          <Kicker>Кабінет студії</Kicker>
          <h1 className="m-0 font-display text-h1">Керувати профілем студії</h1>
          <p className="m-0 max-w-read text-lead">
            Знайдіть свою студію в <Link href="/vyrobnyky">каталозі</Link> чи на <Link href="/mapa">мапі</Link>, відкрийте профіль і натисніть «Керувати профілем» у блоці «Це ваша студія?». Студії ще немає в каталозі? <Link href="/dlya-studiy">Додайте її</Link>. Вже маєте кабінет? <Link href="/kabinet/vhid">Увійти</Link>.
          </p>
        </div>
      </main>
    )
  return (
    <main className={cx(wrap, 'grid gap-4 pt-hero')}>
      <div className="grid max-w-narrow gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: studio.name, href: `/vyrobnyky/${studio.slug}` }, { label: 'Керувати профілем' }]} />
        <h1 className="m-0 font-display text-h1">Це ваша студія?</h1>
        <p className="m-0 max-w-read text-lead">Залиште ім’я і контакт. Ми перевіримо, що ви представляєте «{studio.name}», і надішлемо посилання до кабінету, де можна оновити опис, ціни, умови для бізнесу й додати фото.</p>
        <ClaimForm studio={{ slug: studio.slug as string, name: studio.name }} />
        <p className="m-0 text-sm text-ink-2">
          Вже маєте кабінет? <Link href="/kabinet/vhid">Увійти</Link>
        </p>
      </div>
    </main>
  )
}
