import React from 'react'

import { cx } from './layout'

// The frame of a map (MapLibre is mounted in a child): paper-2 until the map has loaded, a 1px rule, no radius.
// `fallback` is the text shown over the frame while there is no map (loading, no WebGL): address or an explanation.
export function MapFrame({ height, children, fallback, className }: { height: 'profile' | 'list'; children: React.ReactNode; fallback?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('relative w-full overflow-hidden border border-rule bg-paper-2', height === 'profile' ? 'h-[200px] sm:h-[260px]' : 'h-[60vh] min-h-[360px] lg:h-[68vh] lg:max-h-[720px]', className)}>
      {children}
      {fallback && <p className="pointer-events-none absolute inset-0 m-0 grid place-items-center px-6 text-center font-mono text-xs tracking-[.04em] text-ink-2 uppercase">{fallback}</p>}
    </div>
  )
}
