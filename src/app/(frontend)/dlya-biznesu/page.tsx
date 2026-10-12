import type { Metadata } from 'next'
import { Block, InnerCols, InnerHero, InnerMain } from '@/components/site/Inner'
import { Button } from '@/components/ui/Button'
import { Epigraph } from '@/components/ui/Epigraph'
import { Faq } from '@/components/ui/Faq'
import { Kicker } from '@/components/ui/Kicker'
import { IndexCell, StudioCells } from '@/components/ui/StudioCell'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { mainNav } from '@/content/navigation'
import { facts } from '@/lib/facts'
import { site } from '@/content/site'
import { verses } from '@/content/verses'
import { getAllStudios, groupByCity, hasFormat, pluralUk, TYPE_LABEL, worksWithCompanies, worksWithVenues, type StudioCard } from '@/lib/catalog'
import { displayName, stripPersonal } from '@/lib/present'
import { ogImage, ogPhoto } from '@/utilities/ogImage'
import { sitePhotos } from '@/content/photos'
import { fmt } from '@/lib/money'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Кераміка ручної роботи для бізнесу: заклади й подарунки',
  description: 'Посуд для ресторанів, кав’ярень і готелів, чашки з логотипом, корпоративні подарунки й корпоративи з ліплення з глини від українських студій. Терміни, ціни, хто працює з бізнесом. Один запит — пропозиції від кількох студій.',
  alternates: { canonical: '/dlya-biznesu' },
  openGraph: { images: ogImage({ title: 'Кераміка ручної роботи для бізнесу', kicker: 'Для бізнесу', sub: 'Посуд для закладів, чашки з логотипом, подарунки, корпоративи', ...ogPhoto(sitePhotos.bizCafes) }) },
}

const faqFor = (corporate: string) => [
  { q: 'Яка мінімальна партія посуду чи чашок?', a: 'Залежить від студії та виробу: одні беруть і кілька штук, інші працюють з більшими партіями. Умови кожної студії — у її профілі або у відповіді на запит.' },
  { q: 'Скільки часу займає виготовлення партії?', a: `Зазвичай ${site.lead.batch}: формування, сушіння і два випали. Для чашок з логотипом — ${site.lead.logoDetail}.` },
  { q: 'Чи можна мити такий посуд у посудомийці?', a: 'Залежить від глини, поливи й температури випалу. Перед партією попросіть у студії зразок і спитайте про харчову поливу без свинцю та посудомийку.' },
  { q: 'Скільки коштує корпоратив з ліплення з глини?', a: `У прайсах студій — ${corporate}; ціна залежить від кількості людей, формату і місця.` },
  { q: 'Скільки коштує ваш сервіс?', a: site.model },
]

// Studios with the most to show a business buyer: business tags, then prices, then Instagram.
const bizScore = (s: StudioCard) =>
  (hasFormat(s, 'horeca') ? 2 : 0) + (hasFormat(s, 'logo') ? 2 : 0) + (hasFormat(s, 'corporate-gifts') ? 1 : 0) + (s.prices?.length ? 1 : 0) + (s.instagram ? 1 : 0)

const what = (s: StudioCard) =>
  [hasFormat(s, 'horeca') && 'посуд для закладів', hasFormat(s, 'logo') && 'логотип і персоналізація', hasFormat(s, 'corporate-gifts') && 'корпоративні подарунки', hasFormat(s, 'corporate-workshop') && 'корпоративи']
    .filter(Boolean)
    .join(' · ')

export default async function BusinessIndex() {
  const faq = faqFor((await facts()).range('corporate'))
  const biz = mainNav.find((s) => s.id === 'biz')!
  const all = (await getAllStudios()).filter((s) => worksWithVenues(s) || worksWithCompanies(s))
  const top = [...all].filter((s) => s.type !== 'school').sort((a, b) => bizScore(b) - bizScore(a) || a.name.localeCompare(b.name, 'uk')).slice(0, 8)
  const cities = groupByCity(all).length

  return (
    <InnerMain>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Українські керамічні студії, які працюють з бізнесом',
          numberOfItems: top.length,
          itemListElement: top.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: { '@type': 'LocalBusiness', name: displayName(s), url: `${site.url}/vyrobnyky/${s.slug}`, ...(s.cityDoc ? { address: { '@type': 'PostalAddress', addressLocality: s.cityDoc.name, addressCountry: 'UA' } } : {}) },
          })),
        }}
      />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Для бізнесу' }]}
        kicker="Для бізнесу"
        title="Кераміка ручної роботи для бізнесу"
        lead={
          <p className="m-0">
            У каталозі — {fmt(all.length)} {pluralUk(all.length, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])} у {fmt(cities)} {pluralUk(cities, ['місті', 'містах', 'містах'])}, які роблять посуд для ресторанів, кав’ярень і готелів, чашки з логотипом і подарунки для команд або проводять корпоративи з ліплення з глини. Партію зазвичай виготовляють {site.lead.batch}; корпоратив коштує {(await facts()).range('corporate')}. {site.model}
          </p>
        }
        actions={
          <Button href="#zapyt-forma" variant="cobalt" arrow>
            Отримати пропозиції
          </Button>
        }
      />
      <InnerCols aside={<RequestForm sourcePage="/dlya-biznesu" />}>
        <Epigraph lines={verses.business} />
        {biz.columns.map((c) => (
          <section key={c.title} className="grid gap-2">
            <Kicker as="p">{c.title}</Kicker>
            <StudioCells>
              {c.links.map((l) => (
                <IndexCell key={l.href} href={l.href} title={l.label} text={l.note} cta="Відкрити" />
              ))}
            </StudioCells>
          </section>
        ))}

        <Block id="top" kicker="Хто працює з бізнесом" title="Студії, з яких варто почати" note={<>За відкритими даними: заклади, логотип, корпоративні подарунки. Умови кожна студія підтверджує у відповіді на запит.</>}>
          <StudioCells>
            {top.map((s) => (
              <IndexCell
                key={s.id}
                href={`/vyrobnyky/${s.slug}`}
                kicker={[TYPE_LABEL[s.type ?? 'other'], s.cityDoc?.name].filter(Boolean).join(' · ')}
                title={displayName(s)}
                cta="Профіль"
                text={
                  <>
                    <span className="block font-mono text-xs tracking-[.04em] text-terracotta-text uppercase">{what(s)}</span>
                    {s.summary && <span className="line-clamp-2">{stripPersonal(s.summary)}</span>}
                  </>
                }
              />
            ))}
          </StudioCells>
        </Block>

        <Faq id="faq" kicker="Питання і відповіді" title="Часті питання" items={faq} openFirst jsonLd={false} />
      </InnerCols>
    </InnerMain>
  )
}
