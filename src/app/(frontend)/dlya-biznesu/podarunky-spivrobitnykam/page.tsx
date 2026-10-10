import React from 'react'

import { WaveCRoute, waveCMetadata } from '@/components/site/WaveCRoute'

// Wave C page; copy in src/content/waveC/podarunky-spivrobitnykam.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveCMetadata('podarunky-spivrobitnykam')

export default function Page() {
  return <WaveCRoute id="podarunky-spivrobitnykam" />
}
