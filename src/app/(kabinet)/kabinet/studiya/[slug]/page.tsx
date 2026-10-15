import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { SectionScreen } from '@/components/kabinet/SectionScreen'
import { StudioFrame } from '@/components/kabinet/StudioFrame.client'
import { cx, wrap } from '@/components/ui/layout'
import { kabinetSection } from '@/lib/kabinetData'

export const metadata: Metadata = { title: 'Огляд студії' }

// Overview: a list of the six sections below lg; from lg the same list is the side navigation and the first section
// opens beside it (one load, one markup; the section is hidden by CSS on phones).
export default async function StudioOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await kabinetSection(slug, 'pro-studiyu')
  if (page === 'login') redirect('/kabinet/vhid')
  if (!page) notFound()
  return (
    <main className={cx(wrap, 'flex flex-1 flex-col pt-hero pb-6 lg:pb-0')}>
      <StudioFrame key="overview" initial={page.studio} mode="overview">
        <SectionScreen page={page} level="h2" />
      </StudioFrame>
    </main>
  )
}
