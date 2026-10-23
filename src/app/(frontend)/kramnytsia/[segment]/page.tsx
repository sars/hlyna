import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { BoldFacts, InnerHero, InnerMain } from '@/components/site/Inner'
import { ForStudiosBand } from '@/components/site/ForStudiosBand'
import { JsonLd } from '@/components/site/JsonLd'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Facts } from '@/components/ui/Facts'
import { Faq } from '@/components/ui/Faq'
import { ItemGrid } from '@/components/ui/ItemGrid'
import { Kicker } from '@/components/ui/Kicker'
import { MoreLink } from '@/components/ui/MoreLink'
import { PhotoCredit } from '@/components/ui/PhotoCredit'
import { SectionHead } from '@/components/ui/SectionHead'
import { Updated } from '@/components/ui/Updated'
import { shop, shopFaq } from '@/content/shop'
import { pluralUk } from '@/lib/catalog'
import { fmt } from '@/lib/money'
import { ogImage } from '@/lib/ogImage'
import { deliverySummary, paymentLabel } from '@/lib/shop'
import { cardOf, getShopCategories, getShopItems, getShopStudios, isShopCategory, isShopReserved, latestItemUpdate, priceSpan, shopDate } from '@/lib/shopData'
import { ldShopList, ldStudioShop } from '@/lib/shopLd'
import { fitTitle } from '@/lib/title'
import { ITEM_CATEGORY_LABEL } from '@/shared/options'

export const revalidate = 86400

type Args = { params: Promise<{ segment: string }> }

// One route, two pages: a category (`/kramnytsia/chashky`, only with ≥ 3 listed items) or a studio's shop
// (`/kramnytsia/<studio slug>`). Categories win over studio slugs; the cart and checkout segments are their own pages.
export async function generateStaticParams() {
  const [cats, studios] = await Promise.all([getShopCategories(), getShopStudios()])
  return [...cats.map((c) => ({ segment: c.slug })), ...studios.map((s) => ({ segment: s.slug }))]
}

async function resolve(segment: string) {
  if (isShopReserved(segment)) return null
  if (isShopCategory(segment)) {
    const c = (await getShopCategories()).find((x) => x.slug === segment)
    return c ? { kind: 'category' as const, c } : null
  }
  const s = (await getShopStudios()).find((x) => x.slug === segment)
  return s ? { kind: 'studio' as const, s } : null
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const r = await resolve((await params).segment)
  if (!r) return {}
  if (r.kind === 'category') {
    const label = ITEM_CATEGORY_LABEL[r.c.slug]
    const span = priceSpan(r.c.items)
    return {
      title: fitTitle([`${label} ручної роботи від українських студій`, `${label} ручної роботи`]).absolute,
      description: `${label} ручної роботи у крамниці «Глина»: ${r.c.items.length} ${pluralUk(r.c.items.length, ['виріб', 'вироби', 'виробів'])} від українських студій${span ? `, ${fmt(span.min)}–${fmt(span.max)} грн` : ''}. Відправляє сама майстерня Новою поштою.`,
      alternates: { canonical: `/kramnytsia/${r.c.slug}` },
      openGraph: { images: ogImage({ title: `${label} ручної роботи`, kicker: 'Крамниця', sub: 'Вироби українських студій' }) },
    }
  }
  const span = priceSpan(r.s.items)
  return {
    title: fitTitle([`Вироби майстерні «${r.s.name}»${r.s.city ? `, ${r.s.city}` : ''}: купити в крамниці`, `Вироби «${r.s.name}»${r.s.city ? `, ${r.s.city}` : ''}`]).absolute,
    description: `${r.s.items.length} ${pluralUk(r.s.items.length, ['виріб', 'вироби', 'виробів'])} студії «${r.s.name}»${r.s.city ? ` (${r.s.city})` : ''} у крамниці «Глина»${span ? `: ${fmt(span.min)}–${fmt(span.max)} грн` : ''}. Відправляє сама студія Новою поштою; оплата після підтвердження або при отриманні.`,
    alternates: { canonical: `/kramnytsia/${r.s.slug}` },
    openGraph: { images: ogImage({ title: `Вироби «${r.s.name}»`, kicker: 'Крамниця', sub: r.s.city ? `Кераміка ручної роботи, ${r.s.city}` : 'Кераміка ручної роботи', studio: true }) },
  }
}

