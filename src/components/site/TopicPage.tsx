import Link from 'next/link'
import React from 'react'

import { BoldFacts, Block, InnerCols, InnerHero, InnerMain, Related } from '@/components/site/Inner'
import { JsonLd } from '@/components/site/JsonLd'
import { PlacePicks, PlaceSeeAlso, PlaceSources, PlaceStory } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { CityHead } from '@/components/ui/CityHead'
import { CityList, SmallCities } from '@/components/ui/CityList'
import { CtaBand } from '@/components/ui/CtaBand'
import { DataTable } from '@/components/ui/DataTable'
import { Epigraph } from '@/components/ui/Epigraph'
import { Faq } from '@/components/ui/Faq'
import { MoreLink } from '@/components/ui/MoreLink'
import { nobreak } from '@/components/ui/NoBreak'
import { NumberedList } from '@/components/ui/NumberedList'
import { QuoteBlock } from '@/components/ui/QuoteBlock'
import { SideBox } from '@/components/ui/SideBox'
import { StudioRow, StudioRows } from '@/components/ui/StudioRow'
import { REQUEST_HREF } from '@/content/navigation'
import { site } from '@/content/site'
import type { Topic } from '@/content/topics'
import { evidenceFor, evidenceLine, topicCityLinks, type Evidence, type TopicData } from '@/editorial/topics'
import { fixPriceRef, mergeFaq, type PlaceContent } from '@/editorial/places'
import { groupByCity, latestUpdate, MIN_LIST, pluralUk, type StudioCard } from '@/lib/catalog'
import { ldStudio } from '@/lib/ld'
import { fmt } from '@/lib/money'
import { displayName } from '@/lib/present'
import { MobileRequestBar } from './MobileRequestBar.client'

const SHOW = 12

function RowFor({ s, why, showCity }: { s: StudioCard; why: Evidence[]; showCity: boolean }) {
  return <StudioRow s={s} line={evidenceLine(s, why)} showCity={showCity} />
}

// Studios of a topic: one flat list with the city on each row, or grouped by city (cities with ≥ MIN_LIST studios get their own
// heading, the rest go to a short «Ще міста і села» list). Long lists open the rest in a native `details`.
export function StudioList({ studios, why, byCity, showCity = true }: { studios: StudioCard[]; why: Evidence[]; byCity?: boolean; showCity?: boolean }) {
  const rows = (list: StudioCard[], showCity: boolean) => (
    <StudioRows>
      {list.map((s) => (
        <RowFor key={s.id} s={s} why={why} showCity={showCity} />
      ))}
    </StudioRows>
  )
  const withMore = (list: StudioCard[], showCity: boolean) =>
    list.length <= SHOW + 2 ? (
      rows(list, showCity)
    ) : (
      <>
        {rows(list.slice(0, SHOW), showCity)}
        <details className="group">
          <MoreLink as="summary">
            <span className="group-open:hidden">Показати ще {list.length - SHOW} →</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </MoreLink>
          {rows(list.slice(SHOW), showCity)}
        </details>
      </>
    )
  if (!byCity) return <div>{withMore(studios, showCity)}</div>
  const groups = groupByCity(studios)
  const big = groups.filter((g) => g.studios.length >= MIN_LIST)
  const small = groups.filter((g) => g.studios.length < MIN_LIST)
  return (
    <div className="grid gap-2">
      {big.map((g) => (
        <section key={g.city.slug}>
          <CityHead id={`misto-${g.city.slug}`} name={g.city.name} count={g.studios.length} />
          {withMore(g.studios, false)}
        </section>
      ))}
      {small.length > 0 && (
        <section>
          <CityHead id="misto-small" name={big.length ? 'Ще міста і села' : 'Міста і села'} />
          <SmallCities groups={small.map((g) => ({ name: g.city.name, studios: g.studios.map((s) => ({ name: displayName(s), href: `/vyrobnyky/${s.slug}` })) }))} />
        </section>
      )}
    </div>
  )
}

