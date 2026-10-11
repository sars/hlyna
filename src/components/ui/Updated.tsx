import React from 'react'

import { site } from '@/content/site'

// «Оновлено: …» on every public page.
export function Updated({ date = site.dataUpdated, className }: { date?: string; className?: string }) {
  return <p className={className ?? 'm-0 font-mono text-xs tracking-[.06em] text-ink-2 uppercase'}>Оновлено: {date}</p>
}
