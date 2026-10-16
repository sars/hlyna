import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import React from 'react'

import { KabinetFooter, KabinetHeader } from '@/components/kabinet/KabinetChrome'

import { preloadFonts } from '../../fonts'

import '../../(frontend)/globals.css'

// The studio cabinet's own root layout: the site's fonts and stylesheet, but none of the public chrome (mega menu,
// search, request bar, footer columns) and no analytics (invite tokens and pre-hydration URLs must not reach GA). /kabinet/zayavka stays in (frontend): it is a public page with the site header.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Кабінет студії · Глина', template: '%s · Кабінет студії · Глина' },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = { themeColor: '#efe9de', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default async function KabinetLayout({ children }: { children: React.ReactNode }) {
  preloadFonts()
  // Only whether a session cookie exists decides if «Вийти» shows; the pages check the session itself.
  const signedIn = (await cookies()).getAll().some((c) => c.name.endsWith('hlyna.session_token'))
  return (
    <html lang="uk">
      <body className="flex min-h-dvh flex-col">
        <KabinetHeader signedIn={signedIn} />
        {children}
        <KabinetFooter />
      </body>
    </html>
  )
}
