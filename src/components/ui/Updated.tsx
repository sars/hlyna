import React from 'react'

import { site } from '@/content/site'

// «Оновлено: …» on every public page (a dormant profile says «Перевірено: …» instead, its data date in the note above it).
export function Updated({ date = site.dataUpdated, label = 'Оновлено', className }: { date?: string; label?: string; className?: string }) {
  return <p className={className ?? 'm-0 font-mono text-xs tracking-[.06em] text-ink-2 uppercase'}>{label}: {date}</p>
}
