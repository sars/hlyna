import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import Image from 'next/image'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { ProfileMap } from '@/components/site/ProfileMap.client'
import { StudioCard } from '@/components/site/StudioCard'
import { site } from '@/content/site'
import { ogImage } from '@/utilities/ogImage'
import { isPersonMaker } from '@/lib/ld'
import { makerCities } from '@/lib/makers'
import { getAllStudios, getCatalog, getStudioBySlug, getStudioPhotos, groupByCity, igHandle, MIN_LIST, offersMasterClasses, TYPE_LABEL, worksWithCompanies, worksWithVenues } from '@/lib/catalog'
import { cleanAddress, inCity, cleanName, cleanPublic, dedupeTexts, firstAddress, isExhibitingOnly, profileUrls, publicPrices, stripPersonal } from '@/lib/present'
import { amountsIn, typicalRange } from '@/lib/money'
import { formFor, groupPrices } from '@/lib/profile'
import { casePath, casesForStudio, studioLdId } from '@/editorial/cases'
import { link, ListBlock, PriceItem } from '@/components/profile/blocks'
import { redirectOldStudioSlug } from '@/lib/redirects'

export const revalidate = 86400
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    return (await getCatalog()).map((s) => ({ slug: s.slug as string }))
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

export default async function StudioPage({ params }: Args) {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) {
    await redirectOldStudioSlug(slug)
    notFound()
  }

  const name = cleanName(s.name)
  // A bare Instagram handle already shown in «Коротко» is not an alternative name.
  const handle = igHandle(s.instagram).toLowerCase()
  const altNames = (s.alternateNames ?? []).map((x) => x.text).filter((t) => t && t !== name && t.replace(/^@/, '').toLowerCase() !== handle)
  // On the page, skip variants already visible in the heading («Ґроно (Grono)» → only grono.shop is new).
  const shownAlt = altNames.filter((t) => !name.toLowerCase().includes(t.toLowerCase()))
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
  const products = dedupeTexts((s.products ?? []).map((x) => cleanPublic(x.text)))
  const services = dedupeTexts((s.services ?? []).map((x) => cleanPublic(x.text)))
  const prices = publicPrices(s)
  // schema.org priceRange from the studio's own hryvnia prices (typical span, not extremes).
  const span = typicalRange(prices.filter((p) => !p.year || p.year >= 2025 || !prices.some((x) => (x.year ?? 0) >= 2025)).flatMap((p) => amountsIn(p.text)))
  const priceRange = span ? (span.min === span.max ? `${span.min} UAH` : `${span.min}–${span.max} UAH`) : ''
  const priceGroups = groupPrices(prices)
  const description = stripPersonal(s.publicDescription || s.description || '')
  const recentNote = stripPersonal(s.recentNote || '')
  const monthYear = (d?: string | null) => (d ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).formatToParts(new Date(d)).filter((x) => x.type === 'month' || x.type === 'year').map((x) => x.value).join(' ') : '')
  const lastPost = monthYear(s.activity?.lastPostDate)
  const igPosts = (s.activity?.instagramPosts ?? []).map((x) => x.url)
  const facts: [string, React.ReactNode][] = [
    ['Тип', typeLabel],
    ...(city ? [['Місто', cityHref ? <Link key="c" href={cityHref}>{city.name}</Link> : city.name] as [string, React.ReactNode]] : []),
    ...(cleanAddress(s.address) ? [['Адреса', cleanAddress(s.address)] as [string, React.ReactNode]] : []),
    ...(s.instagram ? [['Instagram', link(s.instagram, '@' + igHandle(s.instagram))] as [string, React.ReactNode]] : []),
    ...(lastPost ? [['Останній пост', lastPost] as [string, React.ReactNode]] : []),
    ...(s.website ? [['Сайт', link(s.website, s.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))] as [string, React.ReactNode]] : []),
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

  return (
    <main className={`${container} grid grid-cols-1 gap-10 pt-8 pb-28 lg:pb-16`}>
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
          ...(altNames.length ? { alternateName: altNames } : {}),
          ...(profileUrls(s).length ? { sameAs: profileUrls(s) } : {}),
          ...(priceRange && s.type !== 'maker' && !dormant ? { priceRange } : {}),
          ...(photos.length ? { image: photos.map((p) => `${site.url}${p.url}`) } : {}),
        }}
      />
      <div className="grid grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, ...(city && cityHref ? [{ label: city.name, href: cityHref }] : []), { label: name }]} modified={s.updatedAt} />
        <span className="kicker">
          {typeLabel}
          {city ? ` · ${city.name}` : ''}
        </span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06] break-words">{name}</h1>
        {s.ownerVerified && <p className="m-0 -mt-2 text-sm font-semibold text-umber">✓ Профіль підтверджено студією</p>}
        {shownAlt.length > 0 && <p className="m-0 -mt-2 text-sm break-words text-umber">Також відомі як: {shownAlt.slice(0, 4).join(' · ')}</p>}
        {photos.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            <Image src={photos[0].url} alt={photos[0].alt} width={photos[0].width} height={photos[0].height} priority sizes="(min-width:1200px) 760px, 100vw" className="aspect-[3/2] w-full max-w-[760px] rounded-[22px] object-cover" />
            {photos.length > 1 && (
              <ul className="m-0 grid max-w-[760px] list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5">
                {photos.slice(1).map((p) => (
                  <li key={p.url}>
                    <a href={p.full} target="_blank" rel="noopener">
                      <Image src={p.url} alt={p.alt} width={p.width} height={p.height} loading="lazy" sizes="(min-width:640px) 150px, 33vw" className="aspect-square w-full rounded-xl object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 text-[12.5px] text-umber">Фото: {name}, публікуються зі згоди студії.</p>
          </div>
        )}
        <div className="grid grid-cols-1 max-w-[70ch] gap-3 text-lg">
          {description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="m-0">{para}</p>
          ))}
          {s.ownerQuote && s.ownerQuoteApproved && (
            <figure className="m-0 border-l-[3px] border-terra py-1 pl-4">
              <blockquote className="m-0 text-[17px]">Студія про себе: «{s.ownerQuote}»</blockquote>
            </figure>
          )}
          {recentNote && (
            <p className="m-0">
              <span className="kicker mr-2">Що нового:</span>{' '}
              {recentNote}
            </p>
          )}
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

          {precise && !dormant && (
            <section aria-labelledby="where">
              <SectionHead title="Де знайти" id="where">
                <p className="m-0 break-words">{placeText}</p>
              </SectionHead>
              <ProfileMap lat={geo!.lat!} lng={geo!.lng!} address={placeText} />
              <p className="mt-3 mb-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-umber">Прокласти маршрут:</span>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${routeQuery}`} target="_blank" rel="noopener nofollow">Google Maps</a>
                <a href={`https://maps.apple.com/?daddr=${routeQuery}`} target="_blank" rel="noopener nofollow">Apple Maps</a>
                {city?.slug && <Link href={`/mapa?misto=${city.slug}&studio=${s.slug}`}>Показати на мапі студій</Link>}
              </p>
            </section>
          )}
          {!precise && !dormant && receivesVisitors && city && (
            <p className="m-0 rounded-2xl bg-card px-4 py-3 text-[15px]">
              Працює {inCity(city.name)} — точну адресу уточнюйте у студії.
            </p>
          )}

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

          {!dormant && (venues || companies || hasB2bData) && (
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

          {cases.length > 0 && (
            <section aria-labelledby="keysy">
              <SectionHead kicker="Для бізнесу" title="Кейси студії" id="keysy" />
              <ul className="m-0 grid grid-cols-1 list-none gap-2 p-0">
                {cases.map((c) => (
                  <li key={c.slug}>
                    <Link href={casePath(c.slug)} className="block rounded-2xl bg-card p-4 text-ink no-underline hover:bg-sand hover:text-ink">
                      <span className="block text-[13px] text-umber">Кейс · {c.client.type}</span>
                      <b>{c.title}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {igPosts.length > 0 && (
            <section aria-labelledby="ig">
              <SectionHead title="Останнє в Instagram" id="ig">
                {s.instagram && <p className="m-0 text-sm text-umber">Вибрані пости з Instagram студії <a href={s.instagram} target="_blank" rel="noopener nofollow">@{igHandle(s.instagram)}</a> і її колаборацій; завантажуються, коли ви до них гортаєте.</p>}
              </SectionHead>
              <InstagramPosts urls={igPosts} handle={igHandle(s.instagram)} />
            </section>
          )}

          {related.length > 0 && city && (
            <section aria-labelledby="near">
              <SectionHead title={`Інші студії та майстри: ${city.name}`} id="near" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{related.map((r) => <StudioCard key={r.id} s={r} showCity={false} />)}</div>
            </section>
          )}
        </div>

        <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24 lg:self-start">
          {dormant ? (
            <div className="grid grid-cols-1 gap-2 rounded-[20px] border border-l-[6px] border-line border-l-ochre bg-card p-[18px]">
              <p className="font-display m-0 text-sm tracking-wide uppercase">{s.status === 'closed' ? 'Не працює' : 'Актуальність не підтверджена'}</p>
              <p className="m-0 text-[15px]">
                {s.status === 'closed'
                  ? 'За нашими даними, студія чи майстерня більше не працює. Профіль лишаємо як довідку.'
                  : 'Актуальність не підтверджена — уточніть перед візитом. Ми не знайшли свіжих оголошень чи постів після 2022 року.'}{' '}
                Шукаєте подібне? Надішліть запит — ми підберемо студії, які працюють зараз.
              </p>
              <Link href="/zapyt" className="font-bold">Надіслати запит →</Link>
            </div>
          ) : exhibiting ? (
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
            {s.ownerVerified ? (
              <>
                <b>Ви представляєте цю студію?</b> Оновлюйте профіль у кабінеті. <Link href="/kabinet">Увійти →</Link>
              </>
            ) : (
              <>
                <b>Це ваша студія?</b> Керуйте профілем: фото, ціни, умови для бізнесу — безкоштовно. <Link href={`/kabinet/zayavka?studio=${s.slug}`}>Керувати профілем →</Link>
              </>
            )}
          </div>
        </aside>
      </div>
      <MobileRequestBar />
    </main>
  )
}
