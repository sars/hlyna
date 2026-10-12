import React from 'react'

// «Коротко» of a profile: label and value rows under a 2px rule. Links inside `dd` are cobalt and underlined.
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="m-0 grid content-start border-t-2 border-ink">
      {rows.map(([label, value], i) => (
        <div key={`${label}-${i}`} className="grid grid-cols-1 gap-0.5 border-b border-rule py-2.5 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-3">
          <dt className="pt-1 font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">{label}</dt>
          <dd className="m-0 text-[15.5px] [overflow-wrap:anywhere] [&_a]:text-cobalt [&_a]:underline [&_a]:underline-offset-[3px]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
