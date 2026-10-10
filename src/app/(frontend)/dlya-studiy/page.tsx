import type { Metadata } from 'next'
import React from 'react'

import { GuidePage } from '@/components/site/GuidePage'
import { studioPage } from '@/content/guides'
import { guideCtx, guideMetadata } from '@/lib/guides'

export const revalidate = 86400

export const metadata: Metadata = guideMetadata(studioPage)

export default async function ForStudios() {
  return <GuidePage guide={studioPage} ctx={await guideCtx()} parents={[{ label: 'Головна', href: '/' }]} />
}
