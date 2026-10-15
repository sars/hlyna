import Link from 'next/link'
import React from 'react'

import type { SectionState } from '@/shared/kabinet'

import { StatusTag } from './StatusTag'

/** The tag's text when a section is empty: «порожньо», «немає фото». */
const MISSING_LABEL: Partial<Record<string, string>> = { foto: 'немає фото' }

// A row of the studio overview and of the editor's side navigation: name, what is in it, its state, an arrow.
export function SectionRow({ href, title, line, state, section, current, lgCurrent }: { href: string; title: string; line: string; state: SectionState; section?: string; current?: boolean; lgCurrent?: boolean }) {
  return (
    <li>
      <Link href={href} className="ui-srow" aria-current={current ? 'page' : undefined} data-lg-current={lgCurrent ? '' : undefined}>
        <span className="ui-srow-n">{title}</span>
        <span className="ui-srow-l">{line}</span>
        <StatusTag state={state}>{state === 'missing' ? (section && MISSING_LABEL[section]) || undefined : undefined}</StatusTag>
        <span className="ui-srow-go" aria-hidden>→</span>
      </Link>
    </li>
  )
}

/** The list around the rows (2px ink rule on top). */
export function SectionRows({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul className="ui-srows" aria-label={label}>
      {children}
    </ul>
  )
}

// «Заповнено 4 з 6 розділів» over a 4px bar; `aside` is the studio-level tag or a link on the right (it wraps under the
// text when the row is too narrow). `short` drops «Заповнено» for the 300px side column.
export function Meter({ filled, total, aside, short }: { filled: number; total: number; aside?: React.ReactNode; short?: boolean }) {
  return (
    <div className="ui-meter">
      <div className="ui-meter-v">
        <b>{short ? '' : 'Заповнено '}{filled} з {total} розділів</b>
        {aside}
      </div>
      <div className="ui-meter-bar" role="progressbar" aria-label="Заповнено розділів" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}>
        <i style={{ width: `${total ? Math.round((filled / total) * 100) : 0}%` }} />
      </div>
    </div>
  )
}
