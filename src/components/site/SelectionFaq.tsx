import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'

// FAQ block + FAQPage JSON-LD for pages that are not on the topic/guide templates.
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section aria-labelledby="faq">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((f, i) => (
          <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
            <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">
              {f.q}
              <span aria-hidden className="font-display text-terra group-open:hidden">+</span>
              <span aria-hidden className="font-display hidden text-terra group-open:inline">–</span>
            </summary>
            <p className="mt-0 mb-3.5">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
