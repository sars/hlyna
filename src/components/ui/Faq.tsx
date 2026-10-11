import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'

import { SectionHead } from './SectionHead'

// One question: a native `details`, so the answer is in the HTML for search and LLMs even when closed.
export function FaqItem({ q, children, open }: { q: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open}>
      <summary>
        {q}
        <span className="ui-faq-pm" aria-hidden />
      </summary>
      <div>{children}</div>
    </details>
  )
}

// Questions and answers (plain strings) with FAQPage JSON-LD. Without `title` only the list is rendered.
export function Faq({ items, id = 'faq', title, kicker, jsonLd = true, openFirst, head }: { items: { q: string; a: string }[]; id?: string; title?: React.ReactNode; kicker?: string; jsonLd?: boolean; openFirst?: boolean; head?: 'rule' | 'poster' }) {
  return (
    <section aria-labelledby={title ? id : undefined} aria-label={title ? undefined : 'Часті питання'}>
      {jsonLd && <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />}
      {title && <SectionHead id={id} title={title} kicker={kicker} variant={head} className={head === 'poster' ? undefined : 'max-w-faq'} />}
      <div className="ui-faq max-w-faq">
        {items.map((f, i) => (
          <FaqItem key={f.q} q={f.q} open={openFirst && i === 0}>
            <p className="m-0">{f.a}</p>
          </FaqItem>
        ))}
      </div>
    </section>
  )
}
