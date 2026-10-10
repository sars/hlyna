import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { StudioCard } from '@/components/site/StudioCard'
import { STUDIO_JOIN_HREF } from '@/content/navigation'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { getAllStudios, getStudioBySlug, groupByCity, hasFormat, igHandle, MIN_LIST, offersMasterClasses, TYPE_LABEL, worksWithCompanies, worksWithVenues, type StudioCard as Card } from '@/lib/catalog'
import { cleanName, dedupeTexts, firstAddress, isExhibitingOnly, profileUrls, publicPrices, stripPersonal, type PriceLine } from '@/lib/present'

export const revalidate = 86400
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    return (await getAllStudios()).map((s) => ({ slug: s.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) return {}
  const city = s.cityDoc?.name
  const what = TYPE_LABEL[s.type ?? 'other']?.toLowerCase() ?? 'майстерня'
  const name = cleanName(s.name)
  return {
    title: `${name}${city ? ` — ${what}, ${city}` : ''}`,
    description: stripPersonal(s.summary || s.publicDescription || s.description || '').slice(0, 160),
    alternates: { canonical: `/vyrobnyky/${s.slug}` },
    openGraph: { images: ogImage({ title: name, kicker: [TYPE_LABEL[s.type ?? 'other'], city].filter(Boolean).join(' · '), sub: stripPersonal(s.summary ?? '') }) },
  }
}

const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener nofollow" className="break-all">
    {label}
  </a>
)

// The request form opens on what this studio is known for.
function formFor(s: Card): string {
  if (hasFormat(s, 'logo')) return 'logo-mugs'
  if (hasFormat(s, 'horeca')) return 'tableware'
  if (hasFormat(s, 'corporate-gifts')) return 'corporate-gifts'
  if (offersMasterClasses(s)) return 'master-class'
  if (hasFormat(s, 'corporate-workshop')) return 'corporate-workshop'
  return 'other'
}

// Price lines grouped the way people read a price list.
const GROUPS: [string, RegExp][] = [
  ['Майстер-класи', /(?<!\p{L})мк(?!\p{L})|майстер-клас|заняття|урок|побачен|для двох|гончарств|ліплен|ліпк|розпис|гончарн\p{L}* (?:кол|круг)/iu],
  ['Курси й абонементи', /курс|абонемент|\d+\s*занять|місяц/iu],
  ['Для компаній', /корпоратив|тімбілд|тимбілд|для компан|для команд|груп[аиу]?\s+до|оптов|гурт/iu],
  ['Коворкінг і послуги', /коворк|оренд|випал|полиц|глина\s+\d|сертифікат/iu],
]
function groupPrices(lines: PriceLine[]) {
  const out = new Map<string, PriceLine[]>()
  for (const l of lines) {
    // Courses and company prices first: «МК» appears in many course lines too.
    const order = [GROUPS[1], GROUPS[2], GROUPS[3], GROUPS[0]]
    const g = order.find(([, re]) => re.test(l.text))?.[0] ?? 'Вироби'
    out.set(g, [...(out.get(g) ?? []), l])
  }
  return [...GROUPS.map(([g]) => g), 'Вироби'].filter((g) => out.has(g)).map((g) => [g, out.get(g)!] as const)
}

const SHOW = 12

function ListBlock({ title, items }: { title: string; items: string[] }) {
  const head = items.slice(0, SHOW)
  const rest = items.slice(SHOW)
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="kicker mb-2">{title}</p>
      <ul className="m-0 grid grid-cols-1 gap-1 pl-5">
        {head.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-bold text-cobalt">
            <span className="group-open:hidden">Ще {rest.length}</span>
            <span className="hidden group-open:inline">Згорнути</span>
          </summary>
          <ul className="m-0 mt-1 grid grid-cols-1 gap-1 pl-5">
            {rest.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </details>
      )}
    </div>
  )
}

function PriceItem({ p }: { p: PriceLine }) {
  return (
    <li className="rounded-xl bg-card px-4 py-3 [font-variant-numeric:lining-nums]">
      {p.text}
      {p.source && <span className="text-[12.5px] text-umber"> · {p.source}</span>}
    </li>
  )
}

