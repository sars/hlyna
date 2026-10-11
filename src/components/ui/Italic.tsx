import React from 'react'

// The italic word in a poster heading: Playfair italic, cobalt on paper and peach on dark panels.
export function Italic({ children }: { children: React.ReactNode }) {
  return <span className="font-serif text-[.9em] font-normal tracking-normal text-cobalt normal-case italic group-data-[tone]/tone:text-peach">{children}</span>
}
