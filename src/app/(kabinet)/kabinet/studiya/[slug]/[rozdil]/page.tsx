import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { SectionScreen } from '@/components/kabinet/SectionScreen'
import { StudioFrame } from '@/components/kabinet/StudioFrame.client'
import { cx, wrap } from '@/components/ui/layout'
import { kabinetSection } from '@/lib/kabinetData'
import { KABINET_SECTIONS, KABINET_SECTION_TITLE, type KabinetSection } from '@/shared/options'

const isSection = (s: string): s is KabinetSection => (KABINET_SECTIONS as readonly string[]).includes(s)

export async function generateMetadata({ params }: { params: Promise<{ rozdil: string }> }): Promise<Metadata> {
  const { rozdil } = await params
  return { title: isSection(rozdil) ? KABINET_SECTION_TITLE[rozdil] : 'Розділ' }
}

// One section per screen: the form on the right (the whole screen on phones), the six sections as navigation on the left from lg.
export default async function StudioSection({ params }: { params: Promise<{ slug: string; rozdil: string }> }) {
  const { slug, rozdil } = await params
  if (!isSection(rozdil)) notFound()
  const page = await kabinetSection(slug, rozdil)
  if (page === 'login') redirect('/kabinet/vhid')
  if (!page) notFound()
  return (
    <main className={cx(wrap, 'flex flex-1 flex-col pt-hero')}>
      <StudioFrame key={rozdil} initial={page.studio} mode="section" current={rozdil}>
        <SectionScreen page={page} />
      </StudioFrame>
    </main>
  )
}
