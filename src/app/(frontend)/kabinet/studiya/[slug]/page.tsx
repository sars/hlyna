import Link from 'next/link'
import { cx, wrap } from '@/components/ui/layout'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { StudioEditForm } from '@/components/site/StudioEditForm.client'
import { kabinetEdit } from '@/lib/kabinetData'

export default async function EditStudio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await kabinetEdit(slug)
  if (found === 'login') redirect('/kabinet/vhid')
  if (!found) notFound()
  const { initial } = found
  return (
    <main className={cx(wrap, 'grid gap-4 pt-hero')}>
      <div className="grid max-w-[860px] gap-4">
        <p className="m-0 text-sm">
          <Link href="/kabinet">← Кабінет</Link>
        </p>
        <h1 className="m-0 font-display text-h1">{found.name}</h1>
        <p className="m-0 max-w-read text-ink-2">Збережені зміни ми переглядаємо й публікуємо, зазвичай протягом доби. Внутрішні нотатки й статус студії тут не показуються й не змінюються.</p>
        <StudioEditForm initial={initial} />
      </div>
    </main>
  )
}
