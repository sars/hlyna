import React from 'react'

// The sticky bar at the bottom of a cabinet form: the state on the left (a polite live region), the action or a counter on the right.
// `busy` draws the 2px cobalt line over the bar; `tone="error"` turns the state terracotta (links in it focus the fields).
export function SaveBar({ status, action, busy, tone }: { status: React.ReactNode; action?: React.ReactNode; busy?: boolean; tone?: 'error'; }) {
  return (
    <div className="ui-savebar" role="region" aria-label="Збереження" data-busy={busy ? '' : undefined} data-tone={tone}>
      <div className="ui-savebar-s" aria-live="polite">
        {status}
      </div>
      {action}
    </div>
  )
}