export default async function StudioPage({ params }: Args) {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) notFound()

  const name = cleanName(s.name)
  const city = s.cityDoc
  const typeLabel = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  const exhibiting = isExhibitingOnly(s)
  const mk = !exhibiting && offersMasterClasses(s)
  const venues = !exhibiting && worksWithVenues(s)
  const companies = !exhibiting && worksWithCompanies(s)
  const everyone = await getAllStudios()
  const related = city ? everyone.filter((x) => x.cityDoc?.slug === city.slug && x.slug !== s.slug).slice(0, 6) : []
  // Link the city only when it has its own master-class page (MIN_LIST places).
  const cityPage = city ? (groupByCity(everyone.filter(offersMasterClasses)).find((g) => g.city.slug === city.slug)?.studios.length ?? 0) >= MIN_LIST : false
  const b2b = s.b2b ?? {}
  const hasB2bData = Boolean(b2b.minOrder || b2b.leadTime || b2b.logoMethods?.length)
  const channels = dedupeTexts((s.salesChannels ?? []).map((x) => x.text)).slice(0, 6)
  const products = dedupeTexts((s.products ?? []).map((x) => x.text))
  const services = dedupeTexts((s.services ?? []).map((x) => x.text))
  const prices = publicPrices(s)
  const priceGroups = groupPrices(prices)
  const description = stripPersonal(s.publicDescription || s.description || '')
  const facts: [string, React.ReactNode][] = [
    ['Тип', typeLabel],
    ...(city ? [['Місто', cityPage ? <Link key="c" href={`/maister-klasy/${city.slug}`}>{city.name}</Link> : city.name] as [string, React.ReactNode]] : []),
    ...(s.address ? [['Адреса', s.address] as [string, React.ReactNode]] : []),
    ...(s.instagram ? [['Instagram', link(s.instagram, '@' + igHandle(s.instagram))] as [string, React.ReactNode]] : []),
    ...(s.website ? [['Сайт', link(s.website, s.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))] as [string, React.ReactNode]] : []),
    ...(s.facebook ? [['Facebook', link(s.facebook, 'сторінка')] as [string, React.ReactNode]] : []),
    ...(channels.length && !exhibiting ? [['Де продає', channels.join(' · ')] as [string, React.ReactNode]] : []),
  ]
  const street = firstAddress(s.address)

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-16`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': s.type === 'maker' ? 'Person' : 'LocalBusiness',
          name,
          description: stripPersonal(s.summary || description),
          url: `${site.url}/vyrobnyky/${s.slug}`,
          ...(city
            ? s.type === 'maker'
              ? { homeLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA' } } }
              : { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(street ? { streetAddress: street } : {}) } }
            : {}),
          sameAs: profileUrls(s),
        }}
      />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, ...(city && cityPage ? [{ label: city.name, href: `/maister-klasy/${city.slug}` }] : []), { label: name }]} />
        <span className="kicker">{typeLabel}{city ? ` · ${city.name}` : ''}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06] break-words">{name}</h1>
        <div className="grid grid-cols-1 max-w-[70ch] gap-3 text-lg">
          {description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="m-0">{para}</p>
          ))}
        </div>
        {(mk || venues || companies) && (
          <div className="flex flex-wrap gap-2 text-[13px] font-bold">
            {mk && <span className="rounded-full bg-sand px-3 py-1 text-umber">майстер-класи</span>}
            {venues && <span className="rounded-full bg-sand px-3 py-1 text-umber">працює із закладами</span>}
            {companies && <span className="rounded-full bg-sand px-3 py-1 text-umber">корпоративні замовлення</span>}
          </div>
        )}
        <Updated />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          <section aria-labelledby="facts">
            <SectionHead title="Коротко" id="facts" />
            <dl className="m-0 grid grid-cols-1 gap-0 rounded-2xl bg-card">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-1 gap-0.5 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-sm font-semibold text-umber">{k}</dt>
                  <dd className="m-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(products.length > 0 || services.length > 0) && (
            <section aria-labelledby="offer">
              <SectionHead title={exhibiting ? 'Що створює' : 'Що робить і пропонує'} id="offer" />
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                {products.length > 0 && <ListBlock title="Вироби" items={products} />}
                {services.length > 0 && <ListBlock title="Послуги" items={services} />}
              </div>
            </section>
          )}

          {prices.length > 0 && (
            <section aria-labelledby="prices">
              <SectionHead title="Ціни" id="prices">
                <p className="m-0 text-sm text-umber">З прайсу, сайту або сторіс студії; після крапки — джерело і рік. Актуальні ціни уточнюйте у студії або через запит.</p>
              </SectionHead>
              <div className="grid grid-cols-1 gap-5">
                {priceGroups.map(([g, lines]) => (
                  <div key={g} className="grid grid-cols-1 gap-2">
                    <p className="kicker m-0">{g}</p>
                    <ul className="m-0 grid grid-cols-1 list-none gap-2 p-0">
                      {lines.slice(0, 6).map((p) => <PriceItem key={p.text} p={p} />)}
                    </ul>
                    {lines.length > 6 && (
                      <details className="group">
                        <summary className="cursor-pointer list-none text-sm font-bold text-cobalt">
                          <span className="group-open:hidden">Ще {lines.length - 6}</span>
                          <span className="hidden group-open:inline">Згорнути</span>
                        </summary>
                        <ul className="m-0 mt-2 grid grid-cols-1 list-none gap-2 p-0">
                          {lines.slice(6).map((p) => <PriceItem key={p.text} p={p} />)}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(venues || companies || hasB2bData) && (
            <section aria-labelledby="b2b">
              <SectionHead kicker="Для бізнесу" title="Умови для закладів і компаній" id="b2b" />
              {hasB2bData ? (
                <dl className="m-0 grid grid-cols-1 rounded-2xl bg-card">
                  {b2b.minOrder && <div className="grid grid-cols-1 gap-0.5 border-b border-line px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-3"><dt className="text-sm font-semibold text-umber">Мінімальне замовлення</dt><dd className="m-0">{b2b.minOrder}</dd></div>}
                  {b2b.leadTime && <div className="grid grid-cols-1 gap-0.5 border-b border-line px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-3"><dt className="text-sm font-semibold text-umber">Термін</dt><dd className="m-0">{b2b.leadTime}</dd></div>}
                  {!!b2b.logoMethods?.length && <div className="grid grid-cols-1 gap-0.5 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-3"><dt className="text-sm font-semibold text-umber">Логотип</dt><dd className="m-0">{b2b.logoMethods.map((x) => x.text).join(', ')}</dd></div>}
                </dl>
              ) : (
                <p className="m-0 rounded-2xl bg-card p-4">Мінімальну партію, терміни й ціни для бізнесу студія ще не вказала. Надішліть запит — ми передамо його студії разом з іншими, що роблять подібні вироби.</p>
              )}
            </section>
          )}

          {related.length > 0 && city && (
            <section aria-labelledby="near">
              <SectionHead title={`Інші студії та майстри: ${city.name}`} id="near" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{related.map((r) => <StudioCard key={r.id} s={r} showCity={false} />)}</div>
            </section>
          )}
        </div>

        <aside className="grid grid-cols-1 gap-4 lg:sticky lg:top-24">
          {exhibiting ? (
            <div className="grid grid-cols-1 gap-2 rounded-[20px] border border-line bg-card p-[18px]">
              <p className="font-display m-0 text-sm tracking-wide uppercase">Де побачити роботи</p>
              <p className="m-0 text-[15px]">
                {channels.length ? `${channels.join(', ').replace(/^./, (c) => c.toUpperCase())}.` : 'На виставках і в музейних колекціях.'} Замовлень і занять на відкритих сторінках не анонсовано. Шукаєте подібні вироби? Надішліть запит — ми підберемо студії.
              </p>
              <Link href="/zapyt" className="font-bold">Надіслати запит →</Link>
            </div>
          ) : (
            <RequestForm sourcePage={`/vyrobnyky/${s.slug}`} defaultWhat={formFor(s)} defaultCity={city?.name ?? ''} />
          )}
          <div className="rounded-[20px] border border-line bg-cream p-4 text-sm">
            <b>Це ваша студія?</b> Додайте фото, умови для бізнесу й ціни — це безкоштовно. <Link href={STUDIO_JOIN_HREF}>Оновити профіль →</Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
