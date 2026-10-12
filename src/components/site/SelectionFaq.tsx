import React from 'react'

import { Faq as UiFaq } from '@/components/ui/Faq'

// FAQ block + FAQPage JSON-LD for pages that are not on the topic/guide templates (now the shared Faq primitive).
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return <UiFaq id="faq" kicker="Питання і відповіді" title="Часті питання" items={items} openFirst />
}
