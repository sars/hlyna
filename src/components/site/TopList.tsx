import Link from 'next/link'
import React from 'react'

import { Block } from '@/components/site/Inner'
import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { TopPhotos } from '@/components/site/TopPhotos'
import { nobreak } from '@/components/ui/NoBreak'
import type { TopCategory, TopItem } from '@/editorial/copy'
import { getItemPhotos, igHandle, type StudioCard, type StudioPhoto } from '@/lib/catalog'

// «Топ за категоріями» on written pages (SYSTEM.md §4.2): one `Block` per category, ranked rows like `NumberedList`
// (terracotta number 1–5), the price as the most visible line (cobalt, the right column from sm), the maker linked to
// its profile or, when it has none, to its Instagram. Under the row: the studio's own photos (`photos`, with consent) as a
// `TopPhotos` strip, else the Instagram post shown open; the embed loads lazily as it nears the viewport (a compact link
// card stands in until then).

type Known = Map<string, StudioCard>

/** The business category of a page («корпоративні з логотипом»): the request band follows it. */
export const isBusinessTop = (c: TopCategory) => /корпорат|логотип|компані/iu.test(`${c.id} ${c.heading}`)

function Maker({ it, known }: { it: TopItem; known: Known }) {
  const s = it.slug ? known.get(it.slug) : undefined
  const cls = 'text-cobalt underline underline-offset-[3px]'
  if (s) return <Link href={`/vyrobnyky/${s.slug}`} className={cls}>{it.maker}</Link>
  if (it.href)
    return (
      <a href={it.href} target="_blank" rel="noopener nofollow" className={cls}>
        {it.maker}
      </a>
    )
  return <>{it.maker}</>
}

function Row({ it, n, known, photos }: { it: TopItem; n: number; known: Known; photos: StudioPhoto[] }) {
  const s = it.slug ? known.get(it.slug) : undefined
  const handle = igHandle(s?.instagram ?? it.href) || undefined
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2.5 border-b border-rule py-3.5">
      <span aria-hidden className="font-display text-2xl leading-none font-extrabold text-terracotta">
        {n}
      </span>
      {/* From sm the price stands in its own right column across all the text rows; on a phone it is the line under the title. */}
      <div className="grid min-w-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
        <h3 className="m-0 font-display text-[16px] leading-[1.25] font-semibold">{it.title}</h3>
        {it.price && <p className="m-0 mt-1 font-display text-[17px] leading-[1.2] font-semibold text-cobalt tabular-nums sm:col-start-2 sm:row-start-1 sm:row-span-6 sm:mt-0 sm:max-w-[11rem] sm:text-right">{nobreak(it.price)}</p>}
        <p className="m-0 mt-1 text-sm leading-normal text-ink-2 sm:col-start-1">
          <Maker it={it} known={known} />
          {it.city && <> · {it.city}</>}
        </p>
        <p className="m-0 mt-1.5 max-w-read text-[15px] leading-normal sm:col-start-1">{it.details}</p>
        {it.terms && <p className="m-0 mt-1 max-w-read text-sm leading-normal text-ink-2 sm:col-start-1">{it.terms}</p>}
        <p className="m-0 mt-2 font-mono text-[11.5px] leading-[1.4] tracking-[.04em] text-ink-2 uppercase sm:col-start-1">Дані: {it.seen}</p>
        {photos.length ? (
          <div className="mt-3 max-w-[520px] sm:col-start-1 max-sm:-ml-[54px]">
            <TopPhotos photos={photos} name={it.maker} source={it.embed} />
          </div>
        ) : (
          it.embed && (
            // Shown open: the embed loads lazily near the viewport (a compact link card until then). On a phone it takes
            // the full column (it needs ~320px), stepping out of the number's indent.
            <div className="mt-3 max-w-[480px] pb-1 sm:col-start-1 max-sm:-ml-[54px]">
              <InstagramPosts urls={[it.embed]} handle={handle} columns={1} />
            </div>
          )
        )}
      </div>
    </li>
  )
}

export async function TopList({ cat, known }: { cat: TopCategory; known: Known }) {
  if (!cat.items.length) return null
  const items = cat.items.slice(0, 5)
  // An item's photos only for a studio in the catalogue; none (or no consent) → the embed stays.
  const photos = await Promise.all(items.map((it) => (it.photos?.length && it.slug ? getItemPhotos(it.slug, it.photos) : Promise.resolve([]))))
  return (
    <Block id={`top-${cat.id}`} kicker="Топ за категоріями" title={cat.heading} note={cat.intro}>
      <ol className="ui-toprule m-0 grid list-none border-t border-rule p-0">
        {items.map((it, i) => (
          <Row key={`${it.maker}-${it.title}`} it={it} n={i + 1} known={known} photos={photos[i]} />
        ))}
      </ol>
    </Block>
  )
}
