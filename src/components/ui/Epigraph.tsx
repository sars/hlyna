import React from 'react'

// One short verse after the lead (docs/voice). Never explained, one per page, on paper only.
export function Epigraph({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <figure aria-label="Епіграф" className={className ?? 'm-0'}>
      <p className="m-0 max-w-[24em] border-l-2 border-cobalt pl-4 font-serif text-epi font-normal text-cobalt-deep italic">
        {lines.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </p>
    </figure>
  )
}
