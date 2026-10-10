import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { RequestForm } from '@/components/site/RequestForm.client'
import { REQUEST_HREF } from '@/content/navigation'
import { site } from '@/content/site'
import { getAllStudios, groupByCity, hryvniaAmounts, offersMasterClasses } from '@/lib/catalog'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: 'Українська кераміка ручної роботи для бізнесу і для себе — глина.юа' },
  description:
    'Посуд і подарунки ручної роботи від українських студій для ресторанів, кав’ярень, готелів і компаній. Порівняйте умови й ціни та надішліть один запит кільком студіям. Майстер-класи у 189 містах і селах.',
  alternates: { canonical: '/' },
}

const nf = (n: number) => n.toLocaleString('uk-UA')

const paths = [
  { img: '/images/stock/terracotta.jpg', alt: 'Глиняний посуд ручної роботи', title: 'Посуд для ресторанів і кав’ярень', text: 'Тарілки, миски, чашки під стиль закладу. Посудомийка, зразки, дозамовлення.', cta: 'Студії та ціни', href: '/dlya-biznesu/posud-dlya-restoraniv' },
  { img: '/images/stock/stacked-cups.jpg', alt: 'Стос керамічних чашок', title: 'Чашки та посуд з логотипом', text: 'Штамп, деколь або полива у фірмових кольорах. Ціни залежно від кількості.', cta: 'Як це роблять', href: '/dlya-biznesu/chashky-z-lohotypom' },
  { img: '/images/stock/glazed-bottles.jpg', alt: 'Глазуровані керамічні пляшки', title: 'Корпоративні подарунки', text: 'Для команди і клієнтів: кераміка з історією про українського майстра.', cta: 'Ідеї та студії', href: '/dlya-biznesu/korporatyvni-podarunky' },
  { img: '/images/stock/hands-clay.jpg', alt: 'Руки ліплять з глини', title: 'Корпоратив з ліплення з глини', text: 'У студії чи у вашому офісі, від 10 до 40+ людей. 550–1 550 грн з особи.', cta: 'Формати', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
]

const cities = [
  ['Київ', 54, 'kyiv'], ['Львів', 34, 'lviv'], ['Одеса', 26, 'odesa'], ['Луцьк', 23, 'lutsk'],
  ['Харків', 19, 'kharkiv'], ['Ужгород', 16, 'uzhhorod'], ['Дніпро', 15, 'dnipro'], ['Тернопіль', 13, 'ternopil'],
  ['Івано-Франківськ', 11, 'ivano-frankivsk'], ['Вінниця', 10, 'vinnytsia'], ['Суми', 10, 'sumy'],
] as const

const faq = [
  { q: 'Чи можна замовити посуд ручної роботи невеликою партією?', a: 'Так. Українські студії беруть і невеликі, і великі замовлення. Мінімальна партія залежить від студії та виробу; умови, терміни й ціни кожної студії вказані в її профілі.' },
  { q: 'Скільки часу займає виготовлення партії кераміки?', a: 'Зазвичай від 3 до 8 тижнів: формування, сушіння, перший випал, полива (глазур) і другий випал. Перед Новим роком і відкриттям закладу замовляйте заздалегідь.' },
  { q: 'Чи безпечний такий посуд і чи можна мити його в посудомийці?', a: 'Це залежить від глини й поливи. У профілях ми позначаємо, які студії використовують харчові глазурі та чи підходить посуд для посудомийки. Перед великою партією просіть зразок.' },
  { q: 'Як нанести логотип на кераміку?', a: 'Найчастіше штампом на сирій глині, деколлю (перекладною картинкою, яку випалюють) або поливою у фірмових кольорах. Спосіб впливає на ціну і термін.' },
  { q: 'Скільки коштує майстер-клас з гончарства?', a: `За нашими даними 2026 року груповий майстер-клас коштує приблизно ${site.prices.groupClass}, індивідуальний — ${site.prices.privateClass}. Корпоративні формати — ${site.prices.corporate}.` },
  { q: 'Скільки коштує сервіс для замовника?', a: site.model },
]

const container = 'mx-auto max-w-[1200px] px-4 sm:px-5'
const h2 = 'h-display text-[clamp(20px,2.6vw,30px)] leading-[1.12] m-0'

// Live, honest counts from the public catalogue (falls back to the October 2026 snapshot without a database).
async function stats() {
  try {
    const all = await getAllStudios()
    const mk = all.filter(offersMasterClasses)
    return {
      makers: all.length,
      cities: groupByCity(all).length,
      masterClassPlaces: mk.length,
      withPrices: all.filter((x) => hryvniaAmounts(x).length).length,
      cityCounts: new Map(groupByCity(mk).map((g) => [g.city.slug as string, g.studios.length])),
    }
  } catch {
    return { ...site.stats, cityCounts: new Map<string, number>() }
  }
}

export default async function HomePage() {
  const s = await stats()
  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />

      {/* Hero: business first */}
      <section className={`${container} grid items-start gap-8 pt-11 pb-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]`}>
        <div className="grid gap-[18px]">
          <span className="kicker">Українська кераміка ручної роботи</span>
          <h1 className="h-display m-0 text-[clamp(28px,4.6vw,52px)] leading-[1.04]">Посуд і подарунки ручної роботи від українських студій</h1>
          <p className="m-0 max-w-[58ch] text-lg text-umber">
            Для ресторанів, кав’ярень, готелів і компаній. Порівняйте умови, терміни й ціни та надішліть один запит одразу кільком студіям.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href={REQUEST_HREF} className="rounded-full bg-terra px-[22px] py-[13px] font-bold text-cream no-underline hover:bg-terra-dark hover:text-cream">Отримати пропозиції</Link>
            <Link href="/maister-klasy" className="rounded-full border-2 border-ink px-[22px] py-[11px] font-bold text-ink no-underline hover:bg-ink hover:text-cream">Знайти майстер-клас</Link>
          </div>
          <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-sm text-umber">
            <div><dt className="font-display text-xl text-cobalt">{nf(s.makers)}</dt><dd className="m-0">студій, майстрів і брендів</dd></div>
            <div><dt className="font-display text-xl text-cobalt">{s.cities}</dt><dd className="m-0">міст і сіл</dd></div>
            <div><dt className="font-display text-xl text-cobalt">{s.masterClassPlaces}</dt><dd className="m-0">місця з майстер-класами</dd></div>
          </dl>
        </div>
        <div className="grid gap-3.5">
          <Image src="/images/stock/restaurant-table.jpg" alt="Керамічні тарілки і чашка на столі ресторану" width={1400} height={933} priority sizes="(min-width:1024px) 560px, 100vw" className="aspect-[16/10] w-full rounded-[26px] object-cover" />
          <RequestForm sourcePage="/" compact />
        </div>
      </section>

      {/* Paths */}
      <section className={`${container} pb-14`} aria-labelledby="paths">
        <div className="mb-6 grid max-w-[760px] gap-2.5"><span className="kicker">Для бізнесу</span><h2 id="paths" className={h2}>Що ви шукаєте?</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paths.map((p) => (
            <Link key={p.href} href={p.href} className="grid content-start gap-2.5 rounded-[20px] border border-transparent bg-card p-2.5 pb-4 text-ink no-underline hover:border-line hover:text-ink">
              <Image src={p.img} alt={p.alt} width={600} height={450} sizes="(min-width:1024px) 280px, (min-width:640px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-[14px] object-cover" />
              <span className="grid gap-1.5 px-1.5">
                <span className="text-[17px] leading-tight font-semibold">{p.title}</span>
                <span className="text-sm text-umber">{p.text}</span>
                <span className="text-sm font-bold text-cobalt">{p.cta} →</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { img: '/images/stock/wheel-top.jpg', alt: 'Гончарне коло, вигляд згори', title: 'Майстер-клас для себе', text: `Гончарство, ліплення, побачення, заняття для дітей у ${s.cities} містах і селах.`, href: '/maister-klasy' },
            { img: '/images/stock/teal-mug.jpg', alt: 'Керамічна чашка ручної роботи', title: 'Подарунковий сертифікат', text: 'Сертифікати на гончарство: ціни, термін дії й формати за містами.', href: '/sertyfikaty' },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3.5 rounded-[20px] border border-line bg-cream p-2.5 text-ink no-underline hover:text-ink">
              <Image src={c.img} alt={c.alt} width={220} height={220} className="aspect-square w-full rounded-[14px] object-cover" />
              <span><span className="block text-[17px] font-semibold">{c.title}</span><span className="mt-1 block text-sm text-umber">{c.text}</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={`${container} pb-14`}>
        <div className="grid gap-6 rounded-[28px] bg-cobalt p-6 text-clay sm:p-9">
          <div className="grid gap-2.5"><span className="kicker !text-ochre">Як це працює</span><h2 className={`${h2} text-cream`}>Один запит замість десяти листувань</h2></div>
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {[
              ['Опишіть замовлення', 'Що потрібно, скільки штук, до якої дати, місто й бюджет за одиницю.'],
              ['Ми підберемо студії', 'Передамо запит 3–5 студіям, які роблять такі вироби й працюють з такими обсягами.'],
              ['Порівняйте пропозиції', 'Студії відповідають напряму. Ви обираєте за ціною, терміном і стилем.'],
            ].map(([t, d], i) => (
              <li key={t} className="grid gap-2 rounded-[18px] bg-cream/10 p-[18px]">
                <span className="font-display text-[28px] font-bold text-ochre">{i + 1}</span>
                <span className="text-[17px] font-semibold text-cream">{t}</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm text-clay/90">{site.model}</p>
          <Link href={REQUEST_HREF} className="justify-self-start rounded-full bg-terra px-[22px] py-[13px] font-bold text-cream no-underline hover:bg-terra-dark hover:text-cream">Надіслати запит</Link>
        </div>
      </section>

      {/* Short answer: the part LLMs quote */}
      <section className={`${container} pb-14`} aria-labelledby="market">
        <div className="mb-6 grid max-w-[760px] gap-2.5"><span className="kicker">Коротко про ринок · оновлено {site.dataUpdated}</span><h2 id="market" className={h2}>Скільки коштує і скільки часу займає</h2></div>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-2.5 rounded-2xl border border-l-[6px] border-line border-l-ochre bg-cream p-[22px]">
            <p className="m-0 text-[16.5px]"><b>Посуд ручної роботи</b> від українських студій можна замовити і невеликою, і великою партією: мінімальна кількість залежить від студії та виробу. Виготовлення зазвичай займає {site.prices.batchLeadTime}, бо кожна партія проходить сушіння і два випали.</p>
            <p className="m-0 text-[16.5px]"><b>Майстер-клас з гончарства</b> у групі коштує приблизно {site.prices.groupClass}, індивідуальний — {site.prices.privateClass}. Корпоративні формати — {site.prices.corporate}.</p>
            <p className="m-0 text-[13px] text-umber">Джерело: прайси, сайти і сторіс українських студій, зібрані глина.юа у 2026 році. Ціни для кожної студії — у її профілі.</p>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-3">
            {[[nf(s.makers), 'студій, майстрів і брендів у каталозі'], [String(s.masterClassPlaces), 'місця з майстер-класами'], [String(s.cities), 'міст і сіл'], [String(s.withPrices), 'профілів з цінами з прайсу']].map(([n, l]) => (
              <div key={l} className="grid gap-0.5 rounded-2xl bg-card p-4"><dt className="font-display text-[clamp(22px,3vw,30px)] leading-tight text-cobalt">{n}</dt><dd className="m-0 text-sm text-umber">{l}</dd></div>
            ))}
          </dl>
        </div>
        <div className="mt-[18px] overflow-x-auto rounded-2xl bg-card">
          <table className="w-full min-w-[520px] border-collapse text-[14.5px] [font-variant-numeric:lining-nums_tabular-nums]">
            <caption className="kicker px-3.5 pt-3.5 text-left">Типові формати і ціни, 2026</caption>
            <thead><tr className="text-left text-[12.5px] tracking-wide text-umber uppercase"><th className="border-b border-line px-3.5 py-3">Що</th><th className="border-b border-line px-3.5 py-3">Типова ціна</th><th className="border-b border-line px-3.5 py-3">Термін</th><th className="border-b border-line px-3.5 py-3">Детальніше</th></tr></thead>
            <tbody>
              {[
                ['Партія посуду для закладу', 'за запитом, залежить від кількості', site.prices.batchLeadTime, 'Посуд для ресторанів', '/dlya-biznesu/posud-dlya-restoraniv'],
                ['Чашки з логотипом', 'за запитом', '3–6 тижнів', 'Чашки з логотипом', '/dlya-biznesu/chashky-z-lohotypom'],
                ['Корпоратив з ліплення з глини', site.prices.corporate, 'бронювання за 1–3 тижні', 'Корпоративи', '/dlya-biznesu/korporatyv-lipennya-z-hlyny'],
                ['Груповий майстер-клас', site.prices.groupClass, 'запис на тиждень уперед', 'За містами', '/maister-klasy'],
                ['Індивідуальний майстер-клас', site.prices.privateClass, 'за домовленістю', 'За містами', '/maister-klasy'],
              ].map((r) => (
                <tr key={r[0]}><td className="border-b border-line px-3.5 py-3">{r[0]}</td><td className="border-b border-line px-3.5 py-3">{r[1]}</td><td className="border-b border-line px-3.5 py-3">{r[2]}</td><td className="border-b border-line px-3.5 py-3"><Link href={r[4]}>{r[3]}</Link></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Master classes by city */}
      <section className={`${container} pb-14`} aria-labelledby="mk">
        <div className="mb-6 grid max-w-[760px] gap-2.5"><span className="kicker">Для себе і в подарунок</span><h2 id="mk" className={h2}>Майстер-класи з кераміки за містами</h2><p className="m-0 text-umber">Усі студії міста на одній сторінці: формати, ціни, сертифікати й контакти.</p></div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5 p-0">
          {cities.filter(([, , slug]) => (s.cityCounts.get(slug) ?? 0) >= 3 || !s.cityCounts.size).map(([n, c, slug]) => (
            <li key={slug}><Link href={`/maister-klasy/${slug}`} className="flex justify-between gap-2 rounded-[14px] bg-card px-3.5 py-3 font-semibold text-ink no-underline hover:bg-sand hover:text-ink">{n}<span className="text-terra">{s.cityCounts.get(slug) ?? c}</span></Link></li>
          ))}
          <li><Link href="/maister-klasy" className="flex justify-between gap-2 rounded-[14px] bg-card px-3.5 py-3 font-semibold text-ink no-underline hover:bg-sand hover:text-ink">Усі міста<span className="text-terra">→</span></Link></li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {[['Гончарство для двох', 'dlya-dvokh'], ['Для дітей', 'dlya-ditey'], ['Гончарне коло', 'honcharne-kolo'], ['Ліплення з глини', 'lipennya'], ['Розпис', 'rozpys'], ['Курси', 'kursy']].map(([l, slug]) => (
            <Link key={slug} href={`/maister-klasy/${slug}`} className="rounded-full border border-line bg-cream px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:text-cobalt">{l}</Link>
          ))}
          <Link href="/sertyfikaty" className="rounded-full border border-line bg-cream px-3.5 py-2 text-sm font-semibold text-ink no-underline hover:text-cobalt">Сертифікати</Link>
        </div>
      </section>

      {/* Guides */}
      <section className={`${container} pb-14`} aria-labelledby="guides">
        <div className="mb-6 grid max-w-[760px] gap-2.5"><span className="kicker">Гайди</span><h2 id="guides" className={h2}>Як замовити кераміку без сюрпризів</h2></div>
        <ul className="m-0 grid list-none gap-3.5 p-0 lg:grid-cols-3">
          {[
            ['Для закладів', 'Як замовити посуд для ресторану', 'Зразки, харчова безпечність, посудомийка, дозамовлення через пів року.', '/hayidy/yak-zamovyty-posud-dlya-restoranu'],
            ['Для компаній', 'Новорічні подарунки з кераміки: коли замовляти', 'Чому партію до свят краще замовити до середини листопада.', '/hayidy/novorichni-podarunky-terminy'],
            ['Логотип', 'Штамп, деколь чи полива', 'Як виглядає логотип на кераміці і від чого залежить ціна.', '/hayidy/lohotyp-na-keramitsi'],
          ].map(([tag, t, d, href]) => (
            <li key={href}><Link href={href} className="grid h-full gap-1.5 rounded-[20px] border border-line bg-cream p-[18px] text-ink no-underline hover:text-ink"><small className="text-xs font-bold tracking-wider text-terra uppercase">{tag}</small><span className="text-[17px] font-semibold">{t}</span><span className="text-sm text-umber">{d}</span></Link></li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className={`${container} pb-14`} aria-labelledby="faq">
        <div className="mb-6 grid max-w-[760px] gap-2.5"><span className="kicker">Питання і відповіді</span><h2 id="faq" className={h2}>Часті питання</h2></div>
        <div className="grid max-w-[860px] gap-2.5">
          {faq.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-2xl bg-card px-[18px] py-1">
              <summary className="flex cursor-pointer list-none justify-between gap-3 py-3.5 font-bold">{f.q}<span aria-hidden className="font-display text-terra group-open:hidden">+</span><span aria-hidden className="font-display hidden text-terra group-open:inline">–</span></summary>
              <p className="mt-0 mb-3.5">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* For studios */}
      <section className={`${container} pb-14`}>
        <div className="grid items-center gap-6 rounded-[28px] bg-ink p-6 text-clay sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-3">
            <span className="kicker !text-ochre">Для студій і майстрів</span>
            <h2 className={`${h2} text-cream`}>Отримуйте замовлення від ресторанів і компаній</h2>
            <ul className="m-0 grid gap-1.5 pl-[18px]">
              <li>Безкоштовний профіль з вашими фото, цінами й умовами</li>
              <li>Запити від ресторанів, кав’ярень, готелів і компаній</li>
              <li>Ми беремо лише 5% і тільки з замовлень, які відбулися</li>
            </ul>
          </div>
          <Link href="/dlya-studiy" className="justify-self-start rounded-full bg-ochre px-[22px] py-[13px] font-bold text-ink no-underline hover:text-ink">Додати студію</Link>
        </div>
      </section>
    </main>
  )
}
