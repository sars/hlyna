import Link from 'next/link'
import React from 'react'

import { Block, FaqRich, InnerCols, InnerHero, InnerMain, Related } from '@/components/site/Inner'
import { JsonLd } from '@/components/site/JsonLd'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { RequestBlock } from '@/components/site/RequestBlock'
import { RequestForm } from '@/components/site/RequestForm.client'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { CtaBand } from '@/components/ui/CtaBand'
import { DataTable } from '@/components/ui/DataTable'
import { Epigraph } from '@/components/ui/Epigraph'
import { Kicker } from '@/components/ui/Kicker'
import { nobreak } from '@/components/ui/NoBreak'
import { NumberedList } from '@/components/ui/NumberedList'
import { REQUEST_HREF } from '@/content/navigation'
import type { Block as GuideBlock, Guide } from '@/content/guides'
import { site } from '@/content/site'
import type { GuideCtx } from '@/editorial/guides'

function BlockView({ b }: { b: GuideBlock }) {
  if ('p' in b) return <p className="m-0 max-w-read">{b.p}</p>
  if ('list' in b)
    return (
      <ul className="m-0 grid max-w-read list-none gap-1.5 p-0">
        {b.list.map((x) => (
          <li key={x} className="before:text-terracotta-text before:content-['—_']">
            {x}
          </li>
        ))}
      </ul>
    )
  if ('steps' in b) return <NumberedList columns={2} items={b.steps.map(([t, d]) => ({ title: t, text: d }))} />
  if ('table' in b) {
    const cols = b.table.head.map((h, j) => ({ key: `c${j}`, label: h }))
    return (
      <DataTable
        mode={cols.length >= 5 ? 'scroll' : 'stack'}
        columns={cols}
        rows={b.table.rows.map((r, i) => Object.fromEntries(r.map((c, j) => [`c${j}`, j === 0 && b.table.links?.[i] ? <Link key={j} href={b.table.links[i]!}>{c}</Link> : nobreak(c)])))}
      />
    )
  }
  return (
    <ChipGroup>
      {b.links.map((l) => (
        <Chip key={l.href} href={l.href}>
          {l.label} →
        </Chip>
      ))}
    </ChipGroup>
  )
}

// Layout for guides (/hayidy/*) and /dlya-studiy: factual lead, optional verse and photo, sections, FAQ, form.
export function GuidePage({ guide, ctx, parents }: { guide: Guide; ctx: GuideCtx; parents: { label: string; href?: string }[] }) {
  const faq = guide.faq(ctx)
  const photo = guide.photo
  const bar = Boolean(guide.form && !guide.form.studio)
  const request = guide.form ? '#zapyt-forma' : REQUEST_HREF
  return (
    <InnerMain>
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
      <InnerHero
        crumbs={[...parents, { label: guide.h1 }]}
        kicker={guide.kicker}
        title={guide.h1}
        lead={<p className="m-0">{guide.lead(ctx)}</p>}
        photo={photo}
        actions={
          <Button href={request} variant="cobalt" arrow>
            {guide.form?.studio ? 'Додати студію' : 'Отримати пропозиції'}
          </Button>
        }
      />
      <InnerCols aside={guide.form ? guide.form.studio ? <RequestForm sourcePage={guide.path} defaultWhat={guide.form.what} forStudio /> : <RequestBlock page={guide.path} kind={guide.form.what === 'master-class' ? 'classes' : 'business'} form={{ defaultWhat: guide.form.what }} /> : undefined}>
        {guide.verse && <Epigraph lines={guide.verse} />}
        {guide.sections.length > 2 && (
          <nav aria-label="Зміст" className="grid gap-2">
            <Kicker as="p">Зміст</Kicker>
            <ol className="m-0 grid list-none gap-1 p-0">
              {guide.sections.map((s, i) => (
                <li key={s.id} className="grid grid-cols-[28px_minmax(0,1fr)]">
                  <span className="font-mono text-xs leading-[1.9] text-terracotta-text">{i + 1}</span>
                  <a href={`#${s.id}`} className="text-ink hover:text-cobalt">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {guide.sections.map((s) => (
          <Block key={s.id} id={s.id} kicker={s.kicker} title={s.title}>
            {s.blocks(ctx).map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
          </Block>
        ))}
        <Block id="faq" kicker="Питання і відповіді" title="Часті питання">
          <FaqRich items={faq.map((f) => ({ q: f.q, a: f.a }))} />
        </Block>
        <Related items={guide.related} />
        <CtaBand tone="ink" className={guide.form ? 'max-lg:hidden' : undefined} title={guide.form?.studio ? 'Додайте студію — профіль безкоштовний' : 'Опишіть, що потрібно, — передамо студіям, які роблять подібне'} text={guide.form?.studio ? 'Студія платить 10% лише з замовлень, що відбулися.' : 'Безкоштовно для замовника: ціни встановлюють студії.'} cta={{ label: guide.form?.studio ? 'Додати студію' : 'Отримати пропозиції', href: request }} />
      </InnerCols>
      {bar && <MobileRequestBar />}
    </InnerMain>
  )
}
