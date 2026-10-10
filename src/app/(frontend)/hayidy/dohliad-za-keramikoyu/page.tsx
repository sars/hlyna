import React from 'react'

import { WaveBRoute, waveBMetadata } from '@/components/site/WaveBRoute'

// Wave B page; copy in src/content/waveB/dohliad-za-keramikoyu.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveBMetadata('dohliad-za-keramikoyu')

export default function Page() {
  return <WaveBRoute id="dohliad-za-keramikoyu" />
}
