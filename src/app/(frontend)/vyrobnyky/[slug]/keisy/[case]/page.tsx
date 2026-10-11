import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container, SectionHead } from '@/components/site/Bits'
import { InstagramPosts } from '@/components/site/InstagramPosts.client'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/TopicPage'
import { site } from '@/content/site'
import { CASE_LABEL, CASES, FIRST_PUBLISHED, caseByShort, caseFor, caseFormWhat, casePath, caseShort, dateUk, RELATED_LABEL, studioLdId } from '@/editorial/cases'
import { redirectOldStudioSlug } from '@/lib/redirects'
import { getStudioBySlug } from '@/lib/catalog'
import { cleanName } from '@/lib/present'
import { ogImage } from '@/utilities/ogImage'

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
    openGraph: { type: 'article', images: ogImage({ title: c.title, kicker: 'Кейс', sub: `${c.studio.name} · ${c.client.name}`.slice(0, 120), pattern: c.slug }) },
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
  const studioName = studio ? cleanName(studio.name) : c.studio.name
  const handle = c.embeds.length ? (c.embeds[0].match(/instagram\.com\/([^/]+)\/(?:p|reel)\//)?.[1] ?? undefined) : undefined
  const label = CASE_LABEL[c.status] ?? c.status
  const related = (c.related.topics ?? []).filter((t) => RELATED_LABEL[t])
  const what = caseFormWhat(c)

  return (
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 pb-28 lg:pb-16`}>
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

      <div className="grid max-w-[820px] grid-cols-1 gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: studioName, href: `/vyrobnyky/${c.studio.slug}` }, { label: `Кейс: ${c.title}` }]} modified={c.checked} />
        <span className="kicker break-words">Кейс студії · {c.client.type}</span>
        <h1 className="h-display m-0 text-[clamp(24px,3.6vw,40px)] leading-[1.08]">{c.title}</h1>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-umber">
          <span className="rounded-full bg-sand px-2.5 py-1 font-semibold whitespace-nowrap text-ink">{label}</span>
          <span className="whitespace-nowrap">перевірено {dateUk(c.checked)}</span>
          <Link href={`/zapyt?vid=keys&slug=${encodeURIComponent(`${c.studio.slug}/keisy/${caseShort(c)}`)}`}>Попросити зняти або виправити</Link>
        </p>
        <p className="m-0 text-lg">{c.lead}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          <section aria-labelledby="facts">
            <SectionHead title="Що відомо" id="facts" />
            <dl className="m-0 grid grid-cols-1 rounded-2xl bg-card">
              <div className="grid grid-cols-1 gap-0.5 border-b border-line px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3">
                <dt className="text-sm font-semibold text-umber">Студія</dt>
                <dd className="m-0">
                  {studio ? <Link href={`/vyrobnyky/${studio.slug}`}>{studioName}</Link> : studioName}
                  {c.studio.note && <span className="block text-[13px] text-umber">{c.studio.note}</span>}
                </dd>
              </div>
              {c.facts.map((f) => (
                <div key={f.label} className="grid grid-cols-1 gap-0.5 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-sm font-semibold text-umber">{f.label}</dt>
                  <dd className="m-0 break-words">
                    {f.value}
                    {f.source && <span className="block text-[13px] text-umber">{f.source}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {c.sections.map((s, i) => (
            <section key={s.heading} aria-labelledby={`s${i}`}>
              <SectionHead title={s.heading} id={`s${i}`} />
              <div className="grid max-w-[70ch] grid-cols-1 gap-3">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="m-0">{p}</p>
                ))}
              </div>
            </section>
          ))}

          {c.askStudio.length > 0 && (
            <section aria-labelledby="ask">
              <SectionHead kicker="Для схожого замовлення" title="Що спитати в студії" id="ask" />
              <ol className="m-0 grid max-w-[70ch] grid-cols-1 gap-2 pl-5 marker:text-terra">
                {c.askStudio.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </section>
          )}

          {c.embeds.length > 0 && (
            <section aria-labelledby="ig">
              <SectionHead title="Пости в Instagram" id="ig">
                <p className="m-0 text-sm text-umber">Фото належать авторам постів; показуємо вбудованими постами, вони завантажуються з Instagram, коли ви до них гортаєте.</p>
              </SectionHead>
              <InstagramPosts urls={c.embeds.slice(0, 4)} handle={handle} />
            </section>
          )}

          <section aria-labelledby="sources">
            <SectionHead title="Джерела" id="sources" />
            <ul className="m-0 grid grid-cols-1 gap-1.5 pl-5 text-[15px] marker:text-terra">
              {c.sources.map((s) => (
                <li key={s.url + s.title}>
                  <a href={s.url} target="_blank" rel="noopener nofollow">{s.title}</a> <span className="text-umber">· {dateUk(s.date)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-0 text-sm text-umber">
              Ви з цієї студії чи від замовника й бачите неточність? <Link href={`/zapyt?vid=keys&slug=${encodeURIComponent(`${c.studio.slug}/keisy/${caseShort(c)}`)}`}>Напишіть нам</Link> — виправимо або знімемо кейс.
            </p>
          </section>

          <nav aria-label="Схожі сторінки" className="grid grid-cols-1 gap-3">
            <p className="kicker m-0">Дивіться також</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {studio && (
                <li>
                  <Link href={`/vyrobnyky/${studio.slug}`} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:bg-sand hover:text-ink">
                    Профіль: {studioName}
                  </Link>
                </li>
              )}
              {related.map((t) => (
                <li key={t}>
                  <Link href={t} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                    {RELATED_LABEL[t]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24 lg:self-start">
          <RequestForm sourcePage={casePath(c)} defaultWhat={what} />
        </aside>
      </div>
      <MobileRequestBar />
    </main>
  )
}
