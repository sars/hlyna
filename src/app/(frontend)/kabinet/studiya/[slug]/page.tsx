import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { container } from '@/components/site/Bits'
import { StudioEditForm, type EditInitial } from '@/components/site/StudioEditForm.client'
import { currentOwner, ownedStudio } from '@/lib/kabinet'

export default async function EditStudio({ params }: { params: Promise<{ slug: string }> }) {
  const owner = await currentOwner()
  if (!owner) redirect('/kabinet/vhid')
  const { slug } = await params
  const s = await ownedStudio(owner, slug)
  if (!s) notFound()
  const t = (v?: string | null) => v ?? ''
  const initial: EditInitial = {
    slug,
    name: s.name,
    publicNow: t(s.publicDescription || s.summary),
    ownerAbout: t(s.ownerAbout),
    ownerNews: t(s.ownerNews),
    ownerQuote: t(s.ownerQuote),
    services: (s.services ?? []).map((x) => x.text),
    products: (s.products ?? []).map((x) => x.text),
    prices: (s.prices ?? []).map((p) => ({ text: p.text, date: t(p.date), source: t(p.source) })),
    address: t(s.address),
    website: t(s.website),
    instagram: t(s.instagram),
    phone: t(s.phone),
    email: t(s.email),
    b2b: {
      minOrder: t(s.b2b?.minOrder),
      leadTime: t(s.b2b?.leadTime),
      logoMethods: (s.b2b?.logoMethods ?? []).map((x) => x.text),
      foodSafe: Boolean(s.b2b?.foodSafe),
      dishwasherSafe: Boolean(s.b2b?.dishwasherSafe),
      worksWithHoreca: Boolean(s.b2b?.worksWithHoreca),
      worksWithCorporate: Boolean(s.b2b?.worksWithCorporate),
    },
    photos: (s.photos ?? [])
      .filter((p): p is Exclude<typeof p, number> => typeof p === 'object')
      .map((p) => ({ id: p.id, url: p.sizes?.small?.url ?? p.url ?? '', alt: t(p.alt) })),
    instagramPosts: (s.activity?.instagramPosts ?? []).map((x) => x.url),
    pending: Boolean(s.pendingOwnerChanges),
  }
  return (
    <main className={`${container} grid gap-5 pt-8 pb-16`}>
      <p className="m-0 text-sm">
        <Link href="/kabinet">← Кабінет</Link>
      </p>
      <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">{s.name}</h1>
      <p className="m-0 max-w-[65ch] text-umber">Збережені зміни ми переглядаємо й публікуємо, зазвичай протягом доби. Внутрішні нотатки й статус студії тут не показуються й не змінюються.</p>
      <div className="max-w-[860px]">
        <StudioEditForm initial={initial} />
      </div>
    </main>
  )
}
