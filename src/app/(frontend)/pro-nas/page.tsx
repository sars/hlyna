import type { Metadata } from 'next'
import React from 'react'

import { GuidePage } from '@/components/site/GuidePage'
import { aboutPage } from '@/content/guides'
import { guideCtx, guideMetadata } from '@/editorial/guides'

export const revalidate = 86400

export const metadata: Metadata = guideMetadata(aboutPage)

export default async function About() {
  return <GuidePage guide={aboutPage} ctx={await guideCtx()} parents={[{ label: 'Головна', href: '/' }]} />
}
