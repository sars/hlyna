import type { Metadata } from 'next'
import { Block, InnerCols, InnerMain, Related } from '@/components/site/Inner'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { CtaBand } from '@/components/ui/CtaBand'
import { Facts } from '@/components/ui/Facts'
import { Kicker } from '@/components/ui/Kicker'
import { NumberedList } from '@/components/ui/NumberedList'
import { Updated } from '@/components/ui/Updated'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/TopicPage'
import { site } from '@/content/site'
import { CASE_LABEL, CASES, FIRST_PUBLISHED, caseByShort, caseFor, caseFormWhat, casePath, caseShort, dateUk, RELATED_LABEL, studioLdId } from '@/editorial/cases'
import { redirectOldStudioSlug } from '@/lib/redirects'
import { getStudioBySlug } from '@/lib/catalog'
import { displayName } from '@/lib/present'
import { ogImage } from '@/lib/ogImage'

export const revalidate = 86400

export const generateStaticParams = () => CASES.map((c) => ({ slug: c.studio.slug!, case: caseShort(c) }))

type Params = Promise<{ slug: string; case: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, case: short } = await params
  const c = caseFor(slug, short)
  if (!c) return {}
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: casePath(c) },
    openGraph: { type: 'article', images: ogImage({ title: c.title, kicker: 'Кейс', sub: `${c.studio.name} · ${c.client.name}` }) },
  }
}

