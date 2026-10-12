import type { Metadata } from 'next'
import { Block, InnerHero, InnerMain } from '@/components/site/Inner'
import { IndexCell, StudioCells } from '@/components/ui/StudioCell'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Chip } from '@/components/ui/Chip'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { site } from '@/content/site'
import { productTopics } from '@/content/topics'
import { MIN_LIST, pluralUk } from '@/lib/catalog'
import { topicData } from '@/editorial/topics'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи за виробами: посуд, чашки, вази, світильники, прикраси, плитка',
  description: 'Українські майстри і студії кераміки за тим, що вони роблять: тарілки й миски, чашки, вази й декор, світильники, прикраси, плитка й панно. Кількість майстрів і ціни з прайсів.',
  alternates: { canonical: '/vyrobnyky/vyrib' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи за виробами', kicker: 'Виробники', sub: 'Посуд, чашки, вази, світильники, прикраси, плитка', img: 'stock-glazed-bottles' }) },
}

export default async function ProductsIndex() {
  const rows = (await Promise.all(Object.values(productTopics).map(async (t) => ({ t, d: await topicData(t) })))).filter((r) => r.d.ctx.n >= MIN_LIST)
  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Кераміка ручної роботи за виробами', itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: site.url + r.t.path, name: r.t.crumb })) }} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'Вироби' }]}
        kicker="Виробники"
        title="Кераміка ручної роботи за виробами"
        lead={
          <p className="m-0">
            Що роблять українські майстри і студії кераміки — від тарілок і чашок до світильників і плитки. Біля кожного виробу — скільки майстрів його роблять і за скільки він найчастіше продається в їхніх прайсах.
          </p>
        }
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Block id="list" title="Вироби">
          <StudioCells>
            {rows.map(({ t, d }) => (
              <IndexCell
                key={t.path}
                href={t.path}
                title={t.crumb}
                cta=""
                text={
                  <>
                    {fmt(d.ctx.n)} {pluralUk(d.ctx.n, ['майстер чи студія', 'майстри й студії', 'майстрів і студій'])} у {fmt(d.ctx.cities)} {pluralUk(d.ctx.cities, ['місті', 'містах', 'містах'])}
                    {d.ctx.min && d.ctx.max ? (
                      <span className="mt-1 block font-semibold text-cobalt">
                        здебільшого {fmt(d.ctx.min)}–{fmt(d.ctx.max)} грн
                      </span>
                    ) : null}
                  </>
                }
              />
            ))}
          </StudioCells>
        </Block>
        <ChipGroup as="nav" label="Також" aria-label="Також">
          {[['Виробники за містами', '/vyrobnyky/misto'], ['Ціни 2026', '/tsiny-2026'], ['Посуд для ресторанів', '/dlya-biznesu/posud-dlya-restoraniv'], ['Корпоративні подарунки', '/dlya-biznesu/korporatyvni-podarunky']].map(([l, h]) => (
            <Chip key={h} href={h}>
              {l}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </InnerMain>
  )
}
