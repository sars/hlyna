import React from 'react'

import { WaveCRoute, waveCMetadata } from '@/components/site/WaveCRoute'

// Wave C page; copy in src/content/waveC/novyi-rik-i-rizdvo.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveCMetadata('novyi-rik-i-rizdvo')

export default function Page() {
  return <WaveCRoute id="novyi-rik-i-rizdvo" />
}
