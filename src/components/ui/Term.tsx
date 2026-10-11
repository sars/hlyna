import React from 'react'

// A potters' word with a tooltip. The same explanation must also stand in the page text: the tooltip duplicates it for readers,
// it does not replace it for search and LLMs. Not for headings, tables or panels.
export function Term({ children, def, side = 'start' }: { children: React.ReactNode; def: string; side?: 'start' | 'end' }) {
  return (
    <abbr className="ui-term" tabIndex={0} data-def={def} data-side={side}>
      {children}
    </abbr>
  )
}
