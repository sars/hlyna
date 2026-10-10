import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { GuidePage } from '@/components/site/GuidePage'
import { guides } from '@/content/guides'
import { guideCtx, guideMetadata } from '@/lib/guides'

export const revalidate = 86400

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const g = guides.find((x) => x.slug === slug)
  return g ? guideMetadata(g) : {}
}

export default async function GuideRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = guides.find((x) => x.slug === slug)
  if (!g) notFound()
  return <GuidePage guide={g} ctx={await guideCtx()} parents={[{ label: 'Головна', href: '/' }, { label: 'Гайди', href: '/hayidy' }]} />
}
