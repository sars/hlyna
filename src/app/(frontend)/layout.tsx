import type { Metadata, Viewport } from 'next'
import React from 'react'

import { Analytics } from '@/components/site/Analytics'
import { JsonLd } from '@/components/site/JsonLd'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { site } from '@/content/site'

import { fontVars } from '../fonts'

import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVars} lang="uk">
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
  metadataBase: new URL(site.url),
  title: { default: 'Українська кераміка ручної роботи для бізнесу і для себе · Глина', template: '%s · Глина' },
  description: site.description,
  // Pages that pass their own openGraph.images replace this card; everything else is inherited.
  openGraph: { type: 'website', locale: site.locale, siteName: `${site.name} · ${site.domain}`, title: 'Глина — українська кераміка ручної роботи', description: site.description, images: [{ url: `${site.url}/og-home.png`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#efe9de', width: 'device-width', initialScale: 1, viewportFit: 'cover' }
