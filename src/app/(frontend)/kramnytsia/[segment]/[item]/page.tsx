import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Block, BoldFacts, InnerMain } from '@/components/site/Inner'
import { JsonLd } from '@/components/site/JsonLd'
import { BuyBox } from '@/components/shop/BuyBox.client'
import { ShopToastHost } from '@/components/shop/ShopToast.client'
import { TrackView } from '@/components/shop/TrackView.client'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Facts } from '@/components/ui/Facts'
import { Faq } from '@/components/ui/Faq'
import { ItemGallery } from '@/components/ui/ItemGallery.client'
import { ItemGrid } from '@/components/ui/ItemGrid'
import { Kicker } from '@/components/ui/Kicker'
import { MoreLink } from '@/components/ui/MoreLink'
import { Updated } from '@/components/ui/Updated'
import { itemFaq, shop, stateText } from '@/content/shop'
import { pluralUk } from '@/lib/catalog'
import { fmt } from '@/lib/money'
import { ogImage } from '@/lib/ogImage'
import { deliverySummary, leadText, paymentLabel, RETURN_DAYS, uah } from '@/lib/shop'
import { cardOf, getShopItem, getShopItemsAll, isShopReserved, shopDate, similarItems } from '@/lib/shopData'
import { ldProduct } from '@/lib/shopLd'
import { fitTitle } from '@/lib/title'
import { ITEM_CATEGORY_LABEL } from '@/shared/options'

export const revalidate = 86400

type Args = { params: Promise<{ segment: string; item: string }> }

export async function generateStaticParams() {
  return (await getShopItemsAll()).map((i) => ({ segment: i.studio.slug, item: i.slug }))
}

