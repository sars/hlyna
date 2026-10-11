import Link from 'next/link'
import React from 'react'

import { latestUpdate } from '@/lib/catalog'

import { Breadcrumbs, container, DocPhoto, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { PlacePicks, PlaceSeeAlso, PlaceSources, PlaceStory } from '@/components/site/PlaceContent'
import { fixPriceRef, mergeFaq, type PlaceContent } from '@/lib/places'
import { ldStudio } from '@/lib/ld'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { REQUEST_HREF } from '@/content/navigation'
import type { Topic } from '@/content/topics'
import { groupByCity, MIN_LIST, TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { cleanName, stripPersonal, staleNote } from '@/lib/present'
import { evidenceLine, type TopicData } from '@/lib/topics'

function Row({ s, re, showCity }: { s: StudioCard; re: RegExp; showCity: boolean }) {
  const line = stripPersonal(evidenceLine(s, re))
  const stale = staleNote(s)
  return (
    <li>
      <Link href={`/vyrobnyky/${s.slug}`} className="grid grid-cols-1 h-full content-start gap-1.5 rounded-[18px] border border-transparent bg-card p-4 text-ink no-underline hover:border-line hover:text-ink">
        <span className="flex flex-wrap gap-1.5 text-[11.5px] font-bold">
          <span className="rounded-full bg-sand px-2 py-0.5 text-umber">{TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'}</span>
          {showCity && s.cityDoc && <span className="rounded-full bg-sand px-2 py-0.5 text-umber">{s.cityDoc.name}</span>}
        </span>
        <span className="text-[16.5px] leading-snug font-semibold">{cleanName(s.name)}</span>
        {line && <span className="line-clamp-3 text-sm text-umber">{line}</span>}
        {stale && <span className="text-[12.5px] text-terra">{stale}</span>}
      </Link>
    </li>
  )
}

const grid = 'm-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2'
const SHOW = 12

export function StudioList({ studios, re, byCity }: { studios: StudioCard[]; re: RegExp; byCity?: boolean }) {
  if (!byCity) {
    const rows = (list: StudioCard[]) => <ul className={grid}>{list.map((s) => <Row key={s.id} s={s} re={re} showCity />)}</ul>
    if (studios.length <= SHOW + 2) return rows(studios)
    return (
      <div className="grid grid-cols-1 gap-3">
        {rows(studios.slice(0, SHOW))}
        <details className="group grid grid-cols-1 gap-3">
          <summary className="cursor-pointer list-none justify-self-start rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-cobalt group-open:mb-3">
            <span className="group-open:hidden">Показати ще {studios.length - SHOW}</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </summary>
          {rows(studios.slice(SHOW))}
        </details>
      </div>
    )
  }
  const groups = groupByCity(studios)
  const big = groups.filter((g) => g.studios.length >= MIN_LIST)
  const small = groups.filter((g) => g.studios.length < MIN_LIST)
  return (
    <div className="grid grid-cols-1 gap-7">
      {big.map((g) => (
        <section key={g.city.slug} id={`misto-${g.city.slug}`} className="grid grid-cols-1 scroll-mt-24 gap-3">
          <h3 className="h-display m-0 text-[17px]">
            {g.city.name} <span className="text-terra">{g.studios.length}</span>
          </h3>
          <ul className={grid}>{g.studios.map((s) => <Row key={s.id} s={s} re={re} showCity={false} />)}</ul>
        </section>
      ))}
      {small.length > 0 && (
        <section className="grid grid-cols-1 gap-2">
          <h3 className="h-display m-0 text-[17px]">{big.length ? 'Ще міста і села' : 'Міста і села'}</h3>
          <ul className="m-0 grid grid-cols-1 list-none gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2">
            {small.map((g) => (
              <li key={g.city.slug} className="text-[15px] leading-snug">
                <b>{g.city.name}:</b>{' '}
                {g.studios.map((s, j) => (
                  <React.Fragment key={s.id}>
                    {j > 0 && ', '}
                    <Link href={`/vyrobnyky/${s.slug}`}>{cleanName(s.name)}</Link>
                  </React.Fragment>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// Long by-city lists: a jump list («Київ 20 · Львів 8 …») — chips above the list on phones, a sticky card in the
// aside on desktop. It is navigation for people and plain internal links for crawlers.
function CityJump({ groups, variant }: { groups: { slug: string; name: string; n: number }[]; variant: 'chips' | 'card' }) {
  if (groups.length < 3) return null
  const links = groups.map((g) => (
    <li key={g.slug}>
      <a href={`#misto-${g.slug}`} className={variant === 'chips' ? 'inline-block rounded-full bg-card px-3 py-1.5 text-sm whitespace-nowrap text-ink no-underline' : 'text-ink no-underline hover:text-cobalt'}>
        {g.name} <span className="text-terra">{g.n}</span>
      </a>
    </li>
  ))
  return variant === 'chips' ? (
    <nav aria-label="Міста у списку" className="-mx-4 overflow-x-auto px-4 lg:hidden">
      <ul className="m-0 flex list-none gap-2 p-0">{links}</ul>
    </nav>
  ) : (
    <nav aria-label="Міста у списку" className="hidden rounded-[20px] border border-line bg-card p-[18px] lg:block">
      <p className="font-display m-0 mb-2 text-sm tracking-wide uppercase">Міста у списку</p>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-1.5 p-0 text-[15px]">{links}</ul>
    </nav>
  )
}

// Shared layout for topic pages (src/content/topics.ts). Business topics get the request form in the aside.
export function TopicPage({ topic, data, h1, crumb, extraParents = [], content, known }: { topic: Topic; data: TopicData; h1?: string; crumb?: string; extraParents?: { label: string; href: string }[]; content?: PlaceContent | null; known?: Map<string, StudioCard> }) {
  const { ctx, lists, all, examples } = data
  const place = content && known ? content : null
  const priceWhere = examples.length ? 'у розділі «Ціни» на цій сторінці' : 'на сторінці «Ціни 2026»'
  const faq = mergeFaq(topic.faq(ctx), (place?.faq ?? []).map((f) => ({ q: f.q, a: fixPriceRef(f.a, priceWhere) })))
  const title = h1 ?? topic.h1
  const jump = lists
    .filter((l) => l.byCity)
    .flatMap((l) => groupByCity(l.studios).filter((g) => g.studios.length >= MIN_LIST))
    .reduce<{ slug: string; name: string; n: number }[]>((acc, g) => (acc.some((x) => x.slug === g.city.slug) ? acc : [...acc, { slug: g.city.slug!, name: g.city.name, n: g.studios.length }]), [])

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 ${topic.form ? 'pb-28 lg:pb-16' : 'pb-16'}`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, numberOfItems: all.length, itemListElement: all.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: ldStudio(s) })) }} />

      <div className={`grid grid-cols-1 items-start gap-8 ${topic.photo ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]' : ''}`}>
        <div className="grid grid-cols-1 gap-4">
          <Breadcrumbs items={[...topic.parents, ...extraParents, { label: crumb ?? topic.crumb }]} modified={latestUpdate(all)} />
          <span className="kicker">{topic.kicker}</span>
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">{title}</h1>
          {place?.lead && <p className="m-0 max-w-[70ch] text-lg">{place.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</p>}
          <p className={`m-0 max-w-[70ch] ${place?.lead ? '' : 'text-lg'}`}>{topic.lead(ctx)}</p>
          <Updated />
        </div>
        {topic.photo && <DocPhoto photo={topic.photo} priority />}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {topic.verse.length > 0 && <Epigraph lines={topic.verse} />}
          {place && known && <PlaceStory c={place} known={known} title="Хто що робить зараз" />}
          {place && known && <PlacePicks c={place} known={known} title="Що обрати для чого" />}

          {topic.sections.map((sec, k) => (
            <section key={sec.title} aria-labelledby={`sec${k}`}>
              <SectionHead kicker={sec.kicker} title={sec.title} id={`sec${k}`} />
              <ol className="m-0 grid grid-cols-1 list-none gap-2.5 p-0 sm:grid-cols-2">
                {sec.items.map(([t, d], i) => (
                  <li key={t} className="grid grid-cols-1 content-start gap-1 rounded-2xl bg-card p-4 sm:[&:last-child:nth-child(odd)]:col-span-2">
                    <span className="font-display text-sm text-terra">{i + 1}</span>
                    <b>{t}</b>
                    <span className="text-[15px] text-umber">{d}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section aria-labelledby="prices">
            <SectionHead kicker="Ціни" title={topic.price.title} id="prices">
              <p className="m-0 text-sm text-umber">{topic.price.note}</p>
            </SectionHead>
            {examples.length ? (
              <div className="grid grid-cols-1 gap-3">
                {ctx.priceText && (
                  <p className="m-0 text-lg">
                    {ctx.min === ctx.max ? 'У прайсах' : 'Найчастіше в прайсах'} — <b>{ctx.priceText}{topic.price.unitLabel ? ` ${topic.price.unitLabel}` : ''}</b>.
                  </p>
                )}
                <ul className="m-0 grid grid-cols-1 list-none gap-2 p-0">
                  {examples.map((e) => (
                    <li key={e.studio.id} className="rounded-xl bg-card px-3.5 py-2.5 text-[14.5px]">
                      <Link href={`/vyrobnyky/${e.studio.slug}`}>{cleanName(e.studio.name)}</Link>
                      {e.studio.cityDoc && <span className="text-umber"> · {e.studio.cityDoc.name}</span>}: {e.text}
                      {e.source && <span className="text-[12.5px] text-umber"> ({e.source})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="m-0">Студії здебільшого не публікують ціни на цей формат — ціни уточнюйте в самих студіях{topic.form ? ' або надішліть запит' : ''}.</p>
            )}
          </section>

          {lists.map((l, k) =>
            l.studios.length ? (
              <section key={l.title} aria-labelledby={`list${k}`}>
                <SectionHead title={l.title} id={`list${k}`}>
                  <p className="m-0 text-sm text-umber">{l.note ?? 'Список за відкритими даними студій (сайти, Instagram, медіа). Умови кожна студія підтверджує сама.'}</p>
                </SectionHead>
                {k === lists.findIndex((x) => x.byCity && x.studios.length) && <div className="mb-4"><CityJump groups={jump} variant="chips" /></div>}
                <StudioList studios={l.studios} re={topic.evidence} byCity={l.byCity} />
              </section>
            ) : null,
          )}

          {place && known && <PlaceSeeAlso c={place} known={known} title="Де подивитися й купити" />}

          <section aria-labelledby="faq">
            <SectionHead kicker="Питання і відповіді" title="Часті питання" id="faq" />
            <div className="grid grid-cols-1 gap-2.5">
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
                  <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">
                    {f.q}
                    <span aria-hidden className="font-display text-terra group-open:hidden">+</span>
                    <span aria-hidden className="font-display hidden text-terra group-open:inline">–</span>
                  </summary>
                  <p className="mt-0 mb-3.5">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <nav aria-label="Схожі сторінки" className="grid grid-cols-1 gap-3">
            <p className="kicker m-0">Дивіться також</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {topic.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {place && <PlaceSources c={place} />}
        </div>

        <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24">
          <CityJump groups={jump} variant="card" />
          {topic.form ? (
            <RequestForm sourcePage={topic.path} defaultWhat={topic.form} defaultCity={ctx.place} />
          ) : topic.section === 'makers' ? (
            <div className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]">
              <p className="font-display m-0 text-sm tracking-wide uppercase">Купити або замовити</p>
              <p className="m-0 text-[15px]">Більшість майстрів продають через Instagram, власний сайт чи Etsy — посилання в профілях. Для партії під заклад чи компанію надішліть один запит кільком студіям.</p>
              <Link href="/vyrobnyky/vyrib" className="font-bold">Усі вироби →</Link>
              <Link href="/vyrobnyky/misto" className="font-bold">Виробники за містами →</Link>
              <Link href={REQUEST_HREF} className="font-bold">Надіслати запит →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-card p-[18px]">
              <p className="font-display m-0 text-sm tracking-wide uppercase">Подарувати або піти командою</p>
              <p className="m-0 text-[15px]">Сертифікат на майстер-клас — подарунок, який можна купити й в останній день. Для колективу є корпоративи з ліплення з глини.</p>
              {topic.section === 'cert' ? (
                <Link href="/maister-klasy/dlya-dvokh" className="font-bold">Гончарство для двох →</Link>
              ) : (
                <Link href="/sertyfikaty" className="font-bold">Сертифікати →</Link>
              )}
              <Link href="/dlya-biznesu/korporatyv-lipennya-z-hlyny" className="font-bold">Корпоратив з глиною →</Link>
              <Link href={REQUEST_HREF} className="font-bold">Надіслати запит →</Link>
            </div>
          )}
        </aside>
      </div>
      {topic.form && <MobileRequestBar />}
    </main>
  )
}

// On phones the form sits after all the content: a slim bar keeps the request one tap away.
export function MobileRequestBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-clay/95 px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <a href="#zapyt-forma" className="flex w-full justify-center rounded-full bg-terra px-5 py-3 font-bold text-cream no-underline hover:text-cream">
        Отримати пропозиції
      </a>
    </div>
  )
}

