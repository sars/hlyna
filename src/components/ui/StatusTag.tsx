import React from 'react'

import type { SectionState } from '@/shared/kabinet'

const TEXT: Record<SectionState, string> = { live: 'на сайті', review: 'на перевірці', missing: 'порожньо' }

// A section's state in mono caps with a dot: on the site (ink-2), on review (cobalt), empty (terracotta text, hollow dot).
export function StatusTag({ state, children }: { state: SectionState; children?: React.ReactNode }) {
  return (
    <span className="ui-tag" data-state={state}>
      {children ?? TEXT[state]}
    </span>
  )
}
