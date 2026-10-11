import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container } from '@/components/site/Bits'
import { ClaimForm } from '@/components/site/KabinetForms.client'
import { getStudioBySlug } from '@/lib/catalog'

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ studio?: string }> }) {
  const { studio: slug } = await searchParams
  const studio = slug ? await getStudioBySlug(slug) : null
  if (!studio) notFound()
  return (
    <main className={`${container} grid gap-5 pt-8 pb-16`}>
      <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: studio.name, href: `/vyrobnyky/${studio.slug}` }, { label: 'Керувати профілем' }]} />
      <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">Це ваша студія?</h1>
      <p className="m-0 max-w-[62ch]">Залиште ім’я і контакт. Ми перевіримо, що ви представляєте «{studio.name}», і надішлемо посилання до кабінету, де можна оновити опис, ціни, умови для бізнесу й додати фото.</p>
      <div className="max-w-[560px]">
        <ClaimForm studio={{ slug: studio.slug as string, name: studio.name }} />
      </div>
    </main>
  )
}
