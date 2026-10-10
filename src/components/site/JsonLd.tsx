import React from 'react'

// schema.org structured data. Every page that answers a question should carry it (see AGENTS.md → LLM).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
