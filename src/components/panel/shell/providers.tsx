'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

import { queryClient } from '@/components/panel/lib/query'

export function PanelProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors={false} toastOptions={{ className: 'text-sm' }} />
    </QueryClientProvider>
  )
}
