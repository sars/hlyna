import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Block, BoldFacts, InnerHero, InnerMain } from '@/components/site/Inner'
import { ForStudiosBand } from '@/components/site/ForStudiosBand'
import { JsonLd } from '@/components/site/JsonLd'
import { ShopToastHost } from '@/components/shop/ShopToast.client'
import { Epigraph } from '@/components/ui/Epigraph'
import { Faq } from '@/components/ui/Faq'
import { ItemGrid } from '@/components/ui/ItemGrid'
import { MoreLink } from '@/components/ui/MoreLink'
import { NumberedList } from '@/components/ui/NumberedList'
import { PhotoCredit } from '@/components/ui/PhotoCredit'
import { SectionHead } from '@/components/ui/SectionHead'
import { IndexCell, StudioCells } from '@/components/ui/StudioCell'
import { Updated } from '@/components/ui/Updated'
import { shop, shopFaq } from '@/content/shop'
import { pluralUk } from '@/lib/catalog'
import { ogImage } from '@/lib/ogImage'
import { cardOf, getShopCategories, getShopItems, getShopStudios, latestItemUpdate, priceSpan, shopDate } from '@/lib/shopData'
import { ldOnlineStore, ldShopList } from '@/lib/shopLd'
import { fmt } from '@/lib/money'
import { ITEM_CATEGORY_LABEL } from '@/shared/options'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: `${shop.title} · Глина` },
  description: shop.description,
  alternates: { canonical: '/kramnytsia' },
  openGraph: { images: ogImage({ title: shop.h1, kicker: 'Крамниця', sub: 'Вироби українських студій: відправляє майстерня, ціни студій' }) },
}

// The shop home (docs/shop/DESIGN.md §1): facts first, the grid of what can be bought today, how it works, the studios,
// the questions, the band for studios. Sold items are not listed here (their pages stay).
export default async function ShopPage() {
  const items = await getShopItems()
  const forSale = items.filter((i) => i.state !== 'sold')
  const studios = await getShopStudios()
  const categories = await getShopCategories()
  const span = priceSpan(forSale)
  const updated = latestItemUpdate(items)
  const cities = [...new Set(studios.map((s) => s.city).filter(Boolean))] as string[]
  const kinds = [...new Set(forSale.map((i) => ITEM_CATEGORY_LABEL[i.category].toLowerCase()))]
  const lead = `У крамниці ${forSale.length} ${pluralUk(forSale.length, ['виріб', 'вироби', 'виробів'])} від ${studios.length} ${pluralUk(studios.length, ['студії', 'студій', 'студій'])}${kinds.length ? `: ${kinds.join(', ')}` : ''}${span ? ` від ${fmt(span.min)} до ${fmt(span.max)} грн` : ''}. Кожен виріб відправляє сама майстерня Новою поштою; ціни встановлюють студії.${updated ? ` Оновлено ${shopDate(updated)}.` : ''}`
  return (
    <InnerMain>
      <JsonLd data={ldOnlineStore()} />
      {forSale.length >= 3 && <JsonLd data={ldShopList(shop.h1, forSale)} />}
      <InnerHero
        crumbs={[{ label: 'Головна', href: '/' }, { label: shop.name }]}
        modified={updated}
        kicker={shop.kicker}
        title={shop.h1}
        lead={
          <p className="m-0">
            <BoldFacts text={lead} />
          </p>
        }
        strip={[
          { value: String(forSale.length), label: pluralUk(forSale.length, ['виріб у продажу', 'вироби у продажу', 'виробів у продажу']) },
          { value: String(studios.length), label: pluralUk(studios.length, ['студія-партнер', 'студії-партнери', 'студій-партнерів']) },
          ...(span ? [{ value: span.min === span.max ? `${fmt(span.min)} грн` : `${fmt(span.min)}–${fmt(span.max)} грн`, label: 'ціни студій' }] : []),
          ...(cities.length ? [{ value: cities.length === 1 ? cities[0]! : String(cities.length), label: cities.length === 1 ? 'звідки відправляють' : 'міст відправки' }] : []),
          ...(updated ? [{ value: shopDate(updated).replace(/ \d{4}$/, ''), label: 'оновлено' }] : []),
        ]}
        chips={categories.map((c) => ({ label: ITEM_CATEGORY_LABEL[c.slug], href: `/kramnytsia/${c.slug}`, count: c.items.filter((i) => i.state !== 'sold').length }))}
        chipsLabel="Категорії:"
      />
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <Epigraph lines={shop.verse} />
        <section aria-labelledby="vyroby">
          <SectionHead id="vyroby" title="Вироби" note={shop.gridNote} />
          {forSale.length ? <ItemGrid items={forSale.map(cardOf)} /> : <p className="m-0 text-ink-2">Поки що тут порожньо: перші вироби з’являться, щойно студія-партнер підтвердить наявність.</p>}
          <PhotoCredit studios={studios.map((s) => s.name)} />
        </section>
        <Block id="yak" title="Як це працює">
          <NumberedList columns={2} items={shop.how} />
        </Block>
        {studios.length > 0 && (
          <Block id="studii" title="Студії в крамниці">
            <StudioCells>
              {studios.map((s) => (
                <IndexCell
                  key={s.id}
                  href={`/kramnytsia/${s.slug}`}
                  kicker={[s.type === 'maker' ? 'Майстер' : 'Майстерня', s.city].filter(Boolean).join(' · ')}
                  title={s.name}
                  text={`${s.items.length} ${pluralUk(s.items.length, ['виріб', 'вироби', 'виробів'])} · ${[...new Set(s.items.map((i) => ITEM_CATEGORY_LABEL[i.category].toLowerCase()))].join(', ')}${s.city ? `. Відправляє з м. ${s.city}` : ''}`}
                  cta="Вироби студії"
                />
              ))}
            </StudioCells>
          </Block>
        )}
        <Faq id="faq" title="Часті питання" kicker="Доставка, оплата, повернення" items={shopFaq} jsonLd={false} openFirst />
        <ForStudiosBand />
        <p className="m-0 text-[15px] text-ink-2">
          {shop.business.text}{' '}
          <MoreLink href={shop.business.href} pad={false} arrow className="inline-flex align-baseline">
            {shop.business.cta}
          </MoreLink>
        </p>
        <Updated {...(updated ? { date: shopDate(updated) } : {})} />
      </div>
      <ShopToastHost />
      <p className="sr-only">
        <Link href="/kramnytsia/koshyk">Кошик</Link>
      </p>
    </InnerMain>
  )
}
