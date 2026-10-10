import React from 'react'

import { WaveCRoute, waveCMetadata } from '@/components/site/WaveCRoute'

// Wave C page; copy in src/content/waveC/richnytsya-kompaniyi.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveCMetadata('richnytsya-kompaniyi')

export default function Page() {
  return <WaveCRoute id="richnytsya-kompaniyi" />
}
