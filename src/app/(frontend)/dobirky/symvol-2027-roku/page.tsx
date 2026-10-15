import React from 'react'

import { WaveBRoute, waveBMetadata } from '@/components/site/WaveBRoute'

// Wave B page; copy in src/content/waveB/symvol-2027.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveBMetadata('symvol-2027')

export default function Page() {
  return <WaveBRoute id="symvol-2027" />
}
