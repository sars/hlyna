import type { Metadata, Viewport } from 'next'
import React from 'react'

import { Analytics } from '@/components/site/Analytics'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

import { fontVars } from '../../fonts'

import '../../(frontend)/globals.css'

// The studio cabinet's own root layout, so the cabinet can get its own chrome. For now it renders the same header and
// footer as the public site. /kabinet/zayavka stays in (frontend): it is a public page.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Кабінет студії',
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

export default function KabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVars} lang="uk">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
