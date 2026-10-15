import type { Metadata } from 'next'
import React from 'react'

import { Block, InnerCols, InnerHero, InnerMain, RequestBand } from '@/components/site/Inner'
import { RequestForm } from '@/components/site/RequestForm.client'
import { SearchAnswer, SearchField, SearchRow } from '@/components/site/search/SearchRow'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { popularSearches, searchCopy } from '@/content/search'
import { site } from '@/content/site'
import { pluralUk } from '@/lib/catalog'
import { searchCatalog } from '@/server/searchIndex'

// /poshuk?q=: the results of the header search as a page. It works without JavaScript (every search field is a GET form
// to here), carries «Усі результати» from the panel, and is never indexed: results pages are thin by nature.

type Args = { searchParams: Promise<{ q?: string | string[] }> }
const queryOf = async (searchParams: Args['searchParams']) => {
  const { q } = await searchParams
  return (Array.isArray(q) ? q[0] : (q ?? '')).trim().slice(0, 100)
}

export async function generateMetadata({ searchParams }: Args): Promise<Metadata> {
  const q = await queryOf(searchParams)
  return { title: q ? `Пошук: ${q}` : 'Пошук по каталогу', robots: { index: false, follow: true }, alternates: { canonical: '/poshuk' } }
}

const n = (k: number, forms: [string, string, string]) => `${k} ${pluralUk(k, forms)}`

const Popular = () => (
  <ChipGroup as="nav" label="Спробуйте:" aria-label="Спробуйте">
    {popularSearches.map((p) => (
      <Chip key={p} href={`/poshuk?q=${encodeURIComponent(p)}`}>
        {p}
      </Chip>
    ))}
  </ChipGroup>
)

export default async function SearchPage({ searchParams }: Args) {
  const q = await queryOf(searchParams)
  const { index, result: r } = await searchCatalog(q)
  const crumbs = [{ label: 'Головна', href: '/' }, { label: 'Пошук' }]
  const found = r ? (r.answer ? 1 : 0) + r.cities.length + r.studios.length + r.pages.length : 0
  const toRequest = `/zapyt?q=${encodeURIComponent(q)}`

  if (!r || !found)
    return (
      <InnerMain>
        <InnerHero
          crumbs={crumbs}
          kicker="Пошук по каталогу"
          title={q ? `За «${q}» нічого не знайшли` : 'Пошук по каталогу'}
          lead={
            <>
              <p className="m-0">{q ? searchCopy.noneText : `${searchCopy.placeholder}: ${searchCopy.help} ${searchCopy.helpLatin}`}</p>
              <SearchField q={q} />
              <Popular />
            </>
          }
          actions={
            q ? (
              <Button href={toRequest} variant="cobalt" arrow>
                Отримати пропозиції
              </Button>
            ) : undefined
          }
        />
      </InnerMain>
    )

  const cityName = new Map(index.cities)
  const city = cityName.get((r.answer ?? r.cities[0] ?? r.studios[0])?.c?.[0] ?? '') ?? ''
  const classes = [r.answer, ...r.cities].some((h) => h?.u.startsWith('/maister-klasy'))
  const parts = [
    r.answer && 'сторінку-відповідь',
    r.cities.length && n(r.cities.length, ['місто', 'міста', 'міст']),
    r.studios.length && n(r.studios.length, ['студію', 'студії', 'студій']),
    r.pages.length && n(r.pages.length, ['сторінку', 'сторінки', 'сторінок']),
  ].filter(Boolean) as string[]
  const listed = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} і ${parts.at(-1)}` : parts[0]
  return (
    <InnerMain>
      <InnerHero
        crumbs={crumbs}
        kicker="Пошук по каталогу"
        title={`Результати для «${q}»`}
        lead={
          <>
            <p className="m-0">
              Знайшли {listed}
              {r.corrected ? ` (шукали як «${r.corrected}»)` : ''}. Дані каталогу — {site.dataUpdated}; ціни — разове групове заняття з прайсів студій.
            </p>
            <SearchField q={q} />
          </>
        }
      />
      <InnerCols aside={<RequestForm sourcePage="/poshuk" defaultWhat={classes ? 'master-class' : 'other'} defaultCity={city} />}>
        <div className="srch-page grid gap-block">
          {r.answer && (
            <Block id="answer" title="Відповідь" note="Сторінка каталогу, що відповідає на запит повністю.">
              <SearchAnswer hit={r.answer} />
            </Block>
          )}
          {r.studios.length > 0 && (
            <Block id="studios" title={`Студії · ${r.studios.length}`} note="Ціна — разове групове заняття для дорослих з прайсу студії.">
              <div className="grid">
                {r.studios.map((h) => (
                  <SearchRow key={h.u} hit={h} />
                ))}
              </div>
            </Block>
          )}
          {r.cities.length > 0 && (
            <Block id="cities" title={`Міста · ${r.cities.length}`}>
              <div className="grid">
                {r.cities.map((h) => (
                  <SearchRow key={h.u} hit={h} />
                ))}
              </div>
            </Block>
          )}
          {r.pages.length > 0 && (
            <Block id="pages" title={`Сторінки й гайди · ${r.pages.length}`}>
              <div className="grid">
                {r.pages.map((h) => (
                  <SearchRow key={h.u} hit={h} />
                ))}
              </div>
            </Block>
          )}
          <RequestBand path="/poshuk" tone="ink" href={toRequest} />
        </div>
      </InnerCols>
    </InnerMain>
  )
}
