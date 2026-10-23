import React from 'react'

import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'
import { Panel } from '@/components/ui/Panel'
import { shop } from '@/content/shop'

// «Хочете розмістити свої вироби? Додайте студію» — the ink band at the end of the shop's list pages (DESIGN.md §2).
export function ForStudiosBand() {
  const f = shop.forStudios
  return (
    <Panel tone="ink" as="aside" className="flex flex-wrap items-center justify-between gap-4 !p-[22px_24px]" aria-label={f.kicker}>
      <div className="grid max-w-[60ch] gap-1.5">
        <Kicker>{f.kicker}</Kicker>
        <b className="font-display text-[19px] leading-[1.2] font-semibold">{f.title}</b>
        <p className="m-0 text-[15px] leading-[1.45] text-on-ink-2">{f.text}</p>
      </div>
      <Button href={f.href} variant="peach" arrow>
        {f.cta}
      </Button>
    </Panel>
  )
}
