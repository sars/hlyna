import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Any URL no route claims renders the site's own 404 (src/app/(frontend)/not-found.tsx, inside the site layout)
// instead of the framework's bare page.
export const metadata: Metadata = { title: 'Сторінку не знайдено', robots: { index: false } }

export default function Missing() {
  notFound()
}
