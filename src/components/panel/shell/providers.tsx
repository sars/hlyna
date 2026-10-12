'use client'

import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

export function PanelProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors={false} toastOptions={{ className: 'text-sm' }} />
    </>
  )
}
