import React from 'react'

import { Kicker } from './Kicker'
import { cx } from './layout'
import { MoreLink } from './MoreLink'
import { nobreak } from './NoBreak'

// Section head with the 2px ink rule below. `rule` is for inner pages, `poster` (large, home only) may hold an <Italic> word.
export function SectionHead({ title, id, kicker, note, more, level = 2, variant = 'rule', className }: { title: React.ReactNode; id: string; kicker?: React.ReactNode; note?: React.ReactNode; more?: { label: string; href: string }; level?: 2 | 3; variant?: 'rule' | 'poster'; className?: string }) {
  const H = level === 3 ? 'h3' : 'h2'
  const poster = variant === 'poster'
  return (
    <div className={cx('grid items-end gap-x-6 border-b-2 border-ink md:grid-cols-[minmax(0,1fr)_auto]', poster ? 'gap-y-2 pb-[18px]' : 'mb-[18px] gap-y-1.5 pb-3', className)}>
      <div className={cx('grid', poster ? 'gap-2' : 'gap-1.5')}>
        {kicker && <Kicker className={poster ? 'mb-1.5' : undefined}>{kicker}</Kicker>}
        <H id={id} className={cx('m-0 font-display uppercase', poster ? 'text-h2-poster' : 'text-h2')}>
          {typeof title === 'string' ? nobreak(title) : title}
        </H>
        {note && <p className="m-0 max-w-read text-[14.5px] leading-[1.45] text-ink-2">{note}</p>}
      </div>
      {more && <MoreLink href={more.href} pad={false} className="py-2 md:py-0 md:pb-1">{more.label}</MoreLink>}
    </div>
  )
}
