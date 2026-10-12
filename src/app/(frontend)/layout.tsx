import type { Metadata, Viewport } from 'next'
import { Golos_Text, JetBrains_Mono, Playfair_Display, Unbounded } from 'next/font/google'
import React from 'react'

import { Analytics } from '@/components/site/Analytics'
import { JsonLd } from '@/components/site/JsonLd'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { site } from '@/content/site'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'

// Fonts are downloaded at build time and served from our own domain (no requests to Google at runtime).
const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['600', '800'], variable: '--font-unbounded', display: 'swap' })
const golos = Golos_Text({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600'], variable: '--font-golos', display: 'swap' })
// Below the first screen: not preloaded.
const playfair = Playfair_Display({ subsets: ['cyrillic', 'latin'], weight: ['400'], style: ['italic'], variable: '--font-playfair', display: 'swap', preload: false })
const jetbrains = JetBrains_Mono({ subsets: ['cyrillic', 'latin'], weight: ['500'], variable: '--font-jetbrains', display: 'swap', preload: false })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${unbounded.variable} ${golos.variable} ${playfair.variable} ${jetbrains.variable}`} lang="uk">
      <head>
        <link href="/favicon.ico" rel="icon" sizes="48x48" />
        <link href="/favicon-16.png" rel="icon" type="image/png" sizes="16x16" />
        <link href="/favicon-32.png" rel="icon" type="image/png" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" sizes="any" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              { '@type': 'Organization', name: site.name, url: site.url, description: site.description, areaServed: 'UA' },
              { '@type': 'WebSite', name: site.name, url: site.url, inLanguage: 'uk' },
            ],
          }}
        />
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  title: { default: 'Українська кераміка ручної роботи для бізнесу і для себе — Глина', template: '%s — Глина' },
  description: site.description,
  openGraph: mergeOpenGraph(),
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#efe9de', width: 'device-width', initialScale: 1, viewportFit: 'cover' }
