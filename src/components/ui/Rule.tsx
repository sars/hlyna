import React from 'react'

import { cx } from './layout'

// An explicit horizontal rule: 1px (thin), 2px ink, or 1px on dark panels. Vertical rules are borders on grid cells.
export function Rule({ tone = 'thin', className }: { tone?: 'thin' | 'ink' | 'on-dark'; className?: string }) {
  return <hr className={cx('m-0 w-full border-0 border-t', tone === 'ink' ? 'border-t-2 border-ink' : tone === 'on-dark' ? 'border-rule-on-dark' : 'border-rule', className)} />
}
