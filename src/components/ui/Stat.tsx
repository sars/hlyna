import React from 'react'

// A number with a caption. `inline` sits in the hero (use a flex row around several); `tile` is the paper-2 block
// of the market section (put them in a 2 → 4 column grid).
export function Stat({ value, label, variant = 'inline' }: { value: string; label: string; variant?: 'inline' | 'tile' }) {
  if (variant === 'tile') {
    return (
      <div className="bg-paper-2 px-4 py-3.5">
        <b className="block font-display text-[clamp(26px,2.6vw,36px)] leading-none font-extrabold text-cobalt tabular-nums">{value}</b>
        <span className="mt-1.5 block text-[13px] leading-[1.35] text-ink-2">{label}</span>
      </div>
    )
  }
  return (
    <span className="text-sm text-ink-2">
      <b className="mr-1.5 font-display text-[22px] font-semibold text-cobalt tabular-nums">{value}</b>
      {label}
    </span>
  )
}
