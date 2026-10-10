import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'глина.юа — українська кераміка ручної роботи',
    short_name: 'глина.юа',
    lang: 'uk',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3e7da',
    theme_color: '#2a4fa8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
