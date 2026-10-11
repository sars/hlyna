import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Глина — українська кераміка ручної роботи (hlyna.com.ua)',
    short_name: 'Глина',
    lang: 'uk',
    start_url: '/',
    display: 'standalone',
    background_color: '#efe9de',
    theme_color: '#1d3ec6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
