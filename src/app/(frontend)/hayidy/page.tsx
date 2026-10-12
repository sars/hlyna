import type { Metadata } from 'next'
import { Block, InnerHero, InnerMain } from '@/components/site/Inner'
import { IndexCell, StudioCells } from '@/components/ui/StudioCell'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { guides } from '@/content/guides'
import { site } from '@/content/site'
import { liveWaveBPages } from '@/editorial/wave-b'
import { ogImage } from '@/utilities/ogImage'

export const metadata: Metadata = {
  title: 'Гайди про кераміку ручної роботи: замовлення партії, харчова безпечність, майстер-класи',
  description: 'Практичні гайди: як замовити партію посуду чи подарунків у студії, що спитати про поливу й посудомийку, як дозамовити той самий посуд і як обрати майстер-клас.',
  alternates: { canonical: '/hayidy' },
  openGraph: { images: ogImage({ title: 'Гайди про кераміку ручної роботи', kicker: 'Гайди' }) },
}

const more = [
  { label: 'Ціни 2026', href: '/tsiny-2026', note: 'Майстер-класи, сертифікати, посуд: діапазони й медіани за прайсами студій' },
  { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom', note: 'Як ставлять логотип на кераміку і хто це робить' },
  { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny', note: 'Формати, ціни з особи, у студії чи у вас' },
]

export const revalidate = 86400

export default async function GuidesIndex() {
  const extra = (await liveWaveBPages()).filter((p) => p.section === 'hayidy')
  const list = [...guides.map((g) => ({ key: g.slug, href: g.path, kicker: g.kicker, title: g.h1, note: g.short })), ...extra.map((p) => ({ key: p.id, href: p.path, kicker: 'Гайд', title: p.title, note: p.summary }))]
  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Гайди', itemListElement: list.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: site.url + g.href, name: g.title })) }} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Гайди' }]}
        kicker="Гайди"
        title="Гайди про кераміку ручної роботи"
        lead={
          <p className="m-0">
            Практично й коротко: як замовити партію посуду чи подарунків у студії, що спитати про поливу й посудомийку, як дозамовити той самий посуд через пів року і як обрати майстер-клас. Цифри — з каталогу й прайсів студій 2026 року.
          </p>
        }
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Block id="all" title="Усі гайди">
          <StudioCells>
            {list.map((g) => (
              <IndexCell key={g.key} href={g.href} kicker={g.kicker} title={g.title} text={g.note} cta="Читати" />
            ))}
          </StudioCells>
        </Block>
        <Block id="more" title="Корисне на інших сторінках">
          <StudioCells>
            {more.map((m) => (
              <IndexCell key={m.href} href={m.href} title={m.label} text={m.note} cta="Відкрити" />
            ))}
          </StudioCells>
        </Block>
      </div>
    </InnerMain>
  )
}
