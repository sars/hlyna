import type { Metadata } from 'next'
import { Block, InnerCols, InnerHero, InnerMain } from '@/components/site/Inner'
import { Button } from '@/components/ui/Button'
import { CtaBand } from '@/components/ui/CtaBand'
import { DataTable } from '@/components/ui/DataTable'
import { Faq } from '@/components/ui/Faq'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { MoreLink } from '@/components/ui/MoreLink'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'

import { latestUpdate } from '@/lib/catalog'

import { JsonLd } from '@/components/site/JsonLd'
import { PlacePicks, PlaceSeeAlso, PlaceSources, PlaceStory } from '@/components/site/PlaceContent'
import { RequestForm } from '@/components/site/RequestForm.client'
import { site } from '@/content/site'
import { getAllStudios, getAllWithShops, getLegacy, getShops, groupByCity, MIN_LIST, offersMasterClasses, pluralUk, type StudioCard } from '@/lib/catalog'
import { CityStudioLinks } from '@/components/ui/CityList'
import { cityStats, makerCities, makerCity, TYPE_GROUPS } from '@/lib/makers'
import { aboutCity, cleanName, firstAddress, inCity, oblastLabel } from '@/lib/present'
import { cityContent, fixPriceRef, mergeFaq } from '@/editorial/places'
import { localPrices } from '@/lib/priceIndex'
import { certificateCities } from '@/editorial/topics'
import { ogImage } from '@/utilities/ogImage'
import { fmt } from '@/lib/money'
import { redirectOldCitySlug } from '@/lib/redirects'

export const revalidate = 86400

