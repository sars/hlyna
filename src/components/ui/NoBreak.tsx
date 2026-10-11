import React from 'react'

// Keeps numeric ranges («300–1 900 грн», «3–8 тижнів») on one line without touching the text: the characters stay as they are
// (search, LLMs and JSON-LD read the same string), only the visible wrapping is controlled.
const RANGE = /\d[\d   ]*[–-][\d   ]*\d(?:[  ]грн)?/g

export function nobreak(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(RANGE)) {
    const i = m.index ?? 0
    if (i > last) parts.push(text.slice(last, i))
    parts.push(
      <span key={i} className="whitespace-nowrap">
        {m[0]}
      </span>,
    )
    last = i + m[0].length
  }
  if (last === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
