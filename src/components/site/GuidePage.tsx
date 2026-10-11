import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, container, DocPhoto, Epigraph, SectionHead, Updated } from '@/components/site/Bits'
import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { MobileRequestBar } from '@/components/site/TopicPage'
import type { Block, Guide } from '@/content/guides'
import { docPhotos } from '@/content/photos'
import { site } from '@/content/site'
import type { GuideCtx } from '@/lib/guides'

function BlockView({ b }: { b: Block }) {
  if ('p' in b) return <p className="m-0 max-w-[70ch]">{b.p}</p>
  if ('list' in b)
    return (
      <ul className="m-0 grid grid-cols-1 gap-2 pl-5 marker:text-terra">
        {b.list.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    )
  if ('steps' in b)
    return (
      <ol className="m-0 grid grid-cols-1 list-none gap-2.5 p-0 sm:grid-cols-2">
        {b.steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-1 content-start gap-1 rounded-2xl bg-card p-4 sm:[&:last-child:nth-child(odd)]:col-span-2">
            <span className="font-display text-sm text-terra">{i + 1}</span>
            <b>{t}</b>
            <span className="text-[15px] text-umber">{d}</span>
          </li>
        ))}
      </ol>
    )
  if ('table' in b)
    return (
      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full border-collapse text-[14.5px]">
          <thead>
            <tr className="text-left text-[12.5px] tracking-wide text-umber uppercase">
              {b.table.head.map((h) => (
                <th key={h} className="border-b border-line px-3.5 py-3 align-bottom">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((r, i) => (
              <tr key={r[0]} className="align-top">
                {r.map((c, j) => (
                  <td key={j} className={`border-b border-line px-3.5 py-3 ${j === 0 ? 'font-semibold' : c.length <= 14 ? 'whitespace-nowrap' : ''} ${i === b.table.rows.length - 1 ? 'border-b-0' : ''}`}>
                    {j === 0 && b.table.links?.[i] ? <Link href={b.table.links[i]!}>{c}</Link> : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {b.links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm font-semibold no-underline hover:bg-sand">
            {l.label} →
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Layout for guides (/hayidy/*) and /dlya-studiy: factual lead, optional verse and photo, sections, FAQ, form.
export function GuidePage({ guide, ctx, parents }: { guide: Guide; ctx: GuideCtx; parents: { label: string; href?: string }[] }) {
  const faq = guide.faq(ctx)
  const photo = guide.photo ? docPhotos[guide.photo] : null
  const bar = guide.form && !guide.form.studio
  return (
    <main className={`${container} grid w-full grid-cols-1 gap-10 pt-8 ${bar ? 'pb-28 lg:pb-16' : 'pb-16'}`}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.h1,
          description: guide.description,
          inLanguage: 'uk',
          url: site.url + guide.path,
          datePublished: '2026-10-10',
          dateModified: site.dataModified,
          author: { '@type': 'Organization', name: site.name, url: site.url },
          publisher: { '@type': 'Organization', name: site.name, url: site.url },
        }}
      />
      <div className={`grid grid-cols-1 items-start gap-8 ${photo ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]' : ''}`}>
        <div className="grid grid-cols-1 gap-4">
          <Breadcrumbs items={[...parents, { label: guide.h1 }]} />
          <span className="kicker">{guide.kicker}</span>
          <h1 className="h-display m-0 text-[clamp(26px,4vw,44px)] leading-[1.06]">{guide.h1}</h1>
          <p className="m-0 max-w-[70ch] text-lg">{guide.lead(ctx)}</p>
          <Updated />
        </div>
        {photo && <DocPhoto photo={photo} priority />}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="grid grid-cols-1 gap-10">
          {guide.verse && <Epigraph lines={guide.verse} />}
          {guide.sections.length > 2 && (
            <nav aria-label="Зміст" className="grid grid-cols-1 gap-2">
              <p className="kicker m-0">Зміст</p>
              <ol className="m-0 grid grid-cols-1 gap-1 pl-5 marker:text-terra">
                {guide.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {guide.sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="scroll-mt-24">
              <SectionHead kicker={s.kicker} title={s.title} id={s.id} />
              <div className="grid grid-cols-1 gap-4">
                {s.blocks(ctx).map((b, i) => (
                  <BlockView key={i} b={b} />
                ))}
              </div>
            </section>
          ))}

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
              {guide.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="inline-block rounded-full bg-card px-3.5 py-2 text-sm text-ink no-underline hover:bg-sand hover:text-ink">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {guide.form && (
          <aside id="zapyt-forma" className="grid grid-cols-1 scroll-mt-24 gap-4 lg:sticky lg:top-24 lg:self-start">
            <RequestForm sourcePage={guide.path} defaultWhat={guide.form.what} forStudio={guide.form.studio} />
          </aside>
        )}
      </div>
      {bar && <MobileRequestBar />}
    </main>
  )
}
