import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { MobileRequestBar } from '@/components/site/MobileRequestBar.client'
import { RequestForm } from '@/components/site/RequestForm.client'
import { Button } from '@/components/ui/Button'
import { CityList } from '@/components/ui/CityList'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { DataTable } from '@/components/ui/DataTable'
import { Epigraph } from '@/components/ui/Epigraph'
import { Faq } from '@/components/ui/Faq'
import { Italic } from '@/components/ui/Italic'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { nobreak } from '@/components/ui/NoBreak'
import { Panel } from '@/components/ui/Panel'
import { PhotoCard } from '@/components/ui/PhotoCard'
import { QuoteBlock } from '@/components/ui/QuoteBlock'
import { SectionHead } from '@/components/ui/SectionHead'
import { Stat } from '@/components/ui/Stat'
import { Term } from '@/components/ui/Term'
import { VesselWindow, VesselWindows } from '@/components/ui/VesselWindow'
import { WordmarkWindow } from '@/components/ui/WordmarkWindow'
import { glossary } from '@/content/glossary'
import { STUDIO_JOIN_HREF } from '@/content/navigation'
import { sitePhotos } from '@/content/photos'
import { HeroSearch } from '@/components/site/search/SiteSearch.client'
import { site } from '@/content/site'
import { verses } from '@/content/verses'
import { cityPages, getAllStudios, groupByCity, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { priceIndex } from '@/lib/priceIndex'
import { facts } from '@/lib/facts'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: 'Українська кераміка ручної роботи для бізнесу і для себе · Глина' },
  description:
    'Посуд і подарунки ручної роботи від українських студій для ресторанів, кав’ярень, готелів і компаній. Порівняйте умови й ціни та надішліть один запит кільком студіям. Майстер-класи з кераміки по всій Україні.',
  alternates: { canonical: '/' },
  // Static card (public/og-home.png): the wheel photo with the big label; see the comment in src/app/(frontend)/og/route.tsx.
  openGraph: { images: [{ url: '/og-home.png', width: 1200, height: 630 }] },
}

const nf = (n: number) => n.toLocaleString('uk-UA')

// Every «Отримати пропозиції» on this page leads to the compact form in the hero.
const REQUEST = '#zapyt-forma'

