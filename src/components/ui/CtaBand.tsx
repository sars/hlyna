import React from 'react'

import { Button } from './Button'
import { Panel } from './Panel'

// The request strip after an answer (`cobalt`) and at the end of the content (`ink`). Not more than two per page.
export function CtaBand({ title, text, cta, tone, className }: { title: string; text?: string; cta: { label: string; href: string }; tone: 'ink' | 'cobalt'; className?: string }) {
  return (
    <Panel tone={tone} className={`flex flex-wrap items-center justify-between gap-4 px-[22px] py-[18px] sm:p-[18px_22px]${className ? ` ${className}` : ''}`}>
      <div className="grid gap-1">
        <b className="block font-display text-[17px] leading-[1.2] font-semibold">{title}</b>
        {text && <p className="m-0 max-w-[60ch] text-base text-on-ink-2 group-data-[tone=cobalt]/tone:text-on-cobalt-2">{text}</p>}
      </div>
      <Button href={cta.href} arrow>
        {cta.label}
      </Button>
    </Panel>
  )
}
