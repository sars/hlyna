import type { Metadata } from 'next'
import React from 'react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Кабінет студії',
  robots: { index: false, follow: false },
}

export default function KabinetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
