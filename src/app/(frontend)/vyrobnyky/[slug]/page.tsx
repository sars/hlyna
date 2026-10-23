import type { Metadata } from 'next'
import { Block, InnerCols, InnerMain } from '@/components/site/Inner'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { CtaBand } from '@/components/ui/CtaBand'
import { Facts } from '@/components/ui/Facts'
import { Kicker } from '@/components/ui/Kicker'
import { ListBlock } from '@/components/ui/ListBlock'
import { MoreLink } from '@/components/ui/MoreLink'
import { Note } from '@/components/ui/Note'
import { PriceList } from '@/components/ui/PriceList'
import { QuoteBlock } from '@/components/ui/QuoteBlock'
import { SideBox } from '@/components/ui/SideBox'
import { IndexCell, StudioCell, StudioCells } from '@/components/ui/StudioCell'
import { ItemGrid } from '@/components/ui/ItemGrid'
import { cardOf, getShopItemsAll } from '@/lib/shopData'
import { Updated } from '@/components/ui/Updated'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import { StudioGallery } from '@/components/ui/StudioGallery'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestBlock } from '@/components/site/RequestBlock'
import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { ProfileMap } from '@/components/site/ProfileMap.client'
import { site } from '@/content/site'
import { ogImage } from '@/lib/ogImage'
import { isPersonMaker } from '@/lib/ld'
import { makerCities } from '@/lib/makers'
import { productChips } from '@/lib/products'
import { centreOf, cityPages, getAllStudios, getCatalog, getStudioBySlug, getStudioPhotos, confirmedForCompanies, confirmedForVenues, igHandle, offersMasterClasses, TYPE_LABEL, type CityPage } from '@/lib/catalog'
import { dropStale } from '@/lib/dates'
import { cleanAddress, cleanPublic, dedupeTexts, displayName, dormantLine, firstAddress, inCity, currentLine, currentNews, currentNote, isDomainLike, isExhibitingOnly, oldDataLabel, pageName, profileUrls, publicPrices, stripPersonal, withoutPriceMention } from '@/lib/present'
import { studioTitle } from '@/lib/title'
import { amountsIn, groupMoney, typicalRange } from '@/lib/money'
import { alsoFor } from '@/lib/linked'
import { acceptsRequests, dedupePrices, formFor, groupPrices, offerItem, relatedStudios } from '@/lib/profile'
import { casePath, casesForStudio, studioLdId } from '@/editorial/cases'
import { topsForStudio } from '@/editorial/tops'
import { redirectOldStudioSlug } from '@/lib/redirects'

const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener nofollow" className="break-all">
    {label}
  </a>
)

export const revalidate = 86400

