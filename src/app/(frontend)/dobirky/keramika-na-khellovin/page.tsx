import React from 'react'

import { WaveBRoute, waveBMetadata } from '@/components/site/WaveBRoute'

// Wave B page; copy in src/content/waveB/khellovin.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveBMetadata('khellovin')

export default function Page() {
  return <WaveBRoute id="khellovin" />
}