const SINGULAR: Record<string, string> = { chashky: 'Чашка', 'tarilky-i-mysky': 'Посуд', 'vazy-i-dekor': 'Декор', svitylnyky: 'Світильник', prykrasy: 'Прикраса', 'plytka-i-panno': 'Плитка', svichky: 'Свічка', sertyfikaty: 'Сертифікат' }
const volume = (specs: { label: string; value: string }[]) => specs.find((s) => /об[’']єм/i.test(s.label))?.value ?? null

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { segment, item } = await params
  const i = isShopReserved(segment) ? null : await getShopItem(segment, item)
  if (!i) return {}
  const vol = volume(i.specs)
  const sold = i.state === 'sold'
  const og = i.photos[0] ? i.photos[0].url.replace(/^\/media\//, '').replace(/\.(jpe?g)$/i, '') : null
  return {
    title: fitTitle([[i.title, vol, i.studio.name, i.studio.city].filter(Boolean).join(', '), [i.title, i.studio.name].join(', '), i.title]).absolute,
    description: `${i.title}${vol ? `, ${vol}` : ''} — кераміка ручної роботи ${i.studio.type === 'maker' ? 'майстра' : 'студії'} «${i.studio.name}»${i.studio.city ? `, ${i.studio.city}` : ''}. ${sold ? 'Продано; схожі вироби на сторінці.' : `${i.priceMin ? `Ціна ${fmt(i.priceMin)} грн. ` : ''}Відправляє сама студія Новою поштою, оплата після підтвердження або при отриманні.`}`,
    alternates: { canonical: i.path },
    ...(sold ? { robots: { index: true, follow: true } } : {}),
    openGraph: { images: ogImage({ title: i.title, kicker: `Крамниця · ${i.studio.name}`, sub: [SINGULAR[i.category], vol, 'ручна робота', i.studio.city].filter(Boolean).join(' · '), ...(og ? { img: `media-${og}` } : { studio: true }) }) },
  }
}

// The item page (docs/shop/DESIGN.md §1 Виріб): facts in the first sentences, the gallery, the buy box with the studio's
// terms, the spec table, our text, the three questions, similar pieces. A sold piece keeps the page with its state said.
export default async function ItemPage({ params }: Args) {
  const { segment, item } = await params
  if (isShopReserved(segment)) notFound()
  const i = await getShopItem(segment, item)
  if (!i) notFound()
  const all = await getShopItemsAll()
  const s = i.studio
  const card = cardOf(i)
  const sold = i.state === 'sold'
  const toOrder = i.state === 'to_order'
  const lead = leadText(i.leadDaysMin, i.leadDaysMax)
  const vol = volume(i.specs)
  const material = i.specs.find((x) => /матеріал/i.test(x.label))?.value
  const who = `${s.type === 'maker' ? 'майстер' : 'майстерня'} «${s.name}»${s.city ? ` у м. ${s.city}` : ''}`
  const leadText1 = `${SINGULAR[i.category] ?? 'Виріб'} ручної роботи${vol ? ` на ${vol}` : ''}${material ? `, ${material}` : ''}. ${sold ? `Продано; схожі вироби — нижче.` : `Ціна ${uah(card.priceKop)}, ${i.kind === 'series' ? 'серія' : i.kind === 'piece' ? 'один примірник' : `під замовлення${lead ? `, ${lead}` : ''}`}.`} Виробник — ${who}. Оновлено ${shopDate(i.updatedAt)}.`
  const facts: [string, React.ReactNode][] = [
    ['Доставка', deliverySummary(s.terms.delivery, s.terms.pickupAddress)],
    ['Оплата', s.terms.payment.map(paymentLabel).join(' або ').toLowerCase().replace(/^./, (c) => c.toUpperCase())],
    ['Повернення', toOrder ? 'Під замовлення не повертається' : `${RETURN_DAYS} днів, якщо виріб не був у вжитку`],
    ...(toOrder && lead ? ([['Виготовлення', lead]] as [string, React.ReactNode][]) : []),
  ]
  const similar = similarItems(all, i, 6)
  const fromStudio = all.filter((x) => x.studio.id === s.id && x.id !== i.id && x.visibility === 'public' && x.state !== 'sold').slice(0, 4)
  const studioCount = all.filter((x) => x.studio.id === s.id && x.visibility === 'public').length
  const specs = i.specs.filter((x) => x.value.trim())
  const paragraphs = (i.description ?? '').split(/\n{2,}/).filter(Boolean)
  const crumbs = [{ label: 'Головна', href: '/' }, { label: shop.name, href: '/kramnytsia' }, { label: ITEM_CATEGORY_LABEL[i.category], href: `/kramnytsia/${i.category}` }, { label: i.title }]
  return (
    <InnerMain>
      <JsonLd data={ldProduct(i)} />
      {!sold && i.orderable && <TrackView event="view_item" params={{ currency: 'UAH', value: card.priceKop / 100, items: JSON.stringify([{ item_id: i.slug, item_name: i.title, item_brand: s.name, item_category: i.category, price: card.priceKop / 100, quantity: 1 }]) }} />}
      <div className="pt-hero">
        <Breadcrumbs items={crumbs} modified={i.updatedAt} />
      </div>
      <div className="ui-item pt-4">
        <div data-area="head" className="grid min-w-0 gap-3.5">
          <Kicker>
            {SINGULAR[i.category] ?? ITEM_CATEGORY_LABEL[i.category]} · {s.name}
            {s.city ? ` · ${s.city}` : ''}
          </Kicker>
          <h1 className="m-0 font-display text-h1 [overflow-wrap:anywhere]">{i.title}</h1>
          <p className="m-0 max-w-read text-lead">
            <BoldFacts text={leadText1} />
          </p>
        </div>
        <div data-area="gallery" className="min-w-0">
          <ItemGallery photos={card.photos} title={i.title} studio={s.name} />
        </div>
        <div data-area="buy" className="min-w-0">
          <BuyBox item={card} facts={facts} studioType={s.type} />
        </div>
        <div data-area="more" className="min-w-0" />
      </div>
      <div className="grid gap-block pt-[clamp(28px,4vw,56px)]">
        {sold && similar.length > 0 && (
          <Block id="skhozhi" title="Схожі вироби" note={stateText('sold', 'explain')}>
            <ItemGrid items={similar.map(cardOf)} />
          </Block>
        )}
        {specs.length > 0 && (
          <Block id="kharakterystyky" title="Характеристики">
            <Facts rows={specs.map((x) => [x.label, x.value] as [string, React.ReactNode])} />
          </Block>
        )}
        {paragraphs.length > 0 && (
          <Block id="pro-vyrib" title="Про виріб">
            <div className="grid max-w-read gap-3 text-body">
              {paragraphs.map((p, n) => (
                <p key={n} className="m-0">
                  {p}
                </p>
              ))}
            </div>
          </Block>
        )}
        <Block id="dostavka" title="Доставка, оплата, повернення">
          <Faq items={itemFaq(s.terms, toOrder)} jsonLd={false} id="dostavka-faq" />
        </Block>
        {!sold && similar.length > 0 && (
          <Block id="skhozhi" title="Схожі вироби">
            <ItemGrid items={similar.map(cardOf)} />
          </Block>
        )}
        {fromStudio.length > 0 && (
          <Block id="vid-studii" title={`Ще від «${s.name}»`}>
            <ItemGrid items={fromStudio.map(cardOf)} variant="compact" showStudio={false} />
            <MoreLink href={`/kramnytsia/${s.slug}`} arrow>
              Усі вироби студії ({studioCount} {pluralUk(studioCount, ['виріб', 'вироби', 'виробів'])})
            </MoreLink>
          </Block>
        )}
        <p className="m-0 text-[14.5px] text-ink-2">
          Виріб з магазину студії{' '}
          <a href={i.sourceUrl} target="_blank" rel="noopener nofollow" className="text-ink-2 underline underline-offset-[3px]">
            {new URL(i.sourceUrl).hostname.replace(/^www\./, '')}
          </a>
          ; наявність і ціну читаємо щодня. <Link href={`/vyrobnyky/${s.slug}`}>Профіль студії</Link>.
        </p>
        <Updated date={shopDate(i.updatedAt)} />
      </div>
      <ShopToastHost />
    </InnerMain>
  )
}