export async function generateStaticParams() {
  try {
    return (await getCatalog()).map((s) => ({ slug: s.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ slug: string }> }

// «Сайт» row: the host only (the link keeps the full address).
const siteHost = (u: string) => {
  try {
    return new URL(/^https?:\/\//.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '')
  } catch {
    return u.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

// Share card: the first sentences of the summary that fit the label (the card clips at 140 characters).
const cardSummary = (text: string) => {
  const out: string[] = []
  for (const part of stripPersonal(text).split(/(?<=[.!?])\s+/)) {
    if (out.join(' ').length + part.length > 140 && out.length) break
    out.push(part)
    if (out.join(' ').length >= 60) break
  }
  return out.join(' ')
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) return {}
  const city = s.cityDoc?.name
  const name = displayName(s)
  const lead = stripPersonal(s.summary || s.publicDescription || s.description || '')
  return {
    title: studioTitle(name, s.type, city),
    description: (publicPrices(s).length ? lead : withoutPriceMention(lead)).slice(0, 160),
    alternates: { canonical: `/vyrobnyky/${s.slug}` },
    openGraph: { images: ogImage({ title: name, kicker: [TYPE_LABEL[s.type ?? 'other'], city].filter(Boolean).join(' · '), sub: cardSummary(s.summary ?? ''), studio: true, makes: productChips(s) }) },
  }
}

export default async function StudioPage({ params }: Args) {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) {
    await redirectOldStudioSlug(slug)
    notFound()
  }

  const name = displayName(s)
  // The research record's full title («Glynar. Гончарна на Лютеранській (Майстерня «Глинар»)») is a note, not a name:
  // the page shows the short name and the known variants only. A bare Instagram handle already in «Коротко» is not one.
  const handle = igHandle(s.instagram).toLowerCase()
  // A variant that is the short name plus more of that title («Glynar. Гончарна на Лютеранській») is the title too.
  const researchTitle = (t: string) => t.length > name.length && s.name.includes(t) && t.includes(name)
  const altNames = (s.alternateNames ?? []).map((x) => x.text).filter((t) => t && t !== name && !researchTitle(t) && !isDomainLike(t) && t.replace(/^@/, '').toLowerCase() !== handle)
  // On the page, skip variants already visible in the heading («Ґроно (Grono)» → only grono.shop is new).
  const shownAlt = altNames.filter((t) => !name.toLowerCase().includes(t.toLowerCase()))
  const city = s.cityDoc
  const typeLabel = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  const exhibiting = isExhibitingOnly(s)
  // Closed, or no confirmed activity after 2022: the profile stays (history, search), but nothing invites a visit.
  const dormant = Boolean(s.unverified) || s.status === 'closed'
  const mk = !exhibiting && !dormant && offersMasterClasses(s)
  const venues = !exhibiting && !dormant && confirmedForVenues(s)
  const companies = !exhibiting && !dormant && confirmedForCompanies(s)
  const everyone = await getAllStudios()
  const related = relatedStudios(s, everyone)
  // «Також»: linked profiles with what each is to this one (src/content/linked.json), only those that are published.
  const published = new Map((await getCatalog()).map((x) => [x.slug, x]))
  const also = alsoFor(s.slug!).flatMap((a) => {
    const x = published.get(a.slug)
    return x ? [{ ...a, s: x }] : []
  })
  // A linked profile already stands under «Також»: the city list leaves it out.
  const nearby = related.filter((r) => !also.some((a) => a.slug === r.slug))
  // Breadcrumb and «Місто» go to the page that lists the city: its own makers page (/vyrobnyky/misto/<city>), else its
  // oblast centre's page when that page covers the oblast («Тернопіль і область»; a page with the centre alone would read as
  // the wrong city), else the same two kinds of master-class page; none → plain text.
  const pageOf = (pages: CityPage[]) => (city ? (pages.find((p) => p.city.slug === city.slug) ?? pages.find((p) => p.city.slug === centreOf(city) && p.towns.length > 0) ?? null) : null)
  const makersPage = pageOf(await makerCities())
  const classPage = makersPage ? null : pageOf(cityPages(everyone.filter(offersMasterClasses)))
  const cityHref = makersPage ? `/vyrobnyky/misto/${makersPage.city.slug}` : classPage ? `/maister-klasy/${classPage.city.slug}` : ''
  const cityCrumb = makersPage ?? classPage
  const b2b = s.b2b ?? {}
  const hasB2bData = Boolean(b2b.minOrder || b2b.leadTime || b2b.logoMethods?.length || b2b.dishwasherSafe || b2b.foodSafe)
  const channels = dedupeTexts((s.salesChannels ?? []).map((x) => x.text)).slice(0, 6)
  const offer = (xs: { text: string }[] | null | undefined) => dedupeTexts((xs ?? []).map((x) => groupMoney(offerItem(cleanPublic(currentLine(x.text))))).filter(Boolean))
  const products = offer(s.products)
  const services = offer(s.services)
  const prices = dedupePrices(publicPrices(s))
  // schema.org priceRange from the studio's own hryvnia prices (typical span, not extremes).
  const span = typicalRange(prices.filter((p) => !p.year || p.year >= 2025 || !prices.some((x) => (x.year ?? 0) >= 2025)).flatMap((p) => amountsIn(p.text)))
  const priceRange = span ? (span.min === span.max ? `${span.min} UAH` : `${span.min}–${span.max} UAH`) : ''
  const priceGroups = groupPrices(prices)
  // «Є прайс.» goes from the lead when the page shows no prices.
  const unpriced = (t: string) => (prices.length ? t : withoutPriceMention(t))
  const description = unpriced(stripPersonal(dropStale(s.publicDescription || s.description || '')))
  const monthYear = (d?: string | null) => (d ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).formatToParts(new Date(d)).filter((x) => x.type === 'month' || x.type === 'year').map((x) => x.value).join(' ') : '')
  // The studio's own news (as written, signed and dated) wins over ours while it is fresh.
  // Both lose sentences whose date has passed («триває до 11.10») and go once stale (src/lib/dates.ts).
  const newsText = s.ownerNews && s.ownerNewsAt ? currentNews(s.ownerNews, s.ownerNewsAt) : ''
  const studioNews = newsText ? { text: newsText, when: monthYear(s.ownerNewsAt) } : null
  const recentNote = studioNews ? '' : stripPersonal(currentNote(s.recentNote || '', s.activity?.lastPostDate))
  const lastPost = monthYear(s.activity?.lastPostDate)
  const igPosts = (s.activity?.instagramPosts ?? []).map((x) => x.url)
  // A dormant profile opens with a plain sentence (owner, 17.10.2026): the newest dated sign the record holds, that we
  // see no activity now, and where the city's working studios are. Its «Перевірено» date says when we last looked.
  const dormantNote = dormant && s.type !== 'legacy' ? dormantLine(s, { city: city?.name, hasNearby: nearby.length > 0 }) : ''
  const checked = monthYear(s.activity?.checkedAt)
  const inTops = s.slug ? topsForStudio(s.slug) : []
  const facts: [string, React.ReactNode][] = [
    ['Тип', typeLabel],
    ...(city
      ? [
          [
            'Місто',
            !cityCrumb ? city.name : cityCrumb.city.slug === city.slug ? <Link key="c" href={cityHref}>{city.name}</Link> : <React.Fragment key="c">{city.name} · <Link href={cityHref}>{pageName(cityCrumb)}</Link></React.Fragment>,
          ] as [string, React.ReactNode],
        ]
      : []),
    ...(cleanAddress(s.address) ? [['Адреса', cleanAddress(s.address)] as [string, React.ReactNode]] : []),
    ...(s.instagram ? [['Instagram', link(s.instagram, '@' + igHandle(s.instagram))] as [string, React.ReactNode]] : []),
    ...(lastPost ? [['Останній пост', lastPost] as [string, React.ReactNode]] : []),
    ...(s.website ? [['Сайт', link(s.website, siteHost(s.website))] as [string, React.ReactNode]] : []),
    ...(s.facebook ? [['Facebook', link(s.facebook, 'сторінка')] as [string, React.ReactNode]] : []),
    ...(channels.length && !exhibiting ? [['Де продає', channels.join(' · ')] as [string, React.ReactNode]] : []),
    ...(inTops.length
      ? [['У добірках', <span key="tops">{inTops.map((t, i) => <React.Fragment key={t.href}>{i > 0 && ' · '}<Link href={t.href}>{t.label}</Link></React.Fragment>)}</span>] as [string, React.ReactNode]]
      : []),
  ]
  const street = firstAddress(s.address)
  const geo = s.geo
  const precise = geo?.lat != null && geo?.lng != null && (geo.precision === 'address' || geo.precision === 'street')
  const placeText = [cleanAddress(s.address) || street, city && !(cleanAddress(s.address) || street || '').includes(city.name) ? city.name : '']
    .filter(Boolean)
    .join(', ')
  const routeQuery = encodeURIComponent(placeText.replace(/\s*\([^)]*\)/g, ''))
  const receivesVisitors = ['studio', 'school', 'shop', 'heritage'].includes(s.type ?? '')
  const photos = await getStudioPhotos(s.id)
  const cases = casesForStudio(s.slug)
  // The studio's items in the shop (a partner with listed, unsold pieces).
  const shopItems = (await getShopItemsAll()).filter((x) => x.studio.id === s.id && x.visibility === 'public' && x.state !== 'sold')

  // Profiles that cannot take a request get a box with what we know and a request to studios that work now.
  const showForm = acceptsRequests(s)
  // A school that is a project of a studio (its own page has no site or Instagram) sends people to that studio.
  const host = s.type === 'school' ? also.find((a) => a.s.type === 'studio')?.s : undefined
  const otherStudios = `/zapyt?${new URLSearchParams({ what: formFor(s), ...(city?.slug ? { misto: city.slug } : {}) })}`
  // Only an old data date says something in these boxes («останні відомі дані — 2019»).
  const lastData = oldDataLabel(s)
  const via = [s.website && 'сайт', s.instagram && 'Instagram', s.facebook && 'Facebook'].filter(Boolean).join(', ')
  const box: { title: string; text: string } = s.type === 'legacy'
    ? { title: 'Музей, традиція чи пам’ять', text: 'Це не студія: замовлень і занять тут не приймають.' }
    : s.status === 'closed'
      ? { title: 'Не працює', text: `За нашими даними, ${s.type === 'maker' ? 'майстер більше не працює' : 'студія чи майстерня більше не працює'}${lastData ? `; останні відомі дані — ${lastData}` : ''}. Профіль лишаємо як довідку.` }
      : dormant
        ? { title: 'Актуальність не підтверджена', text: `Свіжих постів чи оголошень ми не знайшли${lastData ? `, останні відомі дані — ${lastData}` : ''}, тому запит сюди не надсилаємо. Перед візитом уточніть, чи ${s.type === 'maker' ? 'майстер працює' : 'студія працює'}.` }
        : s.type === 'shop'
          ? { title: 'Де купити', text: `Це магазин: тут купують готові вироби${cleanAddress(s.address) ? ` (${cleanAddress(s.address)})` : ''}${channels.length ? `; канали: ${channels.join(', ')}` : ''}.` }
          : s.type === 'school' || s.type === 'supplier'
            ? { title: 'Як записатися', text: via ? `Записуються напряму в закладі: ${via} — у блоці «Коротко».` : host ? `Записуються через організаторів: контакти — у профілі «${displayName(host)}», блок «Також».` : 'Записуються напряму в закладі; посилань на його сторінки ми не знайшли.' }
            : exhibiting
              ? { title: 'Де побачити роботи', text: channels.length ? `${channels.join(', ').replace(/^./, (c) => c.toUpperCase())}.` : 'Замовлень і занять у відкритих джерелах ми не знайшли.' }
              : { title: 'Як зв’язатися', text: 'Контактів ми не знайшли, тому запит сюди не надсилаємо.' }
  const chips = [...(mk ? ['майстер-класи'] : []), ...(venues ? ['працює із закладами'] : []), ...(companies ? ['корпоративні замовлення'] : [])]
  const priceBlocks = priceGroups.map(([g, lines]) => ({ g, lines }))

  return (
    <InnerMain>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': isPersonMaker(s) ? 'Person' : dormant ? 'Organization' : 'LocalBusiness',
          ...(cases.length ? { '@id': studioLdId(s.slug) } : {}),
          name,
          description: s.summary ? unpriced(stripPersonal(s.summary)) : description,
          url: `${site.url}/vyrobnyky/${s.slug}`,
          ...(city
            ? isPersonMaker(s)
              ? { homeLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA' } } }
              : { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(street ? { streetAddress: street } : {}) } }
            : {}),
          ...(precise && !isPersonMaker(s) && !dormant ? { geo: { '@type': 'GeoCoordinates', latitude: geo!.lat, longitude: geo!.lng } } : {}),
          ...(altNames.length ? { alternateName: altNames } : {}),
          ...(profileUrls(s).length ? { sameAs: profileUrls(s) } : {}),
          ...(priceRange && s.type !== 'maker' && !dormant ? { priceRange } : {}),
          ...(photos.length ? { image: photos.map((p) => `${site.url}${p.url}`) } : {}),
        }}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[clamp(20px,3vw,40px)] border-b-2 border-ink pt-hero pb-[clamp(24px,3vw,40px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid min-w-0 gap-3.5">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, ...(city && cityCrumb ? [{ label: pageName(cityCrumb), href: cityHref }] : []), { label: name }]} modified={s.updatedAt} />
          <Kicker>
            {typeLabel}
            {city ? ` · ${city.name}` : ''}
          </Kicker>
          <h1 className={`m-0 font-display text-h1 [overflow-wrap:anywhere] ${name.length > 60 ? 'max-md:text-[24px] max-md:leading-[1.15]' : ''}`} style={{ letterSpacing: 0 }}>
            {name}
          </h1>
          {s.ownerVerified && <p className="m-0 text-sm font-semibold text-ink-2">✓ Профіль підтверджено студією</p>}
          {shownAlt.length > 0 && <p className="m-0 text-sm break-words text-ink-2">Також відомі як: {shownAlt.slice(0, 4).join(' · ')}</p>}
          {dormantNote && <Note>{dormantNote}</Note>}
          <div className="grid max-w-read gap-3 text-body">
            {description.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="m-0">
                {groupMoney(para)}
              </p>
            ))}
            {s.ownerQuote && s.ownerQuoteApproved && <QuoteBlock>Студія про себе: «{s.ownerQuote}»</QuoteBlock>}
            {studioNews && (
              <div className="grid gap-1">
                <Kicker as="p" className="m-0">
                  Новини від студії · {studioNews.when}
                </Kicker>
                <p className="m-0 whitespace-pre-line">{studioNews.text}</p>
              </div>
            )}
            {recentNote && (
              <p className="m-0">
                <Kicker className="mr-2">Що нового:</Kicker> {recentNote}
              </p>
            )}
          </div>
          {chips.length > 0 && (
            <ChipGroup>
              {chips.map((c) => (
                <Chip key={c} as="span">
                  {c}
                </Chip>
              ))}
            </ChipGroup>
          )}
          <div data-hero-cta="" className="flex flex-wrap gap-2.5">
            <Button href={showForm ? '#zapyt-forma' : otherStudios} variant="cobalt" arrow>
              {showForm ? 'Запит цій студії' : 'Запит іншим студіям'}
            </Button>
          </div>
          {/* A dormant profile says when we looked, not «Оновлено» (it would read as fresh); its data date is in the note above. */}
          {dormant && s.type !== 'legacy' ? <Updated label="Перевірено" {...(checked ? { date: checked } : {})} /> : <Updated />}
        </div>
        <section aria-labelledby="facts" className="min-w-0">
          <Kicker as="p">
            <span id="facts">Коротко</span>
          </Kicker>
          <div className="mt-2">
            <Facts rows={facts} />
          </div>
        </section>
      </div>

      <StudioGallery photos={photos} name={name} />

      <InnerCols
        aside={
          <>
            {showForm ? (
              <RequestBlock page={`/vyrobnyky/${s.slug}`} kind="profile" studio={{ slug: s.slug ?? '', name }} city={city?.name} classes={mk} business={Boolean(venues || companies)} form={{ defaultWhat: formFor(s), defaultCity: city?.name ?? '', studioName: name }} />
            ) : (
              <SideBox title={box.title}>
                <p className="m-0">
                  {box.text} Один запит отримають до 5 студій{city ? ` ${inCity(city.name)} чи поруч` : ''}, які роблять подібне й працюють зараз.
                </p>
                <MoreLink href={otherStudios} pad={false} className="py-1.5">
                  Запит іншим студіям
                </MoreLink>
              </SideBox>
            )}
            {/* A heritage page (late or historical makers, museums) has no owner to claim it (decision 15.10.2026). */}
            {s.type !== 'legacy' && s.status !== 'closed' && (
            <SideBox title="Власникам">
              {s.ownerVerified ? (
                <p className="m-0">
                  <b>Ви представляєте цю студію?</b> Оновлюйте профіль у кабінеті. <Link href="/kabinet">Увійти →</Link>
                </p>
              ) : (
                <p className="m-0">
                  <b>Це ваша студія?</b> Керуйте профілем: фото, ціни, умови для бізнесу — безкоштовно. <Link href={`/kabinet/zayavka?studio=${s.slug}`}>Керувати профілем →</Link>
                </p>
              )}
            </SideBox>
            )}
          </>
        }
      >
        {precise && !dormant && (
          <Block id="where" title="Де знайти" note={<span className="break-words">{placeText}</span>}>
            <ProfileMap lat={geo!.lat!} lng={geo!.lng!} />
            <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">Прокласти маршрут:</span>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${routeQuery}`} target="_blank" rel="noopener nofollow">
                Google Maps
              </a>
              <a href={`https://maps.apple.com/?daddr=${routeQuery}`} target="_blank" rel="noopener nofollow">
                Apple Maps
              </a>
              {city?.slug && <Link href={`/mapa?misto=${city.slug}&studio=${s.slug}`}>Показати на мапі студій</Link>}
            </p>
          </Block>
        )}
        {!precise && !street && !cleanAddress(s.address) && !dormant && receivesVisitors && city && <Note>Працює {inCity(city.name)} — точну адресу уточнюйте у студії.</Note>}

        {(products.length > 0 || services.length > 0) && (
          <Block id="offer" title={s.type === 'legacy' ? 'Що показують і розповідають' : exhibiting ? 'Що створює' : 'Що робить і пропонує'}>
            <div className="grid items-start gap-6 sm:grid-cols-2">
              {products.length > 0 && <ListBlock title="Вироби" items={products} />}
              {services.length > 0 && <ListBlock title="Послуги" items={services} />}
            </div>
          </Block>
        )}

        {prices.length > 0 && (
          <Block id="prices" title="Ціни" note={<>З прайсу, сайту або сторіс студії; біля кожної ціни — джерело й рік. Актуальні ціни уточнюйте у студії або через запит.</>}>
            <div className="grid gap-5">
              {priceBlocks.map(({ g, lines }) => (
                <div key={g} className="grid gap-2">
                  <Kicker as="p">{g}</Kicker>
                  <PriceList items={lines.slice(0, 6).map((p) => ({ text: p.text, source: p.source }))} />
                  {lines.length > 6 && (
                    <details className="group">
                      <MoreLink as="summary" arrow={false}>
                        <span className="group-open:hidden">
                          Ще {lines.length - 6} <span aria-hidden>→</span>
                        </span>
                        <span className="hidden group-open:inline">Згорнути</span>
                      </MoreLink>
                      <PriceList items={lines.slice(6).map((p) => ({ text: p.text, source: p.source }))} />
                    </details>
                  )}
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* A partner's listed items (docs/shop/DESIGN.md §1): up to four, then the studio's shop page. */}
        {shopItems.length > 0 && (
          <Block id="kramnytsia" title="Крамниця" note="Ціни студії; виріб відправляє майстерня.">
            <ItemGrid items={shopItems.slice(0, 4).map(cardOf)} variant="compact" showStudio={false} />
            <MoreLink href={`/kramnytsia/${s.slug}`} arrow>
              Усі вироби студії ({shopItems.length})
            </MoreLink>
          </Block>
        )}

        {/* Shown only with real terms: an empty «not specified yet» box on a hundred profiles told buyers nothing. */}
        {!dormant && hasB2bData && (
          <Block id="b2b" kicker="Для бізнесу" title="Умови для закладів і компаній">
            <Facts
              rows={[
                ...(b2b.minOrder ? ([['Мінімальне замовлення', b2b.minOrder]] as [string, React.ReactNode][]) : []),
                ...(b2b.leadTime ? ([['Термін виготовлення', b2b.leadTime]] as [string, React.ReactNode][]) : []),
                ...(b2b.logoMethods?.length ? ([['Логотип', b2b.logoMethods.map((x) => x.text).join(', ')]] as [string, React.ReactNode][]) : []),
                ...(b2b.dishwasherSafe ? ([['Посудомийна машина', 'можна']] as [string, React.ReactNode][]) : []),
                ...(b2b.foodSafe ? ([['Для їжі', 'безпечно']] as [string, React.ReactNode][]) : []),
              ]}
            />
            {showForm && <CtaBand tone="cobalt" title="Надішліть запит цій студії" text="Безкоштовно для замовника. Студія відповідає напряму." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />}
          </Block>
        )}

        {cases.length > 0 && (
          <Block id="keysy" kicker="Для бізнесу" title="Кейси студії">
            <StudioCells>
              {cases.map((c) => (
                <IndexCell key={c.slug} href={casePath(c)} kicker={`Кейс · ${c.client.name}`} title={c.title} cta="Відкрити" />
              ))}
            </StudioCells>
          </Block>
        )}

        {igPosts.length > 0 && (
          <Block id="ig" title="Останнє в Instagram" note={s.instagram ? <>Вибрані пости з Instagram студії <a href={s.instagram} target="_blank" rel="noopener nofollow">@{igHandle(s.instagram)}</a> і її колаборацій; завантажуються, коли ви до них гортаєте.</> : undefined}>
            <InstagramPosts urls={igPosts} handle={igHandle(s.instagram)} />
          </Block>
        )}

        {also.length > 0 && (
          <Block id="also" title="Також">
            <ul className="m-0 grid list-none gap-2 p-0">
              {also.map((a) => (
                <li key={a.slug} className="text-[15.5px] leading-normal">
                  <Link href={`/vyrobnyky/${a.slug}`}>{displayName(a.s)}</Link> <span className="text-ink-2">— {a.label}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {nearby.length > 0 && city && (
          <Block id="near" title={`Інші студії та майстри: ${city.name}`}>
            <StudioCells>
              {nearby.map((r) => (
                <StudioCell key={r.id} s={r} showCity={false} />
              ))}
            </StudioCells>
          </Block>
        )}
      </InnerCols>
      <MobileRequestBar />
    </InnerMain>
  )
}