const paths = [
  { photo: sitePhotos.cardVenues, title: 'Посуд для ресторанів і кав’ярень', text: 'Тарілки, миски, чашки під стиль закладу. Посудомийка, зразки, дозамовлення.', cta: 'Студії та ціни', href: '/dlya-biznesu/posud-dlya-restoraniv' },
  { photo: sitePhotos.cardLogo, title: 'Чашки та посуд з логотипом', text: 'Штамп, деколь або полива у фірмових кольорах. Ціни залежно від кількості.', cta: 'Як це роблять', href: '/dlya-biznesu/chashky-z-lohotypom' },
  { photo: sitePhotos.cardGifts, title: 'Новорічні подарунки 2026/27', text: 'Для команди і клієнтів: що встигнуть зробити до свят і коли замовляти.', cta: 'Ідеї та терміни', href: '/dlya-biznesu/novorichni-podarunky-2026' },
  { photo: sitePhotos.cardPair, title: 'Корпоратив з ліплення з глини', text: 'У студії чи у вашому офісі, для невеликої команди чи великого відділу. Ціни з особи — у таблиці нижче.', cta: 'Формати', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
]

const cities = [
  ['Київ', 54, 'kyiv'], ['Львів', 34, 'lviv'], ['Одеса', 26, 'odesa'], ['Луцьк', 23, 'lutsk'],
  ['Харків', 19, 'kharkiv'], ['Ужгород', 16, 'uzhhorod'], ['Дніпро', 15, 'dnipro'], ['Тернопіль', 13, 'ternopil'],
  ['Івано-Франківськ', 11, 'ivano-frankivsk'], ['Вінниця', 10, 'vinnytsia'], ['Суми', 10, 'sumy'],
] as const

type Facts = Awaited<ReturnType<typeof facts>>

const faqFor = (f: Facts) => [
  { q: 'Чи можна замовити посуд ручної роботи невеликою партією?', a: 'Так. Українські студії беруть і невеликі, і великі замовлення. Мінімальна партія залежить від студії та виробу; умови, терміни й ціни кожної студії вказані в її профілі.' },
  { q: 'Скільки часу займає виготовлення партії кераміки?', a: `Зазвичай ${site.lead.batch}: формування, сушіння, перший випал, полива (глазур) і другий випал. Перед Новим роком і відкриттям закладу замовляйте заздалегідь.` },
  { q: 'Чи безпечний такий посуд і чи можна мити його в посудомийці?', a: 'Це залежить від маси (глини), поливи й температури випалу. Перед партією попросіть у студії зразок і спитайте, чи полива харчова, без свинцю, і чи витримує посудомийку. Докладно — у гайді «Харчова безпечність і посудомийка».' },
  { q: 'Як нанести логотип на кераміку?', a: 'Найчастіше штампом на сирій глині, деколлю (перекладною картинкою, яку випалюють) або поливою у фірмових кольорах. Спосіб впливає на ціну і термін.' },
  { q: 'Скільки коштує майстер-клас з гончарства?', a: `За прайсами студій 2026 року разовий майстер-клас коштує ${f.range('group')}, індивідуальний — ${f.range('private')}, корпоратив — ${f.range('corporate')}. Докладно — на сторінці «Ціни 2026».` },
  { q: 'Скільки коштує сервіс для замовника?', a: site.model },
]

// Live, honest counts from the public catalogue (falls back to the October 2026 snapshot without a database).
async function stats() {
  try {
    const all = await getAllStudios()
    const mk = all.filter(offersMasterClasses)
    return {
      makers: all.length,
      cities: groupByCity(all).length,
      masterClassPlaces: mk.length,
      // The same base as /tsiny-2026 and llms.txt, so the home page and the index never quote two different counts.
      withPrices: (await priceIndex()).studios,
      // Places on each city's master-class page (an oblast centre's page counts the whole oblast).
      cityCounts: new Map(cityPages(mk).map((g) => [g.city.slug as string, g.studios.length])),
    }
  } catch {
    return { ...site.stats, cityCounts: new Map<string, number>() }
  }
}

export default async function HomePage() {
  const f = await facts()
  const faq = faqFor(f)
  const s = await stats()
  const makers = pluralUk(s.makers, ['студія, майстер чи бренд', 'студії, майстри й бренди', 'студій, майстрів і брендів'])
  const cityWord = pluralUk(s.cities, ['місто чи село', 'міста й села', 'міст і сіл'])
  const places = pluralUk(s.masterClassPlaces, ['місце', 'місця', 'місць'])
  const cards = [
    ...paths.map((p) => ({ ...p, photo: p.photo, tone: 'ink' as const, cta: `${p.cta} →` })),
    { photo: sitePhotos.cardClass, title: 'Майстер-клас для себе', text: 'Гончарство, ліплення, побачення, заняття для дітей — по всій Україні.', cta: 'За містами →', href: '/maister-klasy', tone: 'cobalt' as const },
    { photo: sitePhotos.cardCertificate, title: 'Подарунковий сертифікат', text: 'Сертифікати на гончарство: ціни, термін дії й формати за містами.', cta: 'Сертифікати →', href: '/sertyfikaty', tone: 'cobalt' as const },
  ]
  const section = 'mt-section'
  return (
    <main>
      {/* Hero: wordmark window, then the statement and the request form. The <h1> follows the decorative wordmark. */}
      <section className={cx(wrap, 'pt-[clamp(14px,2.5vw,32px)]')} aria-labelledby="h1">
        <div className="flex justify-between gap-3 pb-1.5">
          <Kicker>Українська кераміка ручної роботи</Kicker>
          <Kicker className="hidden sm:block">Каталог студій і майстрів · оновлено {site.dataUpdated}</Kicker>
        </div>
        <WordmarkWindow photo={{ desktop: sitePhotos.wordmarkDesktop, mobile: sitePhotos.wordmarkMobile }} />
        <div className="mt-[clamp(12px,2vw,24px)] grid items-start gap-[clamp(24px,4vw,56px)] border-t-2 border-ink pt-[clamp(22px,3vw,40px)] pb-[clamp(28px,4vw,56px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid gap-0">
            <h1 id="h1" className="m-0 max-w-[12.5em] font-display text-h1">
              Посуд і подарунки ручної роботи від українських студій
            </h1>
            <p className="m-0 mt-4 max-w-[33em] text-lead text-ink-2">
              Для ресторанів, кав’ярень, готелів і компаній. Порівняйте умови, терміни й ціни та надішліть один запит одразу кільком студіям.
            </p>
            {/* The search field takes the place of «Знайти майстер-клас» (owner, 15.10.2026); the request button stays right under it. */}
            <div className="mt-[22px] grid max-w-[640px] gap-3">
              <HeroSearch />
              <Button href={REQUEST} variant="cobalt" arrow className="max-sm:w-full sm:justify-self-start">Отримати пропозиції</Button>
            </div>
            <Epigraph lines={verses.home} className="m-0 mt-[26px]" />
            <div className="mt-[26px] flex flex-wrap gap-x-7 gap-y-2" aria-label="Цифри каталогу">
              <Stat value={nf(s.makers)} label={makers} />
              <Stat value={String(s.cities)} label={cityWord} />
              <Stat value={String(s.masterClassPlaces)} label={`${places} з майстер-класами`} />
            </div>
          </div>
          <RequestForm sourcePage="/" compact />
        </div>
      </section>

      {/* Paths */}
      <section className={cx(wrap, section)} aria-labelledby="paths">
        <SectionHead variant="poster" id="paths" kicker="Для бізнесу" title={<>Що ви <Italic>шукаєте?</Italic></>} more={{ label: 'Усі напрями', href: '/dlya-biznesu' }} />
        <div className="grid gap-2.5 pt-[clamp(16px,2.6vw,30px)] sm:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
          {cards.map((c, i) => (
            <PhotoCard key={c.href} n={String(i + 1).padStart(2, '0')} title={c.title} text={c.text} cta={c.cta} href={c.href} tone={c.tone} photo={c.photo} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <Panel as="section" tone="cobalt" bleed className={section} aria-labelledby="how">
        <Kicker className="mb-3 block">Як це працює</Kicker>
        <h2 id="how" className="m-0 max-w-[22ch] font-display text-[clamp(32px,5.6vw,84px)] leading-[.95] font-extrabold tracking-[-.01em] uppercase">
          Один запит <Italic>замість</Italic> десяти листувань
        </h2>
        <ol className="m-0 mt-[clamp(28px,4vw,52px)] grid list-none grid-cols-1 border-t border-rule-on-dark p-0 md:grid-cols-3">
          {[
            ['Опишіть замовлення', 'Що потрібно, скільки штук, до якої дати, місто й бюджет за одиницю.'],
            ['Ми підберемо студії', 'Передамо запит 3–5 студіям, які роблять такі вироби й працюють з такими обсягами.'],
            ['Порівняйте пропозиції', 'Студії відповідають напряму. Ви обираєте за ціною, терміном і стилем.'],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[18px] border-b border-rule-on-dark pt-6 pb-7 md:border-b-0 md:border-r md:pr-7 md:[&:not(:first-child)]:pl-7 md:last:border-r-0">
              <b className="font-display text-[clamp(48px,6vw,88px)] leading-[.8] font-extrabold tracking-[-.02em] text-peach">{i + 1}</b>
              <div>
                <h3 className="m-0 mb-2 font-display text-[19px] leading-[1.15] font-semibold">{t}</h3>
                <p className="m-0 max-w-[30ch] text-[15.5px] text-on-cobalt-2">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-7">
          <Button href={REQUEST} arrow>Надіслати запит</Button>
        </div>
      </Panel>

      {/* Short answer: the part LLMs quote */}
      <section className={cx(wrap, section)} aria-labelledby="market">
        <SectionHead variant="poster" id="market" kicker={`Коротко про ринок · оновлено ${site.dataUpdated}`} title={<>Скільки коштує <Italic>і скільки часу займає</Italic></>} more={{ label: 'Ціни 2026', href: '/tsiny-2026' }} />
        <div className="grid gap-[clamp(24px,4vw,56px)] pt-[clamp(22px,3vw,40px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <figure className="m-0 flex flex-col">
            <Image src={sitePhotos.market.src} alt={sitePhotos.market.alt} width={sitePhotos.market.width} height={sitePhotos.market.height} sizes="(min-width:960px) 33vw, 100vw" className="aspect-[4/3] w-full flex-1 object-cover lg:aspect-auto lg:min-h-[420px]" />
          </figure>
          <div className="grid content-start gap-[18px]">
            <QuoteBlock
              className="px-[22px] py-[18px]"
              source="Джерело: прайси, сайти і сторіс українських студій, зібрані «Глиною» у 2026 році. Ціни для кожної студії — у її профілі."
            >
              <div className="grid gap-2.5">
                <p className="m-0">
                  <b className="font-semibold">Посуд ручної роботи</b> від українських студій можна замовити і невеликою, і великою партією: мінімальна кількість залежить від студії та виробу. Виготовлення зазвичай займає {nobreak(site.lead.batch)}, бо кожна партія проходить сушіння і два{' '}
                  <Term def={glossary.випал.def}>випали</Term>.
                </p>
                <p className="m-0">
                  <b className="font-semibold">Разовий майстер-клас</b> коштує {nobreak(f.range('group'))}, індивідуальний — {nobreak(f.range('private'))}. Корпоратив — {nobreak(f.range('corporate'))}.
                </p>
              </div>
            </QuoteBlock>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat variant="tile" value={nf(s.makers)} label={`${makers} у каталозі`} />
              <Stat variant="tile" value={String(s.masterClassPlaces)} label={`${places} з майстер-класами`} />
              <Stat variant="tile" value={String(s.cities)} label={cityWord} />
              <Stat variant="tile" value={String(s.withPrices)} label={`${pluralUk(s.withPrices, ['студія', 'студії', 'студій'])} у вибірці цін`} />
            </div>
            <DataTable
              caption="Типові формати і ціни, 2026"
              columns={[{ key: 'what', label: 'Що' }, { key: 'price', label: 'Типова ціна, здебільшого' }, { key: 'term', label: 'Термін' }, { key: 'more', label: 'Детальніше' }]}
              rows={[
                ['Партія посуду для закладу', 'за запитом, залежить від кількості', site.lead.batch, 'Посуд для ресторанів', '/dlya-biznesu/posud-dlya-restoraniv'],
                ['Чашки з логотипом', 'за запитом', site.lead.logo, 'Чашки з логотипом', '/dlya-biznesu/chashky-z-lohotypom'],
                ['Корпоратив з ліплення з глини', f.range('corporate', { bare: true }), 'бронювання за 1–3 тижні', 'Корпоративи', '/dlya-biznesu/korporatyv-lipennya-z-hlyny'],
                ['Разовий майстер-клас', f.range('group', { bare: true }), 'запис на тиждень уперед', 'За містами', '/maister-klasy'],
                ['Індивідуальний майстер-клас', f.range('private', { bare: true }), 'за домовленістю', 'За містами', '/maister-klasy'],
              ].map((r) => ({ what: r[0], price: nobreak(r[1]), term: nobreak(r[2]), more: <Link href={r[4]}>{r[3]}</Link> }))}
            />
          </div>
        </div>
      </section>

      {/* Master classes by city */}
      <section className={cx(wrap, section)} aria-labelledby="mk">
        <SectionHead
          variant="poster"
          id="mk"
          kicker="Для себе і в подарунок"
          title={<>Майстер-класи <Italic>з кераміки за містами</Italic></>}
          note="Усі студії міста на одній сторінці: формати, ціни, сертифікати й контакти."
          more={{ label: 'Усі міста', href: '/maister-klasy' }}
        />
        <div className="pt-[clamp(22px,3vw,40px)]">
          <VesselWindows>
            <VesselWindow shape="jug" photo={sitePhotos.vesselJug} title="Ліплення з глини" caption="без кола, з джгутів і пласта" href="/maister-klasy/lipennya" />
            <VesselWindow shape="bowl" photo={sitePhotos.vesselBowl} title="Гончарне коло" caption="центрування, витягування" href="/maister-klasy/honcharne-kolo" />
            <VesselWindow shape="plate" photo={sitePhotos.vesselPlate} title="Розпис" caption="ангоби й полива по сирцю" href="/maister-klasy/rozpys" />
          </VesselWindows>
        </div>
        <div className="mt-[clamp(28px,4vw,48px)]">
          <CityList
            items={[
              ...cities
                .filter(([, , slug]) => s.cityCounts.has(slug) || !s.cityCounts.size)
                .map(([n, c, slug]) => ({ name: n === 'Івано-Франківськ' ? 'Франківськ' : n, href: `/maister-klasy/${slug}`, count: s.cityCounts.get(slug) ?? c })),
              { name: 'Усі міста', href: '/maister-klasy', count: '→' },
            ]}
          />
        </div>
        <div className="mt-[22px]">
          <ChipGroup aria-label="Формати">
            {[['Гончарство для двох', 'dlya-dvokh'], ['Для дітей', 'dlya-ditey'], ['Гончарне коло', 'honcharne-kolo'], ['Ліплення з глини', 'lipennya'], ['Розпис', 'rozpys'], ['Курси', 'kursy']].map(([l, slug]) => (
              <Chip key={slug} href={`/maister-klasy/${slug}`}>{l}</Chip>
            ))}
            <Chip href="/sertyfikaty">Сертифікати</Chip>
          </ChipGroup>
        </div>
      </section>

      {/* Guides */}
      <section className={cx(wrap, section)} aria-labelledby="guides">
        <SectionHead variant="poster" id="guides" kicker="Корисне" title={<>Як замовити кераміку <Italic>без сюрпризів</Italic></>} more={{ label: 'Усі гайди', href: '/hayidy' }} />
        <ul className="m-0 mt-[clamp(20px,3vw,36px)] grid list-none grid-cols-1 p-0 md:grid-cols-3">
          {[
            ['Для закладів', 'Що перевірити у студії перед замовленням посуду', 'Зразки, харчова полива, посудомийка, дозамовлення через пів року.', '/dlya-biznesu/posud-dlya-restoraniv#check'],
            ['Для компаній', 'Новорічні подарунки з кераміки: коли замовляти', 'Календар: до якої дати надіслати запит і погодити зразок, щоб партія встигла до свят.', '/dlya-biznesu/novorichni-podarunky-2026#sec0'],
            ['Логотип', 'Штамп, деколь чи полива', 'П’ять способів нанести логотип на кераміку і що узгодити зі студією.', '/dlya-biznesu/chashky-z-lohotypom#sec0'],
          ].map(([tag, t, d, href]) => (
            <li key={href} className="border-b border-rule md:border-r md:border-b-0 md:pr-6 md:[&:not(:first-child)]:pl-6 md:last:border-r-0 md:last:pr-0">
              <Link href={href} className="group/guide grid content-start gap-2 pt-[22px] pb-[26px] text-ink no-underline hover:text-ink">
                <Kicker tone="terracotta">{tag}</Kicker>
                <h3 className="m-0 font-display text-[19px] leading-[1.15] font-semibold group-hover/guide:text-cobalt">{t}</h3>
                <p className="m-0 max-w-[38ch] text-[15px] text-ink-2">{d}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ (Faq adds the FAQPage JSON-LD) */}
      <div className={cx(wrap, section)}>
        <Faq id="faq" head="poster" kicker="Питання і відповіді" title={<>Часті <Italic>питання</Italic></>} items={faq} openFirst />
      </div>

      {/* For studios */}
      <Panel as="section" tone="ink" bleed className={section} id="studios" aria-label="Для студій і майстрів" data-flush-footer="">
        <div className="grid items-center gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <figure className="m-0">
            <Image src={sitePhotos.forStudios.src} alt={sitePhotos.forStudios.alt} width={sitePhotos.forStudios.width} height={sitePhotos.forStudios.height} sizes="(min-width:960px) 33vw, 100vw" className="aspect-[4/3] w-full object-cover object-[center_30%] lg:aspect-[3/4]" />
          </figure>
          <div>
            <Kicker className="mb-3 block">Для студій і майстрів</Kicker>
            <h2 className="m-0 max-w-[14ch] font-display text-[clamp(28px,4.6vw,68px)] leading-[.95] font-extrabold tracking-[-.01em] uppercase">
              Отримуйте замовлення <Italic>від ресторанів і компаній</Italic>
            </h2>
            <ul className="m-0 mt-[22px] max-w-[48ch] list-none p-0 text-base">
              {['Безкоштовний профіль з вашими фото, цінами й умовами', 'Запити від ресторанів, кав’ярень, готелів і компаній', 'Без оплати за розміщення чи за запити'].map((t) => (
                <li key={t} className="border-t border-rule-on-dark py-2.5">{t}</li>
              ))}
            </ul>
            <div className="mt-[22px] flex flex-wrap items-center gap-2.5">
              <Button href={STUDIO_JOIN_HREF}>Додати студію</Button>
            </div>
            <p className="m-0 mt-3.5 max-w-[52ch] text-sm text-on-ink-2">
              Ваша студія вже є на сайті? Знайдіть її профіль і натисніть «Керувати профілем».{' '}
              <Link href="/kabinet/vhid" className="text-peach underline underline-offset-[3px]">Вхід для студій</Link>
            </p>
          </div>
        </div>
      </Panel>
      <MobileRequestBar />
    </main>
  )
}