// Long by-city lists get a jump list («Київ 20 · Львів 8 …»): chips above the list on phones, a box in the aside on desktop.
// Navigation for people and plain internal links for crawlers.
function CityJump({ groups, variant }: { groups: { slug: string; name: string; n: number }[]; variant: 'chips' | 'card' }) {
  if (groups.length < 3) return null
  if (variant === 'chips')
    return (
      <div className="mb-4 lg:hidden">
        <ChipGroup as="nav" aria-label="Міста у списку">
          {groups.map((g) => (
            <Chip key={g.slug} href={`#misto-${g.slug}`} count={g.n}>
              {g.name}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    )
  return (
    <div className="hidden lg:block">
      <SideBox title="Міста у списку">
        <CityList variant="side" items={groups.map((g) => ({ name: g.name, href: `#misto-${g.slug}`, count: g.n }))} />
      </SideBox>
    </div>
  )
}

// Shared layout for topic pages (src/content/topics/): hero with the numbers, the answer, prices, studio lists, FAQ, and the request
// form in a sticky aside. The request is offered at the top, after the prices and at the end.
export async function TopicPage({ topic, data, h1, crumb, extraParents = [], content, known }: { topic: Topic; data: TopicData; h1?: string; crumb?: string; extraParents?: { label: string; href: string }[]; content?: PlaceContent | null; known?: Map<string, StudioCard> }) {
  const { ctx, lists, all, examples } = data
  const cityLinks = await topicCityLinks(topic, data)
  const place = content && known ? content : null
  const priceWhere = examples.length ? 'у розділі «Ціни» на цій сторінці' : 'на сторінці «Ціни 2026»'
  const faq = mergeFaq(topic.faq(ctx), (place?.faq ?? []).map((f) => ({ q: f.q, a: fixPriceRef(f.a, priceWhere) })))
  const title = h1 ?? topic.h1
  const jump = lists
    .filter((l) => l.byCity)
    .flatMap((l) => groupByCity(l.studios).filter((g) => g.studios.length >= MIN_LIST))
    .reduce<{ slug: string; name: string; n: number }[]>((acc, g) => (acc.some((x) => x.slug === g.city.slug) ? acc : [...acc, { slug: g.city.slug!, name: g.city.name, n: g.studios.length }]), [])
  const firstList = lists.findIndex((l) => l.studios.length)
  const firstByCity = lists.findIndex((x) => x.byCity && x.studios.length)
  const request = topic.form ? '#zapyt-forma' : REQUEST_HREF
  // The numbers of the page, all from the live catalogue: studios, cities, the price range.
  const strip =
    ctx.n > 0 && ctx.cities > 1 && ctx.min && ctx.max
      ? [
          { value: fmt(ctx.n), label: topic.section === 'mk' || topic.section === 'cert' ? pluralUk(ctx.n, ['місце', 'місця', 'місць']) + ' у каталозі' : pluralUk(ctx.n, ['студія чи майстер', 'студії й майстри', 'студій і майстрів']) + ' у каталозі' },
          { value: fmt(ctx.cities), label: pluralUk(ctx.cities, ['місто чи село', 'міста й села', 'міст і сіл']) },
          { value: ctx.min === ctx.max ? fmt(ctx.min) : `${fmt(ctx.min)}–${fmt(ctx.max)}`, label: `грн${topic.price.unitLabel ? ` ${topic.price.unitLabel}` : ''} за прайсами` },
        ]
      : undefined

  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, numberOfItems: all.length, itemListElement: all.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: ldStudio(s) })) }} />
      <InnerHero
        crumbs={[...topic.parents, ...extraParents, { label: crumb ?? topic.crumb }]}
        modified={latestUpdate(all)}
        kicker={topic.kicker}
        title={title}
        lead={
          <>
            {place?.lead && <p className="m-0">{place.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</p>}
            <p className="m-0">
              <BoldFacts text={topic.lead(ctx)} />
            </p>
          </>
        }
        strip={strip}
        chips={cityLinks}
        moreChip={{ label: 'Усі міста →', href: topic.section === 'mk' || topic.section === 'cert' ? '/maister-klasy' : '/vyrobnyky/misto' }}
        photo={topic.photo}
        actions={
          <>
            <Button href={request} variant="cobalt" arrow>
              Отримати пропозиції
            </Button>
            {firstList >= 0 && (
              <Button href={`#list${firstList}`} variant="ghost">
                {firstByCity >= 0 ? 'Студії за містами' : 'Студії'}
              </Button>
            )}
          </>
        }
      />

      <InnerCols
        aside={
          <>
            {topic.form ? (
              <RequestForm sourcePage={topic.path} defaultWhat={topic.form} defaultCity={ctx.place} />
            ) : topic.section === 'makers' ? (
              <SideBox title="Купити або замовити">
                <p className="m-0">Більшість майстрів продають через Instagram, власний сайт чи Etsy — посилання в профілях. Для партії під заклад чи компанію надішліть один запит кільком студіям.</p>
                <MoreLink href="/vyrobnyky/vyrib" pad={false} className="py-1.5">Усі вироби</MoreLink>
                <MoreLink href="/vyrobnyky/misto" pad={false} className="py-1.5">Виробники за містами</MoreLink>
                <MoreLink href={REQUEST_HREF} pad={false} className="py-1.5">Надіслати запит</MoreLink>
              </SideBox>
            ) : (
              <SideBox title="Подарувати або піти командою">
                <p className="m-0">Заняття можна подарувати сертифікатом, а для колективу — замовити корпоратив з ліплення з глини.</p>
                {topic.section === 'cert' ? <MoreLink href="/maister-klasy/dlya-dvokh" pad={false} className="py-1.5">Гончарство для двох</MoreLink> : <MoreLink href="/sertyfikaty" pad={false} className="py-1.5">Сертифікати</MoreLink>}
                <MoreLink href="/dlya-biznesu/korporatyv-lipennya-z-hlyny" pad={false} className="py-1.5">Корпоратив з глиною</MoreLink>
                <MoreLink href={REQUEST_HREF} pad={false} className="py-1.5">Надіслати запит</MoreLink>
              </SideBox>
            )}
            <CityJump groups={jump} variant="card" />
          </>
        }
      >
        {topic.verse.length > 0 && <Epigraph lines={topic.verse} />}
        {place && known && <PlaceStory c={place} known={known} title="Хто що робить зараз" />}
        {place && known && <PlacePicks c={place} known={known} title="Що обрати для чого" />}

        {topic.sections.map((sec, k) => (
          <Block key={sec.title} id={`sec${k}`} kicker={sec.kicker} title={sec.title}>
            <NumberedList columns={2} items={sec.items.map(([t, d]) => ({ title: t, text: d }))} />
          </Block>
        ))}

        <Block id="prices" kicker="Ціни" title={topic.price.title} note={topic.price.note}>
          {examples.length ? (
            <>
              {ctx.priceText && (
                <QuoteBlock source={ctx.priceStudios ? `За прайсами ${ctx.priceStudios} ${pluralUk(ctx.priceStudios, ['студії', 'студій', 'студій'])} з цієї сторінки, ${site.dataUpdated}` : `Індекс цін «Глини», ${site.dataUpdated}`}>
                  {ctx.min === ctx.max ? 'У прайсах' : 'Найчастіше в прайсах'} — <b className="font-semibold">{nobreak(`${ctx.priceText}${topic.price.unitLabel ? ` ${topic.price.unitLabel}` : ''}`)}</b>.
                </QuoteBlock>
              )}
              <DataTable
                caption="Приклади з прайсів студій"
                columns={[{ key: 'studio', label: 'Студія' }, { key: 'city', label: 'Місто' }, { key: 'price', label: 'З прайсу' }, { key: 'src', label: 'Джерело', mono: true }]}
                rows={examples.map((e) => ({ studio: <Link href={`/vyrobnyky/${e.studio.slug}`}>{displayName(e.studio)}</Link>, city: e.studio.cityDoc?.name ?? '', price: nobreak(e.text), src: e.source ?? '' }))}
              />
              <CtaBand tone="cobalt" title="Один запит — кільком студіям одразу" text="Вкажіть, що потрібно, скільки і до якої дати." cta={{ label: 'Отримати пропозиції', href: request }} />
            </>
          ) : (
            <p className="m-0">У каталозі цін на цей формат поки немає — уточнюйте в самих студіях{topic.form ? ' або надішліть запит' : ''}.</p>
          )}
        </Block>

        {lists.map((l, k) =>
          l.studios.length ? (
            <Block key={l.title} id={`list${k}`} title={l.title} note={l.note ?? 'Список за відкритими даними студій (сайти, Instagram, медіа). Умови кожна студія підтверджує сама.'}>
              {k === firstByCity && <CityJump groups={jump} variant="chips" />}
              <StudioList studios={l.studios} why={evidenceFor(topic, Boolean(topic.confirmed) && k === 0)} byCity={l.byCity} showCity={!ctx.place} />
            </Block>
          ) : null,
        )}

        {place && known && <PlaceSeeAlso c={place} known={known} title="Де подивитися й купити" />}

        <Faq id="faq" kicker="Питання і відповіді" title="Часті питання" items={faq} openFirst />
        <Related items={topic.related} />
        <CtaBand tone="ink" {...(topic.form ? { className: 'max-lg:hidden' } : {})} title="Опишіть, що потрібно, — передамо студіям, які роблять подібне" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: request }} />
        {place && <PlaceSources c={place} />}
      </InnerCols>
      {topic.form && <MobileRequestBar />}
    </InnerMain>
  )
}

// On phones the form sits after all the content: a slim bar keeps the request one tap away.
export { MobileRequestBar }
