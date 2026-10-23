'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { MoreLink } from '@/components/ui/MoreLink'

// «Відключити»: the owner's chat stops getting orders; the page reloads into the «Підключити» state.
export function TelegramUnlink() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function unlink() {
    setBusy(true)
    setError(false)
    try {
      const r = await fetch('/kabinet/api/telegram/unlink', { method: 'POST' })
      if (!r.ok) throw new Error()
      router.refresh()
    } catch {
      setError(true)
    }
    setBusy(false)
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4">
      <MoreLink as="button" onClick={busy ? undefined : unlink}>
        Відключити
      </MoreLink>
      {error && <span role="alert" className="text-[14px] text-terracotta-text">Не вдалося відключити. Спробуйте ще раз.</span>}
    </span>
  )
}
