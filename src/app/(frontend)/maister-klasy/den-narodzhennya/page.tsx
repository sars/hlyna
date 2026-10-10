import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SectionHead } from '@/components/site/Bits'
import { WavePage } from '@/components/site/WavePage'
import { getAllStudios } from '@/lib/catalog'
import { cleanName, firstAddress } from '@/lib/present'
import { fillCopy, partyData, partyLines, waveCopy } from '@/lib/waveA'
import { ogImage } from '@/utilities/ogImage'

// Birthdays and parties in a clay studio (kids' birthdays, hen parties, renting the studio for a group).
export const revalidate = 86400
const ID = 'mk-den-narodzhennya'
const PATH = '/maister-klasy/den-narodzhennya'

async function load() {
  const raw = waveCopy(ID)
  if (!raw) return null
  const d = await partyData()
  return { ...d, copy: fillCopy(raw, d.vars) }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load()
  if (!p) return {}
  return {
    title: p.copy.title,
    description: p.copy.metaDescription,
    alternates: { canonical: PATH },
    openGraph: { images: ogImage({ title: p.copy.title, kicker: 'Майстер-класи', sub: p.vars.priceRange ? String(p.vars.priceRange) : undefined, pattern: 'party' }) },
  }
}

export default async function Page() {
  const p = await load()
  if (!p) notFound()
  const known = new Map((await getAllStudios()).map((s) => [s.slug!, s]))
  return (
    <WavePage
      copy={p.copy}
      known={known}
      kicker="Майстер-класи"
      crumbs={[{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }, { label: 'День народження в студії' }]}
      path={PATH}
      form="master-class"
      studios={p.studios}
      related={[
        { label: 'Майстер-класи для дітей', href: '/maister-klasy/dlya-ditey' },
        { label: 'Гончарство для двох', href: '/maister-klasy/dlya-dvokh' },
        { label: 'Сертифікати', href: '/sertyfikaty' },
        { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
      ]}
    >
      <section aria-labelledby="list">
        <SectionHead title="Студії, де проводять свята" id="list">
          <p className="m-0 text-sm text-umber">За прайсами й описами студій; формат, кількість гостей і вік уточнюйте при бронюванні.</p>
        </SectionHead>
        <div className="grid grid-cols-1 gap-6">
          {p.groups.map((g) => (
            <div key={g.city.slug} id={`misto-${g.city.slug}`} className="grid grid-cols-1 gap-2 scroll-mt-24">
              <h3 className="m-0 text-lg">{g.city.name}</h3>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
                {g.studios.map((s) => {
                  const l = partyLines(s)
                  const line = l.prices[0]?.text ?? l.services[0]
                  const addr = firstAddress(s.address)
                  return (
                    <li key={s.id} className="grid grid-cols-1 gap-0.5 rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                      <Link href={`/vyrobnyky/${s.slug}`} className="font-bold">{cleanName(s.name)}</Link>
                      {line && <span>{line}</span>}
                      {addr && <span className="text-umber">{addr}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </WavePage>
  )
}