export default async function CasePage({ params }: { params: Params }) {
  const { slug, case: short } = await params
  const c = caseFor(slug, short)
  if (!c) {
    // A renamed studio keeps its case URLs: old studio slug → current one.
    if (caseByShort(short)) await redirectOldStudioSlug(slug, (s) => `/vyrobnyky/${s}/keisy/${short}`)
    notFound()
  }
  const studio = c.studio.slug ? await getStudioBySlug(c.studio.slug) : null
  const studioName = studio ? displayName(studio) : c.studio.name
  const handle = c.embeds.length ? (c.embeds[0].match(/instagram\.com\/([^/]+)\/(?:p|reel)\//)?.[1] ?? undefined) : undefined
  const label = CASE_LABEL[c.status] ?? c.status
  const related = (c.related.topics ?? []).filter((t) => RELATED_LABEL[t])
  const what = caseFormWhat(c)

  return (
    <InnerMain bar>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: c.title,
          description: c.metaDescription,
          inLanguage: 'uk',
          url: site.url + casePath(c),
          mainEntityOfPage: site.url + casePath(c),
          isPartOf: { '@type': 'WebPage', url: `${site.url}/vyrobnyky/${c.studio.slug}`, name: studioName },
          datePublished: c.published ?? FIRST_PUBLISHED,
          dateModified: c.checked,
          author: { '@type': 'Organization', name: site.name, url: site.url },
          publisher: { '@type': 'Organization', name: site.name, url: site.url },
          about: { '@type': 'CreativeWork', name: c.facts.find((f) => /^Вироб/i.test(f.label))?.value ?? c.title, creator: studio ? { '@id': studioLdId(studio.slug) } : { '@type': 'Organization', name: studioName } },
          mentions: [
            studio ? { '@type': 'Organization', '@id': studioLdId(studio.slug), name: studioName, url: `${site.url}/vyrobnyky/${studio.slug}` } : { '@type': 'Organization', name: studioName },
            { '@type': 'Organization', name: c.client.name },
          ],
          isBasedOn: c.sources.map((s) => s.url),
          citation: c.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, datePublished: s.date })),
        }}
      />

      <div className="grid gap-3.5 border-b-2 border-ink pt-hero pb-[clamp(24px,3vw,40px)]">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: studioName, href: `/vyrobnyky/${c.studio.slug}` }, { label: `Кейс: ${c.title}` }]} modified={c.checked} />
        <Kicker className="break-words">Кейс студії · {c.client.type}</Kicker>
        <h1 className="m-0 font-display text-h1 break-words" style={{ letterSpacing: 0 }}>
          {c.title}
        </h1>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-2">
          <Chip as="span" size="sm">
            {label}
          </Chip>
          <span className="whitespace-nowrap">перевірено {dateUk(c.checked)}</span>
          <Link href={`/zapyt?vid=keys&slug=${encodeURIComponent(`${c.studio.slug}/keisy/${caseShort(c)}`)}`}>Попросити зняти або виправити</Link>
        </p>
        <p className="m-0 max-w-read text-lead">{c.lead}</p>
        <div data-hero-cta="" className="flex flex-wrap gap-2.5">
          <Button href="#zapyt-forma" variant="cobalt" arrow>
            Отримати пропозиції
          </Button>
        </div>
        <Updated />
      </div>

      <InnerCols aside={<RequestForm sourcePage={casePath(c)} defaultWhat={what} studioName={studioName} />}>
        <Block id="facts" title="Коротко">
          <Facts
            rows={[
              [
                'Студія',
                <>
                  {studio ? <Link href={`/vyrobnyky/${studio.slug}`}>{studioName}</Link> : studioName}
                  {c.studio.note && <span className="block text-[13px] text-ink-2">{c.studio.note}</span>}
                </>,
              ],
              ...c.facts.map(
                (f) =>
                  [
                    f.label,
                    <>
                      {f.value}
                      {f.source && <span className="block text-[13px] text-ink-2">{f.source}</span>}
                    </>,
                  ] as [string, React.ReactNode],
              ),
            ]}
          />
        </Block>
        <CtaBand tone="cobalt" title="Надішліть один запит — відповідять 3–5 студій" text="Вкажіть, що потрібно, скільки і до якої дати." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />

        {c.sections.map((sec, i) => (
          <Block key={sec.heading} id={`s${i}`} title={sec.heading}>
            <div className="grid max-w-read gap-3">
              {sec.paragraphs.map((p, j) => (
                <p key={j} className="m-0">
                  {p}
                </p>
              ))}
            </div>
          </Block>
        ))}

        {c.askStudio.length > 0 && (
          <Block id="ask" kicker="Для схожого замовлення" title="Що спитати в студії">
            <NumberedList plainTitle items={c.askStudio.map((q) => ({ title: q }))} />
          </Block>
        )}

        {c.embeds.length > 0 && (
          <Block id="ig" title="Пости в Instagram" note={<>Фото належать авторам постів; показуємо вбудованими постами, вони завантажуються з Instagram, коли ви до них гортаєте.</>}>
            <InstagramPosts urls={c.embeds.slice(0, 4)} handle={handle} />
          </Block>
        )}

        <Block id="sources" title="Джерела">
          <ul className="m-0 grid max-w-read list-none gap-1.5 p-0 text-[15px]">
            {c.sources.map((src) => (
              <li key={src.url + src.title} className="before:text-terracotta-text before:content-['—_']">
                <a href={src.url} target="_blank" rel="noopener nofollow">
                  {src.title}
                </a>{' '}
                <span className="text-ink-2">· {dateUk(src.date)}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-ink-2">
              Ви з цієї студії чи від замовника й бачите неточність? <Link href={`/zapyt?vid=keys&slug=${encodeURIComponent(`${c.studio.slug}/keisy/${caseShort(c)}`)}`}>Напишіть нам</Link> — виправимо або знімемо кейс.
          </p>
        </Block>

        <Related items={[...(studio ? [{ label: `Профіль: ${studioName}`, href: `/vyrobnyky/${studio.slug}` }] : []), ...related.map((t) => ({ label: RELATED_LABEL[t], href: t }))]} />
        <CtaBand tone="ink" className="max-lg:hidden" title="Опишіть, що потрібно, — студії відповідуть напряму" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: '#zapyt-forma' }} />
      </InnerCols>
      <MobileRequestBar />
    </InnerMain>
  )
}
