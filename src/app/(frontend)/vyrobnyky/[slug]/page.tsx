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
import { Updated } from '@/components/ui/Updated'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import Image from 'next/image'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { ProfileMap } from '@/components/site/ProfileMap.client'
import { site } from '@/content/site'
import { ogImage } from '@/lib/ogImage'
import { isPersonMaker } from '@/lib/ld'
import { makerCities } from '@/lib/makers'
import { productChips } from '@/lib/products'
import { getAllStudios, getCatalog, getStudioBySlug, getStudioPhotos, groupByCity, igHandle, MIN_LIST, offersMasterClasses, TYPE_LABEL, worksWithCompanies, worksWithVenues } from '@/lib/catalog'
import { cleanAddress, cleanPublic, dedupeTexts, displayName, firstAddress, fullNameIfDifferent, inCity, isDomainLike, isExhibitingOnly, newsIsFresh, noteIsFresh, profileUrls, publicPrices, stripPersonal } from '@/lib/present'
import { studioTitle } from '@/lib/title'
import { amountsIn, groupMoney, typicalRange } from '@/lib/money'
import { formFor, groupPrices } from '@/lib/profile'
import { casePath, casesForStudio, studioLdId } from '@/editorial/cases'
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
  return {
    title: studioTitle(name, s.type, city),
    description: stripPersonal(s.summary || s.publicDescription || s.description || '').slice(0, 160),
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
  // The full name goes under the H1 and into schema.org alternateName only when it says more than the short one.
  const fullName = fullNameIfDifferent(s)
  // A bare Instagram handle already shown in «Коротко» is not an alternative name.
  const handle = igHandle(s.instagram).toLowerCase()
  const altNames = (s.alternateNames ?? []).map((x) => x.text).filter((t) => t && t !== name && t !== fullName && !isDomainLike(t) && t.replace(/^@/, '').toLowerCase() !== handle)
  // On the page, skip variants already visible in the heading or the full name («Ґроно (Grono)» → only grono.shop is new).
  const shownAlt = altNames.filter((t) => ![name, fullName ?? ''].some((n) => n.toLowerCase().includes(t.toLowerCase())))
  const city = s.cityDoc
  const typeLabel = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  const exhibiting = isExhibitingOnly(s)
  // Closed, or no confirmed activity after 2022: the profile stays (history, search), but nothing invites a visit.
  const dormant = Boolean(s.unverified) || s.status === 'closed'
  const mk = !exhibiting && !dormant && offersMasterClasses(s)
  const venues = !exhibiting && !dormant && worksWithVenues(s)
  const companies = !exhibiting && !dormant && worksWithCompanies(s)
  const everyone = await getAllStudios()
  const related = city ? everyone.filter((x) => x.cityDoc?.slug === city.slug && x.slug !== s.slug).slice(0, 6) : []
  // Link the city only when it has its own master-class page (MIN_LIST places).
  const cityPage = city ? (groupByCity(everyone.filter(offersMasterClasses)).find((g) => g.city.slug === city.slug)?.studios.length ?? 0) >= MIN_LIST : false
  // Breadcrumb and «Місто» go to the city's makers page (/vyrobnyky/misto/<city>), else to its master-class page.
  const makersPage = city ? (await makerCities()).some((g) => g.city.slug === city.slug) : false
  const cityHref = city ? (makersPage ? `/vyrobnyky/misto/${city.slug}` : cityPage ? `/maister-klasy/${city.slug}` : '') : ''
  const b2b = s.b2b ?? {}
  const hasB2bData = Boolean(b2b.minOrder || b2b.leadTime || b2b.logoMethods?.length)
  const channels = dedupeTexts((s.salesChannels ?? []).map((x) => x.text)).slice(0, 6)
  const products = dedupeTexts((s.products ?? []).map((x) => groupMoney(cleanPublic(x.text))))
  const services = dedupeTexts((s.services ?? []).map((x) => groupMoney(cleanPublic(x.text))))
  const prices = publicPrices(s)
  // schema.org priceRange from the studio's own hryvnia prices (typical span, not extremes).
  const span = typicalRange(prices.filter((p) => !p.year || p.year >= 2025 || !prices.some((x) => (x.year ?? 0) >= 2025)).flatMap((p) => amountsIn(p.text)))
  const priceRange = span ? (span.min === span.max ? `${span.min} UAH` : `${span.min}–${span.max} UAH`) : ''
  const priceGroups = groupPrices(prices)
  const description = stripPersonal(s.publicDescription || s.description || '')
  const monthYear = (d?: string | null) => (d ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).formatToParts(new Date(d)).filter((x) => x.type === 'month' || x.type === 'year').map((x) => x.value).join(' ') : '')
  // The studio's own news (as written, signed and dated) wins over ours while it is fresh.
  const studioNews = s.ownerNews && s.ownerNewsAt && newsIsFresh(s.ownerNewsAt) ? { text: s.ownerNews, when: monthYear(s.ownerNewsAt) } : null
  const recentNote = !studioNews && noteIsFresh(s.recentNote || '', s.activity?.lastPostDate) ? stripPersonal(s.recentNote || '') : ''
  const lastPost = monthYear(s.activity?.lastPostDate)
  const igPosts = (s.activity?.instagramPosts ?? []).map((x) => x.url)
  const facts: [string, React.ReactNode][] = [
    ['Тип', typeLabel],
    ...(city ? [['Місто', cityHref ? <Link key="c" href={cityHref}>{city.name}</Link> : city.name] as [string, React.ReactNode]] : []),
    ...(cleanAddress(s.address) ? [['Адреса', cleanAddress(s.address)] as [string, React.ReactNode]] : []),
    ...(s.instagram ? [['Instagram', link(s.instagram, '@' + igHandle(s.instagram))] as [string, React.ReactNode]] : []),
    ...(lastPost ? [['Останній пост', lastPost] as [string, React.ReactNode]] : []),
    ...(s.website ? [['Сайт', link(s.website, siteHost(s.website))] as [string, React.ReactNode]] : []),
    ...(s.facebook ? [['Facebook', link(s.facebook, 'сторінка')] as [string, React.ReactNode]] : []),
    ...(channels.length && !exhibiting ? [['Де продає', channels.join(' · ')] as [string, React.ReactNode]] : []),
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

  const showForm = !dormant && !exhibiting
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
          description: stripPersonal(s.summary || description),
          url: `${site.url}/vyrobnyky/${s.slug}`,
          ...(city
            ? isPersonMaker(s)
              ? { homeLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA' } } }
              : { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(street ? { streetAddress: street } : {}) } }
            : {}),
          ...(precise && !isPersonMaker(s) && !dormant ? { geo: { '@type': 'GeoCoordinates', latitude: geo!.lat, longitude: geo!.lng } } : {}),
          ...(fullName || altNames.length ? { alternateName: [...(fullName ? [fullName] : []), ...altNames] } : {}),
          ...(profileUrls(s).length ? { sameAs: profileUrls(s) } : {}),
          ...(priceRange && s.type !== 'maker' && !dormant ? { priceRange } : {}),
          ...(photos.length ? { image: photos.map((p) => `${site.url}${p.url}`) } : {}),
        }}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[clamp(20px,3vw,40px)] border-b-2 border-ink pt-hero pb-[clamp(24px,3vw,40px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid min-w-0 gap-3.5">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, ...(city && cityHref ? [{ label: city.name, href: cityHref }] : []), { label: name }]} modified={s.updatedAt} />
          <Kicker>
            {typeLabel}
            {city ? ` · ${city.name}` : ''}
          </Kicker>
          <h1 className={`m-0 font-display text-h1 [overflow-wrap:anywhere] ${name.length > 60 ? 'max-md:text-[24px] max-md:leading-[1.15]' : ''}`} style={{ letterSpacing: 0 }}>
            {name}
          </h1>
          {fullName && <p className="m-0 text-sm break-words text-ink-2">{fullName}</p>}
          {s.ownerVerified && <p className="m-0 text-sm font-semibold text-ink-2">✓ Профіль підтверджено студією</p>}
          {shownAlt.length > 0 && <p className="m-0 text-sm break-words text-ink-2">Також відомі як: {shownAlt.slice(0, 4).join(' · ')}</p>}
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
          {showForm && (
            <div data-hero-cta="" className="flex flex-wrap gap-2.5">
              <Button href="#zapyt-forma" variant="cobalt" arrow>
                Запит цій студії
              </Button>
            </div>
          )}
          <Updated />
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

      {photos.length > 0 && (
        <section aria-label="Фото студії" className="grid gap-2 pt-[clamp(24px,3vw,40px)]">
          <Image src={photos[0].url} alt={photos[0].alt} width={photos[0].width} height={photos[0].height} sizes="(min-width:1200px) 760px, 100vw" className="aspect-[3/2] w-full max-w-[760px] object-cover" />
          {photos.length > 1 && (
            <ul className="m-0 grid max-w-[760px] list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5">
              {photos.slice(1).map((p) => (
                <li key={p.url}>
                  <a href={p.full} target="_blank" rel="noopener">
                    <Image src={p.url} alt={p.alt} width={p.width} height={p.height} loading="lazy" sizes="(min-width:640px) 150px, 33vw" className="aspect-square w-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-[12.5px] text-ink-2">Фото: {name}, публікуються зі згоди студії.</p>
        </section>
      )}

      <InnerCols
        aside={
          <>
            {dormant && s.type !== 'legacy' ? (
              <SideBox title={s.status === 'closed' ? 'Не працює' : 'Актуальність не підтверджена'}>
                <p className="m-0">
                  {s.status === 'closed'
                    ? 'За нашими даними, студія чи майстерня більше не працює. Профіль лишаємо як довідку.'
                    : 'Актуальність не підтверджена — уточніть перед візитом. Ми не знайшли свіжих оголошень чи постів після 2022 року.'}{' '}
                  Шукаєте подібне? Надішліть запит — ми підберемо студії, які працюють зараз.
                </p>
                <MoreLink href="/zapyt" pad={false} className="py-1.5">
                  Надіслати запит
                </MoreLink>
              </SideBox>
            ) : s.type === 'legacy' ? (
              <SideBox title="Музей, традиція чи пам’ять">
                <p className="m-0">Це не студія: замовлень і занять тут не приймають. Шукаєте кераміку чи майстер-клас? Надішліть запит — ми підберемо студії, які працюють зараз.</p>
                <MoreLink href="/zapyt" pad={false} className="py-1.5">
                  Надіслати запит
                </MoreLink>
              </SideBox>
            ) : exhibiting ? (
              <SideBox title="Де побачити роботи">
                <p className="m-0">
                  {channels.length ? `${channels.join(', ').replace(/^./, (c) => c.toUpperCase())}.` : 'На виставках і в музейних колекціях.'} Замовлень і занять на відкритих сторінках не анонсовано. Шукаєте подібні вироби? Надішліть запит — ми підберемо студії.
                </p>
                <MoreLink href="/zapyt" pad={false} className="py-1.5">
                  Надіслати запит
                </MoreLink>
              </SideBox>
            ) : (
              <RequestForm sourcePage={`/vyrobnyky/${s.slug}`} defaultWhat={formFor(s)} defaultCity={city?.name ?? ''} studioName={name} />
            )}
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
          </>
        }
      >
        {precise && !dormant && (
          <Block id="where" title="Де знайти" note={<span className="break-words">{placeText}</span>}>
            <ProfileMap lat={geo!.lat!} lng={geo!.lng!} address={placeText} />
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
          <Block id="prices" title="Ціни" note={<>З прайсу, сайту або сторіс студії; після крапки — джерело і рік. Актуальні ціни уточнюйте у студії або через запит.</>}>
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

        {!dormant && (venues || companies || hasB2bData) && (
          <Block id="b2b" kicker="Для бізнесу" title="Умови для закладів і компаній">
            {hasB2bData ? (
              <Facts
                rows={[
                  ...(b2b.minOrder ? ([['Мінімальне замовлення', b2b.minOrder]] as [string, React.ReactNode][]) : []),
                  ...(b2b.leadTime ? ([['Термін', b2b.leadTime]] as [string, React.ReactNode][]) : []),
                  ...(b2b.logoMethods?.length ? ([['Логотип', b2b.logoMethods.map((x) => x.text).join(', ')]] as [string, React.ReactNode][]) : []),
                ]}
              />
            ) : (
              <Note>Мінімальну партію, терміни й ціни для бізнесу студія ще не вказала. Надішліть запит — ми передамо його студії разом з іншими, що роблять подібні вироби.</Note>
            )}
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

        {related.length > 0 && city && (
          <Block id="near" title={`Інші студії та майстри: ${city.name}`}>
            <StudioCells>
              {related.map((r) => (
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
