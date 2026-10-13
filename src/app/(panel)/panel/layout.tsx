import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { PanelProviders } from '@/components/panel/shell/providers'
import './panel.css'

// The panel's own root layout: its own <html>, stylesheet and JavaScript. Nothing here is imported by the public
// site (ESLint rule + scripts/check-bundles.mjs), and the public site's layout is not used here.

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Панель · Глина', template: '%s · Панель · Глина' },
  robots: { index: false, follow: false },
  // Same set as the public layout; without it browsers fall back to a cached /favicon.ico.
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

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f9fafb' }

// Dark or light before the first paint (kit: the inline script in index.html).
const themeScript = `try{var s=localStorage.getItem('theme');var d=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`

export default function PanelRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PanelProviders>{children}</PanelProviders>
      </body>
    </html>
  )
}
