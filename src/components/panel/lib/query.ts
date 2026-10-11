'use client'

// How the panel re-reads the server. Screens are server components, so "refresh" is router.refresh() plus
// invalidating any TanStack Query cache (the paged lists). (Kit: lib/query, adapted for Next.)
import { QueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false },
    mutations: { retry: false },
  },
})

/** Everything on screen is out of date: read it again. */
export function useInvalidateAll() {
  const router = useRouter()
  return useCallback(async () => {
    router.refresh()
    await queryClient.invalidateQueries()
  }, [router])
}
