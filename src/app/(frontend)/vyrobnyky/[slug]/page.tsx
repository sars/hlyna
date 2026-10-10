import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs, container, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { StudioCard } from '@/components/site/StudioCard'
import { site } from '@/content/site'
import { getAllStudios, getStudioBySlug, igHandle, offersMasterClasses, TYPE_LABEL, worksWithCompanies, worksWithVenues } from '@/lib/catalog'

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
  return {
    title: `${s.name}${city ? ` — ${what}, ${city}` : ''}`,
    description: (s.description ?? '').slice(0, 155),
    alternates: { canonical: `/vyrobnyky/${s.slug}` },
  }
}

const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener nofollow" className="break-all">
    {label}
  </a>
)

export default async function StudioPage({ params }: Args) {
  const { slug } = await params
  const s = await getStudioBySlug(slug)
  if (!s) notFound()

  const city = s.cityDoc
  const typeLabel = TYPE_LABEL[s.type ?? 'other'] ?? 'Інше'
  const mk = offersMasterClasses(s)
  const venues = worksWithVenues(s)
  const companies = worksWithCompanies(s)
  const related = city ? (await getAllStudios()).filter((x) => x.cityDoc?.slug === city.slug && x.slug !== s.slug).slice(0, 6) : []
  const b2b = s.b2b ?? {}
  const facts: [string, React.ReactNode][] = [
    ['Тип', typeLabel],
    ...(city ? [['Місто', <Link key="c" href={`/maister-klasy/${city.slug}`}>{city.name}</Link>] as [string, React.ReactNode]] : []),
    ...(s.address ? [['Адреса', s.address] as [string, React.ReactNode]] : []),
    ...(s.instagram ? [['Instagram', link(s.instagram, '@' + igHandle(s.instagram))] as [string, React.ReactNode]] : []),
    ...(s.website ? [['Сайт', link(s.website, s.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))] as [string, React.ReactNode]] : []),
    ...(s.facebook ? [['Facebook', link(s.facebook, 'сторінка')] as [string, React.ReactNode]] : []),
    ...(s.salesChannels?.length ? [['Де продає', s.salesChannels.map((x) => x.text).join(', ')] as [string, React.ReactNode]] : []),
  ]

  return (
    <main className={`${container} grid gap-10 pt-8 pb-16`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': s.type === 'maker' ? 'Person' : 'LocalBusiness',
          name: s.name,
          description: s.description,
          url: `${site.url}/vyrobnyky/${s.slug}`,
          ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'UA', ...(s.address ? { streetAddress: s.address } : {}) } } : {}),
          sameAs: [s.instagram, s.website, s.facebook, ...(s.otherLinks ?? []).map((l) => l.url)].filter(Boolean),
        }}
      />
      <div className="grid gap-4">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, ...(city ? [{ label: city.name, href: `/maister-klasy/${city.slug}` }] : []), { label: s.name }]} />
        <span className="kicker">{typeLabel}{city ? ` · ${city.name}` : ''}</span>
        <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">{s.name}</h1>
        <p className="m-0 max-w-[70ch] text-lg">{s.description}</p>
        <div className="flex flex-wrap gap-2 text-[13px] font-bold">
          {mk && <span className="rounded-full bg-sand px-3 py-1 text-umber">майстер-класи</span>}
          {venues && <span className="rounded-full bg-sand px-3 py-1 text-umber">працює із закладами</span>}
          {companies && <span className="rounded-full bg-sand px-3 py-1 text-umber">корпоративні замовлення</span>}
          {!!s.prices?.length && <span className="rounded-full bg-[#e7ecf7] px-3 py-1 text-cobalt">ціни з прайсу</span>}
        </div>
        <Updated />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid gap-10">
          <section aria-labelledby="facts">
            <SectionHead title="Коротко" id="facts" />
            <dl className="m-0 grid gap-0 rounded-2xl bg-card">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <dt className="text-sm font-semibold text-umber">{k}</dt>
                  <dd className="m-0">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(!!s.services?.length || !!s.products?.length) && (
            <section aria-labelledby="offer">
              <SectionHead title="Що робить і пропонує" id="offer" />
              <div className="grid gap-4 sm:grid-cols-2">
                {!!s.products?.length && (
                  <div className="rounded-2xl bg-card p-4"><p className="kicker mb-2">Вироби</p><ul className="m-0 grid gap-1 pl-5">{s.products.map((p) => <li key={p.id ?? p.text}>{p.text}</li>)}</ul></div>
                )}
                {!!s.services?.length && (
                  <div className="rounded-2xl bg-card p-4"><p className="kicker mb-2">Послуги</p><ul className="m-0 grid gap-1 pl-5">{s.services.map((p) => <li key={p.id ?? p.text}>{p.text}</li>)}</ul></div>
                )}
              </div>
            </section>
          )}

          {!!s.prices?.length && (
            <section aria-labelledby="prices">
              <SectionHead title="Ціни" id="prices">
                <p className="m-0 text-sm text-umber">З прайсу, сайту або сторіс студії. Актуальні ціни уточнюйте у студії або через запит.</p>
              </SectionHead>
              <ul className="m-0 grid list-none gap-2 p-0">
                {s.prices.map((p) => (
                  <li key={p.id ?? p.text} className="rounded-xl bg-card px-4 py-3 [font-variant-numeric:lining-nums]">{p.text}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="b2b">
            <SectionHead kicker="Для бізнесу" title="Умови для закладів і компаній" id="b2b" />
            {b2b.minOrder || b2b.leadTime || b2b.logoMethods?.length ? (
              <dl className="m-0 grid rounded-2xl bg-card">
                {b2b.minOrder && <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3"><dt className="text-sm font-semibold text-umber">Мінімальне замовлення</dt><dd className="m-0">{b2b.minOrder}</dd></div>}
                {b2b.leadTime && <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3"><dt className="text-sm font-semibold text-umber">Термін</dt><dd className="m-0">{b2b.leadTime}</dd></div>}
                {!!b2b.logoMethods?.length && <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 px-4 py-3"><dt className="text-sm font-semibold text-umber">Логотип</dt><dd className="m-0">{b2b.logoMethods.map((x) => x.text).join(', ')}</dd></div>}
              </dl>
            ) : (
              <p className="m-0 rounded-2xl bg-card p-4">Мінімальну партію, терміни й ціни для бізнесу студія ще не вказала. Надішліть запит — ми передамо його студії разом з іншими, що роблять подібні вироби.</p>
            )}
          </section>

          {related.length > 0 && city && (
            <section aria-labelledby="near">
              <SectionHead title={`Інші студії та майстри: ${city.name}`} id="near" />
              <div className="grid gap-3 sm:grid-cols-2">{related.map((r) => <StudioCard key={r.id} s={r} showCity={false} />)}</div>
            </section>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <RequestForm sourcePage={`/vyrobnyky/${s.slug}`} />
          <div className="rounded-[20px] border border-line bg-cream p-4 text-sm">
            <b>Це ваша студія?</b> Додайте фото, умови для бізнесу й ціни — це безкоштовно. <Link href="/dlya-studiy">Оновити профіль →</Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
