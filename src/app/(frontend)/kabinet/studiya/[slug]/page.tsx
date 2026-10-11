import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { container } from '@/components/site/Bits'
import { StudioEditForm } from '@/components/site/StudioEditForm.client'
import { kabinetEdit } from '@/lib/kabinetData'

export default async function EditStudio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await kabinetEdit(slug)
  if (found === 'login') redirect('/kabinet/vhid')
  if (!found) notFound()
  const { initial } = found
  return (
    <main className={`${container} grid gap-5 pt-8 pb-16`}>
      <p className="m-0 text-sm">
        <Link href="/kabinet">← Кабінет</Link>
      </p>
      <h1 className="h-display m-0 text-[clamp(24px,3.4vw,36px)]">{found.name}</h1>
      <p className="m-0 max-w-[65ch] text-umber">Збережені зміни ми переглядаємо й публікуємо, зазвичай протягом доби. Внутрішні нотатки й статус студії тут не показуються й не змінюються.</p>
      <div className="max-w-[860px]">
        <StudioEditForm initial={initial} />
      </div>
    </main>
  )
}
