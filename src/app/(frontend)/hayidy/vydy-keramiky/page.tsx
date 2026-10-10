import React from 'react'

import { WaveBRoute, waveBMetadata } from '@/components/site/WaveBRoute'

// Wave B page; copy in src/content/waveB/vydy-keramiky.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveBMetadata('vydy-keramiky')

export default function Page() {
  return <WaveBRoute id="vydy-keramiky" />
}
