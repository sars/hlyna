import type { Metadata } from 'next'
import { Block, HeroRequest, InnerHero, InnerMain, RequestBand } from '@/components/site/Inner'
import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { CityFold, CityStudioLinks } from '@/components/ui/CityList'
import { FaqItem } from '@/components/ui/Faq'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { StudioMap } from '@/components/site/StudioMap.client'
import { site } from '@/content/site'
import { groupByCity, pluralUk, TYPE_LABEL } from '@/lib/catalog'
import { MAP_FILTERS, mapStudios } from '@/lib/mapData'
import { displayName } from '@/lib/present'
import { ogImage } from '@/lib/ogImage'
import { fmt } from '@/lib/money'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Мапа керамічних студій України: майстер-класи і посуд',
  description: 'Інтерактивна мапа українських керамічних студій, брендів і майстрів: де пройти майстер-клас, спробувати гончарне коло, купити сертифікат чи замовити посуд для закладу. Фільтри за форматами.',
  alternates: { canonical: '/mapa' },
  openGraph: { images: ogImage({ title: 'Мапа керамічних студій України', kicker: 'Мапа', sub: 'Майстер-класи, гончарне коло, посуд на замовлення' }) },
}

export default async function MapPage() {
  const { all, placed } = await mapStudios()
  const precise = placed.filter((s) => s.geo?.precision !== 'settlement').length
  const groups = groupByCity(placed)
  const faq = [
    { q: 'Як знайти керамічну студію поруч?', a: 'Наблизьте мапу до свого міста або відкрийте сторінку міста й натисніть «Показати на мапі». Фільтри зверху залишають лише студії з потрібним форматом: майстер-класи, гончарне коло, заняття для дітей, сертифікати чи посуд для закладів.' },
    { q: 'Чому деякі студії стоять у центрі міста?', a: 'Якщо студія не вказала адресу публічно (працює за записом або з дому), ми показуємо її жовтою позначкою в центрі населеного пункту. Точну адресу студія повідомляє під час запису.' },
    { q: 'Звідки дані?', a: `Адреси — з сайтів і сторінок самих студій, координати — з OpenStreetMap. Дані оновлено: ${site.dataUpdated}.` },
    { q: 'Моєї студії немає на мапі. Як додати?', a: 'Заповніть коротку форму на сторінці «Додати студію» — профіль і позначка на мапі безкоштовні.' },
  ]
  return (
    <InnerMain>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: 'Мапа' }]}
        kicker="Мапа студій"
        title="Мапа керамічних студій України"
        lead={
          <p className="m-0">
            На мапі — {fmt(placed.length)} {pluralUk(placed.length, ['студія, бренд чи майстер', 'студії, бренди й майстри', 'студій, брендів і майстрів'])} у {fmt(groups.length)} {pluralUk(groups.length, ['місті й селі', 'містах і селах', 'містах і селах'])}. {fmt(precise)} — за точною адресою, решта — у центрі свого міста, бо працюють за записом. Оберіть формат, щоб побачити, де пройти майстер-клас, спробувати гончарне коло чи замовити посуд для закладу.
          </p>
        }
        strip={[
          { value: fmt(placed.length), label: 'студій на мапі' },
          { value: fmt(groups.length), label: 'міст і сіл' },
          { value: fmt(precise), label: 'з точною адресою' },
        ]}
        actions={<HeroRequest path="/mapa" />}
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <StudioMap filters={MAP_FILTERS} />
        <RequestBand path="/mapa" tone="cobalt" />

        <Block id="list" title="Усі студії за містами" note={<>Той самий перелік без мапи. {all.length > placed.length ? `${fmt(all.length - placed.length)} ще без координат — їх можна знайти в каталозі.` : ''}</>}>
          <div className="ui-toprule border-t-2 border-ink">
            {groups.map((g) => (
              <CityFold key={g.city.slug} id={`misto-${g.city.slug}`} name={g.city.name} count={g.studios.length} open={g.studios.length <= 3}>
                <CityStudioLinks note studios={g.studios.map((s) => ({ id: s.id, name: displayName(s), href: `/vyrobnyky/${s.slug}`, note: TYPE_LABEL[s.type ?? 'other'] }))} />
              </CityFold>
            ))}
          </div>
        </Block>

        <Block id="faq" kicker="Питання і відповіді" title="Часті питання">
          <div className="ui-faq max-w-faq">
            {faq.map((f, i) => (
              <FaqItem key={f.q} q={f.q} open={i === 0}>
                <p className="m-0">{f.q.startsWith('Моєї') ? <>Заповніть коротку форму на сторінці <Link href="/dlya-studiy">«Додати студію»</Link> — профіль і позначка на мапі безкоштовні. Ваша студія вже є на сайті, але без адреси? Знайдіть її профіль і натисніть «Керувати профілем».</> : f.a}</p>
              </FaqItem>
            ))}
          </div>
        </Block>
        <RequestBand path="/mapa" tone="ink" />
      </div>
      <MobileRequestBar />
    </InnerMain>
  )
}