export default async function ShopSegmentPage({ params }: Args) {
  const r = await resolve((await params).segment)
  if (!r) notFound()
  const all = await getShopItems()
  const cats = await getShopCategories()

  if (r.kind === 'category') {
    const label = ITEM_CATEGORY_LABEL[r.c.slug]
    const forSale = r.c.items.filter((i) => i.state !== 'sold')
    const span = priceSpan(forSale)
    const updated = latestItemUpdate(r.c.items)
    const studios = [...new Map(r.c.items.map((i) => [i.studio.id, i.studio])).values()]
    const cities = [...new Set(studios.map((s) => s.city).filter(Boolean))] as string[]
    const lead = `${label} ручної роботи: ${forSale.length} ${pluralUk(forSale.length, ['виріб', 'вироби', 'виробів'])} від ${studios.length} ${pluralUk(studios.length, ['студії', 'студій', 'студій'])}${span ? `, від ${fmt(span.min)} до ${fmt(span.max)} грн` : ''}${cities.length ? `; відправляють з ${cities.length === 1 ? `м. ${cities[0]}` : `${cities.length} міст`}` : ''}. Ціни встановлюють студії, посилку пакує й відправляє сама майстерня.${updated ? ` Оновлено ${shopDate(updated)}.` : ''}`
    return (
      <InnerMain>
        {forSale.length >= 3 && <JsonLd data={ldShopList(`${label} ручної роботи`, forSale)} />}
        <InnerHero
          crumbs={[{ label: 'Головна', href: '/' }, { label: shop.name, href: '/kramnytsia' }, { label }]}
          modified={updated}
          kicker={shop.name}
          title={`${label} ручної роботи`}
          lead={
            <p className="m-0">
              <BoldFacts text={lead} />
            </p>
          }
          strip={[
            { value: String(forSale.length), label: pluralUk(forSale.length, ['виріб', 'вироби', 'виробів']) },
            { value: String(studios.length), label: pluralUk(studios.length, ['студія', 'студії', 'студій']) },
            ...(span ? [{ value: span.min === span.max ? `${fmt(span.min)} грн` : `${fmt(span.min)}–${fmt(span.max)} грн`, label: 'ціни студій' }] : []),
            ...(updated ? [{ value: shopDate(updated).replace(/ \d{4}$/, ''), label: 'оновлено' }] : []),
          ]}
          chips={cats.filter((c) => c.slug !== r.c.slug).map((c) => ({ label: ITEM_CATEGORY_LABEL[c.slug], href: `/kramnytsia/${c.slug}`, count: c.items.filter((i) => i.state !== 'sold').length }))}
          chipsLabel="Інші категорії:"
        />
        <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
          <section aria-label={label}>
            <ItemGrid items={forSale.map(cardOf)} />
            <PhotoCredit studios={studios.map((s) => s.name)} />
          </section>
          <Faq id="faq" title="Доставка, оплата, повернення" items={shopFaq.slice(0, 3)} jsonLd={false} />
          <ForStudiosBand />
          <Updated {...(updated ? { date: shopDate(updated) } : {})} />
        </div>
      </InnerMain>
    )
  }

  const s = r.s
  const forSale = s.items.filter((i) => i.state !== 'sold')
  const sold = all.filter((i) => i.studio.id === s.id && i.state === 'sold')
  const span = priceSpan(forSale)
  const updated = latestItemUpdate(s.items)
  const kinds = [...new Set(s.items.map((i) => i.category))]
  const lead = `${forSale.length} ${pluralUk(forSale.length, ['виріб', 'вироби', 'виробів'])} ${s.type === 'maker' ? 'майстра' : 'студії'} «${s.name}»${kinds.length ? `: ${kinds.map((k) => ITEM_CATEGORY_LABEL[k].toLowerCase()).join(', ')}` : ''}${span ? `, від ${fmt(span.min)} до ${fmt(span.max)} грн` : ''}.${s.city ? ` Відправляє з м. ${s.city} Новою поштою` : ' Відправляє Новою поштою'}${s.terms.pickupAddress ? ', є самовивіз' : ''}.${updated ? ` Оновлено ${shopDate(updated)}.` : ''}`
  const terms: [string, React.ReactNode][] = [
    ['Доставка', deliverySummary(s.terms.delivery.filter((d) => d !== 'pickup'))],
    ['Оплата', s.terms.payment.map(paymentLabel).join(', ')],
    ...(s.terms.pickupAddress ? ([['Самовивіз', s.terms.pickupAddress]] as [string, React.ReactNode][]) : []),
    ['Повернення', s.terms.returnsNote],
  ]
  return (
    <InnerMain>
      <JsonLd data={ldStudioShop(s, forSale)} />
      {forSale.length >= 3 && <JsonLd data={ldShopList(`Вироби «${s.name}»`, forSale)} />}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[clamp(20px,3vw,40px)] border-b-2 border-ink pt-hero pb-[clamp(24px,3vw,40px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid min-w-0 gap-3.5">
          <InnerHeroCrumbs name={s.name} updated={updated} />
          <Kicker>
            {shop.name} · {s.type === 'maker' ? 'Майстер' : 'Майстерня'}
            {s.city ? ` · ${s.city}` : ''}
          </Kicker>
          <h1 className="m-0 font-display text-h1 [overflow-wrap:anywhere]">Вироби {s.type === 'maker' ? 'майстра' : 'майстерні'} «{s.name}»</h1>
          <p className="m-0 max-w-read text-lead">
            <BoldFacts text={lead} />
          </p>
          {kinds.length > 0 && (
            <ChipGroup aria-label="Категорії студії">
              {kinds.map((k) => (
                <Chip key={k} as="span">
                  {ITEM_CATEGORY_LABEL[k]}
                </Chip>
              ))}
            </ChipGroup>
          )}
          <div className="flex flex-wrap gap-2.5">
            <Button href={`/vyrobnyky/${s.slug}`} variant="ghost" size="sm" arrow>
              Профіль студії
            </Button>
          </div>
          <Updated {...(updated ? { date: shopDate(updated) } : {})} />
        </div>
        <section aria-labelledby="umovy" className="min-w-0">
          <Kicker as="p">
            <span id="umovy">Умови студії</span>
          </Kicker>
          <div className="mt-2">
            <Facts rows={terms} />
          </div>
        </section>
      </div>
      <div className="grid gap-block pt-[clamp(24px,3vw,40px)]">
        <section aria-label="Вироби">
          {forSale.length ? <ItemGrid items={forSale.map(cardOf)} showStudio={false} /> : <p className="m-0 text-ink-2">Зараз у студії немає виробів у продажу.</p>}
          {sold.length > 0 && (
            <details className="group mt-4">
              <MoreLink as="summary" arrow={false}>
                <span className="group-open:hidden">
                  Продано · {sold.length} <span aria-hidden>→</span>
                </span>
                <span className="hidden group-open:inline">Згорнути</span>
              </MoreLink>
              <ItemGrid items={sold.map(cardOf)} showStudio={false} className="mt-3" />
            </details>
          )}
          <PhotoCredit studios={[s.name]} />
        </section>
        <section aria-labelledby="inshi">
          <SectionHead id="inshi" title="Інше у крамниці" more={{ label: 'Усі вироби крамниці', href: '/kramnytsia' }} />
          <ChipGroup as="nav" label="Категорії:" aria-label="Категорії крамниці">
            {cats.map((c) => (
              <Chip key={c.slug} href={`/kramnytsia/${c.slug}`} count={c.items.filter((i) => i.state !== 'sold').length}>
                {ITEM_CATEGORY_LABEL[c.slug]}
              </Chip>
            ))}
          </ChipGroup>
        </section>
        <Updated {...(updated ? { date: shopDate(updated) } : {})} />
      </div>
    </InnerMain>
  )
}

// The studio shop's breadcrumbs (a small piece so the hero above stays readable).
function InnerHeroCrumbs({ name, updated }: { name: string; updated: string | null }) {
  return <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: shop.name, href: '/kramnytsia' }, { label: name }]} modified={updated} />
}
