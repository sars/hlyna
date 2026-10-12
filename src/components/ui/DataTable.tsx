import React from 'react'

import { cx } from './layout'

export type Column = { key: string; label: string; align?: 'start' | 'end'; numeric?: boolean; mono?: boolean; width?: string }

// Any table. `stack` (default) turns rows into labelled blocks below md; `scroll` keeps a wide table and scrolls it sideways.
// The first column is the row title. All of it is plain server HTML.
export function DataTable({ caption, columns, rows, mode = 'stack', className }: { caption?: string; columns: Column[]; rows: Record<string, React.ReactNode>[]; mode?: 'stack' | 'scroll'; className?: string }) {
  const table = (
    <table className={cx('ui-table', columns.some((c) => c.width) && '[table-layout:fixed]', className)} data-stack={mode === 'stack' ? '' : undefined}>
      {caption && <caption>{caption}</caption>}
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" data-end={c.align === 'end' ? '' : undefined} style={c.width ? { width: c.width } : undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} data-label={c.label} data-numeric={c.numeric ? '' : undefined} data-mono={c.mono ? '' : undefined} data-end={c.align === 'end' ? '' : undefined}>
                {row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
  return mode === 'scroll' ? <div className="ui-table-scroll">{table}</div> : table
}
