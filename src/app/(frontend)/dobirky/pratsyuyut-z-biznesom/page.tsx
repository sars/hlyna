import React from 'react'

import { WaveBRoute, waveBMetadata } from '@/components/site/WaveBRoute'

// Wave B page; copy in src/content/waveB/pratsyuyut-z-biznesom.json (404 until it exists).
export const revalidate = 86400
export const generateMetadata = () => waveBMetadata('pratsyuyut-z-biznesom')

export default function Page() {
  return <WaveBRoute id="pratsyuyut-z-biznesom" />
}
