import type { Metadata, Viewport } from 'next'
import { Raleway, Unbounded } from 'next/font/google'
import { draftMode } from 'next/headers'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { JsonLd } from '@/components/site/JsonLd'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { site } from '@/content/site'
import { Providers } from '@/providers'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'

// Fonts are downloaded at build time and served from our own domain (no requests to Google at runtime).
const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['500', '600', '700'], variable: '--font-unbounded', display: 'swap' })
const raleway = Raleway({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-raleway', display: 'swap' })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={`${unbounded.variable} ${raleway.variable}`} lang="uk" data-theme="light">
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
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
        <Providers>
          <AdminBar adminBarProps={{ preview: isEnabled }} />
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  title: { default: 'Українська кераміка ручної роботи для бізнесу і для себе — глина.юа', template: '%s — глина.юа' },
  description: site.description,
  openGraph: mergeOpenGraph(),
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#2a4fa8', width: 'device-width', initialScale: 1, viewportFit: 'cover' }
