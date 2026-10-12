'use client'

// How the panel re-reads the server: screens are server components, so «refresh» is router.refresh().
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/** Everything on screen is out of date: read it again. */
export function useInvalidateAll() {
  const router = useRouter()
  return useCallback(async () => {
    router.refresh()
  }, [router])
}