export async function generateStaticParams() {
  try {
    return (await makerCities()).map((g) => ({ city: g.city.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string }> }

const who = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])}`
const SHOW = 12

// Studios with Instagram and a summary first: they are the ones a visitor can actually check and contact.
const rank = (s: StudioCard) => (s.instagram ? 2 : 0) + (s.summary ? 1 : 0)

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const g = await makerCity((await params).city)
  if (!g) return {}
  return {
    title: `Кераміка ручної роботи ${inCity(g.city.name)}: ${who(g.studios.length)}`,
    description: (cityContent(g.city.slug as string)?.lead || `Керамічні студії, бренди й майстри ${inCity(g.city.name)}: ${who(g.studios.length)} — посуд, декор, майстер-класи, замовлення для закладів і компаній.`).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 300),
    alternates: { canonical: `/vyrobnyky/misto/${g.city.slug}` },
    openGraph: { images: ogImage({ title: `Кераміка ручної роботи: ${g.city.name}`, kicker: 'Виробники', sub: 'Студії, бренди й майстри: посуд, декор, майстер-класи, замовлення для закладів і компаній', img: 'og-318-1' }) },
  }
}

export default async function CityMakersPage({ params }: Args) {
  const citySlug = (await params).city
  const g = await makerCity(citySlug)
  if (!g) {
    await redirectOldCitySlug(citySlug, (c) => `/vyrobnyky/misto/${c}`)
    notFound()
  }
  const { city, studios } = g
  const where = inCity(city.name)
  const region = oblastLabel(city)
  const st = cityStats(studios)
  const mkPage = groupByCity((await getAllStudios()).filter(offersMasterClasses)).some((x) => x.city.slug === city.slug && x.studios.length >= MIN_LIST)
  const certPage = (await certificateCities()).some((c) => c.slug === city.slug)
  const groups = TYPE_GROUPS.map((t) => ({ ...t, studios: studios.filter((s) => t.types.includes(s.type ?? '')).sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'uk')) })).filter((t) => t.studios.length)
  const counts = groups.map((t) => `${t.title.toLowerCase()} — ${t.studios.length}`).join(', ')
  const content = cityContent(city.slug as string)
  const shops = (await getShops()).filter((s) => s.cityDoc?.slug === city.slug).sort((a, b) => a.name.localeCompare(b.name, 'uk'))
  const legacy = (await getLegacy()).filter((s) => s.cityDoc?.slug === city.slug).sort((a, b) => a.name.localeCompare(b.name, 'uk'))
  const known = new Map((await getAllWithShops()).map((s) => [s.slug as string, s]))
  const prices = localPrices(studios)
  const priceWhere = prices.length ? 'у розділі «Ціни» на цій сторінці' : 'на сторінці «Ціни 2026»'

  const baseFaq = [
    { q: `Де купити кераміку ручної роботи ${where}?`, a: `У каталозі — ${who(studios.length)} ${where}. Більшість продають напряму: через Instagram, власний сайт, Etsy чи у своїй майстерні; посилання — у профілях. Частина брендів має шоуруми або продається в концепт-сторах.` },
    ...(st.classes ? [{ q: `Де пройти майстер-клас з кераміки ${where}?`, a: `Майстер-класи проводять ${st.classes} ${pluralUk(st.classes, ['місце', 'місця', 'місць'])} з цього списку${mkPage ? ' — окремий перелік з цінами на сторінці майстер-класів міста' : ''}.` }] : []),
    { q: 'Чи можна замовити посуд для закладу чи подарунки для компанії?', a: `${st.venues ? `${st.venues} ${pluralUk(st.venues, ['студія тут згадує', 'студії тут згадують', 'студій тут згадують'])} роботу із закладами. ` : ''}Надішліть один запит — ми передамо його студіям, які роблять подібні вироби, у цьому місті й поруч. Для замовника це безкоштовно.` },
  ]
  const faq = mergeFaq(baseFaq, (content?.faq ?? []).map((f) => ({ q: f.q, a: fixPriceRef(f.a, priceWhere) })))

  return (
    <InnerMain bar>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Кераміка ручної роботи: ${city.name}`,
          numberOfItems: studios.length,
          itemListElement: groups.flatMap((t) => t.studios).map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': s.type === 'maker' ? 'Person' : 'LocalBusiness',
              name: cleanName(s.name),
              url: `${site.url}/vyrobnyky/${s.slug}`,
              ...(s.type === 'maker' ? {} : { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(firstAddress(s.address) ? { streetAddress: firstAddress(s.address) } : {}) } }),
            },
          })),
        }}
      />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'За містами', href: '/vyrobnyky/misto' }, { label: city.name }]}
        modified={latestUpdate(studios)}
        kicker={`Виробники${region ? ` · ${region}` : ''}`}
        title={`Кераміка ручної роботи: ${city.name}`}
        lead={
          <>
            {content?.lead && <p className="m-0">{content.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</p>}
            <p className="m-0">
          У каталозі «Глина» — {who(studios.length)} {where}: {counts}.
              {st.classes ? ` ${st.classes} ${pluralUk(st.classes, ['проводить', 'проводять', 'проводять'])} майстер-класи` : ''}
              {st.classes && st.venues ? ', ' : st.venues ? ' ' : ''}
              {st.venues ? `${st.venues} ${pluralUk(st.venues, ['працює', 'працюють', 'працюють'])} із закладами` : ''}
              {st.classes || st.venues ? '.' : ''} Біля кожного — що робить, адреса й Instagram.
            </p>
          </>
        }
        strip={st.classes && st.venues ? [{ value: fmt(studios.length), label: pluralUk(studios.length, ['профіль', 'профілі', 'профілів']) }, { value: fmt(st.classes), label: pluralUk(st.classes, ['місце', 'місця', 'місць']) + ' з майстер-класами' }, { value: fmt(st.venues), label: 'працюють із закладами' }] : undefined}
        chipsLabel={`Ще про ${aboutCity(city.name)}:`}
        chips={[...(mkPage ? [{ label: `Майстер-класи: ${city.name} →`, href: `/maister-klasy/${city.slug}` }] : []), ...(certPage ? [{ label: `Сертифікати: ${city.name} →`, href: `/sertyfikaty/${city.slug}` }] : []), { label: 'Показати на мапі →', href: `/mapa?misto=${city.slug}` }]}
        actions={
          <Button href="#zapyt-forma" variant="cobalt" arrow>
            Отримати пропозиції
          </Button>
        }
      />

      <InnerCols aside={<RequestForm sourcePage={`/vyrobnyky/misto/${city.slug}`} defaultWhat="tableware" defaultCity={city.name} />}>
        {content && <PlaceStory c={content} known={known} title={`Кераміка ${where}: що тут роблять`} />}
        {content && <PlacePicks c={content} known={known} />}
        {prices.length > 0 && (
          <Block id="prices" kicker="Ціни" title={`Ціни ${where}`} note={<>З прайсів студій цього міста: одна ціна на студію, від найнижчої до найвищої. Порівняння з усією Україною — на сторінці <Link href="/tsiny-2026">«Ціни 2026»</Link>.</>}>
            <DataTable
              columns={[{ key: 'what', label: 'Що' }, { key: 'text', label: 'Ціни', numeric: true }, { key: 'median', label: 'Медіана', numeric: true, align: 'end' }, { key: 'n', label: 'Студій', numeric: true, align: 'end' }]}
              rows={prices.map((p) => ({
                what: (
                  <>
                    {p.cat.label} <span className="text-[13px] text-ink-2">{p.cat.unit}</span>
                  </>
                ),
                text: p.text,
                median: p.median ? `${fmt(p.median)} грн` : '—',
                n: p.n,
              }))}
            />
          </Block>
        )}
        {groups.map((t, k) => (
          <Block key={t.title} id={`g${k}`} title={`${t.title} ${t.studios.length > 1 ? `· ${t.studios.length}` : ''}`}>
            <div>
              <MakerRows>
                {t.studios.slice(0, t.studios.length > SHOW + 2 ? SHOW : undefined).map((s) => (
                  <MakerRow key={s.id} s={s} />
                ))}
              </MakerRows>
              {t.studios.length > SHOW + 2 && (
                <details className="group">
                  <MoreLink as="summary">
                    <span className="group-open:hidden">Показати ще {t.studios.length - SHOW} →</span>
                    <span className="hidden group-open:inline">Згорнути</span>
                  </MoreLink>
                  <MakerRows>
                    {t.studios.slice(SHOW).map((s) => (
                      <MakerRow key={s.id} s={s} />
                    ))}
                  </MakerRows>
                </details>
              )}
            </div>
          </Block>
        ))}

        {shops.length > 0 && (
          <Block id="shops" title={`Магазини й галереї · ${shops.length}`} note="Де продають і показують кераміку різних майстрів; це не студії, тому окремо від списків вище.">
            <CityStudioLinks studios={shops.map((s) => ({ id: s.id, name: cleanName(s.name), href: `/vyrobnyky/${s.slug}` }))} />
          </Block>
        )}

        {legacy.length > 0 && (
          <Block id="legacy" title={`Музеї й спадщина · ${legacy.length}`} note="Музеї, осередки традиційної кераміки й пам’ять про майстрів; це не студії, тому окремо від списків вище.">
            <CityStudioLinks studios={legacy.map((s) => ({ id: s.id, name: cleanName(s.name), href: `/vyrobnyky/${s.slug}` }))} />
          </Block>
        )}

        {content && <PlaceSeeAlso c={content} known={known} />}
        <Faq id="faq" kicker="Питання і відповіді" title="Часті питання" items={faq} openFirst jsonLd={false} />
        <CtaBand tone="ink" className="max-lg:hidden" title="Опишіть, що потрібно, — студії відповідуть напряму" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />
        {content && <PlaceSources c={content} />}
      </InnerCols>
      <MobileRequestBar />
    </InnerMain>
  )
}
