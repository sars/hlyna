// Potters' words that a page may explain with <Term> (src/components/ui/Term.tsx). Definitions come from
// docs/voice/glossary.md; only terms a page actually uses are listed here — add one when a page needs it.
// The explanation must also stand in the page text: the tooltip duplicates it, it does not replace it.
export const glossary = {
  випал: { term: 'випал', def: 'Обробка вогнем у печі: перший випал — без поливи, другий — з поливою.' },
} satisfies Record<string, { term: string; def: string }>

