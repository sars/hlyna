'use client'

import React from 'react'

import { PhotoManager } from '@/components/ui/PhotoManager.client'
import type { KabinetPhoto } from '@/shared/kabinet'

import { useStudio } from './StudioFrame.client'

/** The «Фото» section: the photo manager wired to the studio the page shares with the navigation. */
export function PhotoSection({ slug, initial }: { slug: string; initial: KabinetPhoto[] }) {
  const { studio, setStudio } = useStudio()
  return <PhotoManager slug={slug} initial={initial} sectionState={studio.sections.find((s) => s.key === 'foto')?.state} onStudio={setStudio} />
}
