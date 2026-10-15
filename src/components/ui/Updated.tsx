import React from 'react'

import { site } from '@/content/site'

// «Оновлено: …» on every public page (a profile with old data says «Дані: 2019 · перевірено: …» instead).
export function Updated({ date = site.dataUpdated, label = 'Оновлено', className }: { date?: string; label?: string; className?: string }) {
  return <p className={className ?? 'm-0 font-mono text-xs tracking-[.06em] text-ink-2 uppercase'}>{label}: {date}</p>
}
