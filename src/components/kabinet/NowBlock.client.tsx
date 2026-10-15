'use client'

import React, { useState } from 'react'

import { Kicker } from '@/components/ui/Kicker'

// «Зараз на сайті · написав редактор»: the published text, readable on paper-2 (the cabinet's rule: readable on paper-2,
// editable on white). Long text folds to a few lines with «Читати повністю».
export function NowBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 300
  return (
    <div className="kb-note">
      <Kicker as="p">Зараз на сайті · написав редактор</Kicker>
      <p className={long && !open ? 'line-clamp-6' : undefined}>{text}</p>
      {long && (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="justify-self-start px-0 font-mono text-[11px] tracking-[.06em] text-cobalt uppercase hover:text-cobalt-deep">
          {open ? 'Згорнути' : 'Читати повністю'}
        </button>
      )}
    </div>
  )
}
