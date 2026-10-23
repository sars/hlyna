import React from 'react'

import { cx } from './layout'

// The credit under a shop gallery or grid (AGENTS.md: a studio's photo never goes without it).
export function PhotoCredit({ studios, className }: { studios: string[]; className?: string }) {
  const names = [...new Set(studios)].filter(Boolean)
  if (!names.length) return null
  return (
    <p className={cx('m-0 mt-2.5 text-[12.5px] leading-[1.4] text-ink-2', className)}>
      {names.length === 1 ? `Фото: ${names[0]}, зі згоди студії.` : 'Фото надали студії, публікуються з їхньої згоди.'}
    </p>
  )
}
