import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, FieldRow, Input, Select, Textarea } from '@/components/ui/Fields'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { CityHead } from '@/components/ui/CityHead'
import { CityList, SmallCities } from '@/components/ui/CityList'
import { CtaBand } from '@/components/ui/CtaBand'
import { DataTable } from '@/components/ui/DataTable'
import { Epigraph } from '@/components/ui/Epigraph'
import { FactStrip } from '@/components/ui/FactStrip'
import { Faq } from '@/components/ui/Faq'
import { Facts } from '@/components/ui/Facts'
import { Italic } from '@/components/ui/Italic'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { ListBlock } from '@/components/ui/ListBlock'
import { MakerRow, MakerRows } from '@/components/ui/MakerRow'
import { Mark } from '@/components/ui/Mark'
import { MoreLink } from '@/components/ui/MoreLink'
import { Note } from '@/components/ui/Note'
import { NumberedList } from '@/components/ui/NumberedList'
import { Panel } from '@/components/ui/Panel'
import { PhotoCard } from '@/components/ui/PhotoCard'
import { PriceList } from '@/components/ui/PriceList'
import { QuoteBlock } from '@/components/ui/QuoteBlock'
import { Rule } from '@/components/ui/Rule'
import { SectionHead } from '@/components/ui/SectionHead'
import { SideBox } from '@/components/ui/SideBox'
import { Stat } from '@/components/ui/Stat'
import { IndexCell, StudioCell, StudioCells } from '@/components/ui/StudioCell'
import { StudioRow, StudioRows } from '@/components/ui/StudioRow'
import { Term } from '@/components/ui/Term'
import { Updated } from '@/components/ui/Updated'
import { WordmarkWindow } from '@/components/ui/WordmarkWindow'
import { sitePhotos } from '@/content/photos'
import { glossary } from '@/content/glossary'
import { REQUEST_HREF } from '@/content/navigation'
import { site } from '@/content/site'
import { verses } from '@/content/verses'
import { getAllStudios, getStudioBySlug, groupByCity, hryvniaAmounts, offersMasterClasses, type StudioCard } from '@/lib/catalog'
import { facts } from '@/lib/facts'
import { fmt } from '@/lib/money'
import { cleanName, firstAddress, inCity, publicPrices } from '@/lib/present'
import { priceIndex, studioPrice } from '@/lib/priceIndex'

// Living reference of the design system (docs/design/SYSTEM.md §8): real components with real data. Local only.
export const metadata: Metadata = { title: 'Стайлгайд', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const COLORS = [
  ['paper', 'фон сторінки, шапки, футера'],
  ['paper-2', 'плитки цифр, примітки'],
  ['paper-white', 'плашка цитати'],
  ['ink', 'текст, 2px лінійки, чорні панелі'],
  ['ink-2', 'другорядний текст, кікери'],
  ['cobalt', 'дія і число, панелі, посилання'],
  ['cobalt-deep', 'hover кобальту, епіграф'],
  ['on-cobalt-2', 'другорядний на кобальті'],
  ['on-ink-2', 'другорядний на чорному'],
  ['peach', 'акцент лише на темному'],
  ['terracotta', 'знак, великі номери, пунктир'],
  ['terracotta-text', 'дрібний теракотовий текст'],
  ['rule', 'тонка лінійка на папері'],
  ['rule-on-dark', 'тонка лінійка на кобальті й чорному'],
] as const

const PAIRS: [string, string, string, string][] = [
  ['ink', 'paper', '15.35', 'усюди'],
  ['ink-2', 'paper', '7.48', 'другорядний текст'],
  ['cobalt', 'paper', '6.80', 'посилання, цифри'],
  ['cobalt-deep', 'paper', '9.82', 'епіграф, hover'],
  ['terracotta-text', 'paper', '4.73', 'дрібний теракотовий'],
  ['terracotta', 'paper', '4.12', 'лише великий текст і знаки'],
  ['paper', 'ink', '15.35', 'текст на чорному'],
  ['on-ink-2', 'ink', '11.98', 'другорядний на чорному'],
  ['peach', 'ink', '13.91', 'акцент на чорному'],
  ['paper', 'cobalt', '6.80', 'текст на кобальті'],
  ['on-cobalt-2', 'cobalt', '5.80', 'другорядний на кобальті'],
  ['peach', 'cobalt', '6.16', 'курсив, номери, помилка'],
]

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-5">
      <SectionHead id={id} title={title} className="!mb-0" />
      {children}
    </section>
  )
}

const Cap = ({ children }: { children: React.ReactNode }) => <p className="m-0 font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">{children}</p>

export default async function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const [all, f, idx, saga] = await Promise.all([getAllStudios(), facts(), priceIndex(), getStudioBySlug('saga-pottery')])
  const kyiv = all.filter((s) => s.cityDoc?.slug === 'kyiv')
  const sample: StudioCard[] = kyiv.slice(0, 4)
  const mkStudios = all.filter(offersMasterClasses)
  const byCity = groupByCity(all)
  const cityItems = byCity.slice(0, 8).map((g) => ({ name: g.city.name, href: `/vyrobnyky/misto/${g.city.slug}`, count: g.studios.length }))
  const small = byCity.filter((g) => g.studios.length < 3).slice(0, 4).map((g) => ({ name: g.city.name, studios: g.studios.slice(0, 3).map((s) => ({ name: cleanName(s.name), href: `/vyrobnyky/${s.slug}` })) }))
  const group = f.get('group')
  const priced = idx.stats.find((x) => x.cat.key === 'group')
  const prices = saga ? publicPrices(saga).slice(0, 4) : []
  const makerWithPrice = kyiv.find((s) => studioPrice(s, 'group') != null)
  const makerPrice = makerWithPrice ? studioPrice(makerWithPrice, 'group') : null
  const stripItems = [
    { value: fmt(all.length), label: 'студій і майстрів у каталозі' },
    { value: fmt(byCity.length), label: 'міст і сіл' },
    { value: fmt(mkStudios.length), label: 'місць із майстер-класами' },
    ...(group ? [{ value: `${fmt(group.min)}–${fmt(group.max)}`, label: `грн, разовий майстер-клас ${group.unit}` }] : []),
    { value: site.dataUpdated, label: 'дані оновлено' },
  ]
  const faqItems = [
    { q: 'Скільки часу займає виготовлення партії кераміки?', a: `Зазвичай ${site.lead.batch} (як зазначають студії).` },
    { q: 'Скільки коштує сервіс для замовника?', a: site.model },
    ...(group ? [{ q: 'Скільки коштує разовий майстер-клас?', a: `За прайсами студій: ${f.range('group')}.` }] : []),
  ]
  const pcards = [
    { n: '01', tone: 'ink', title: 'Посуд для закладів', text: 'Тарілки, миски, чашки під страви і напої.', cta: 'Студії і ціни →', photo: sitePhotos.cardVenues },
    { n: '02', tone: 'cobalt', title: 'Чашки з логотипом', text: 'Штамп, деколь або полива з вашим знаком.', cta: 'Як це роблять →', photo: sitePhotos.cardLogo },
  ] as const
  const ruleStyle = 'grid gap-3'

  return (
    <main className={cx(wrap, 'grid gap-block pt-hero pb-section')}>
      <header className="grid gap-3.5">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Стайлгайд' }]} />
        <Kicker>Лише для розробки · docs/design/SYSTEM.md</Kicker>
        <h1 className="m-0 font-display text-h1">Дизайн-система «Глина»</h1>
        <p className="m-0 max-w-read text-lead">
          Живі компоненти з <b className="font-semibold">src/components/ui</b> і справжні дані каталогу: {fmt(all.length)} студій, {fmt(byCity.length)} міст. Сторінка не індексується і в продакшні віддає 404.
        </p>
        <Updated />
        <nav aria-label="Розділи стайлгайду" className="flex flex-wrap gap-1.5">
          {['colors', 'type', 'rules', 'buttons', 'heads', 'panels', 'facts', 'cards', 'tables', 'chips', 'faq', 'term', 'epi', 'forms', 'lists', 'studios', 'marks', 'wordmark'].map((k) => (
            <Chip key={k} href={`#sg-${k}`} size="sm" as="a">{k}</Chip>
          ))}
        </nav>
      </header>

      <Block id="sg-colors" title="1 · Кольори">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COLORS.map(([name, role]) => (
            <div key={name} className="grid content-start gap-1.5">
              <div className="h-14 border border-rule" style={{ background: `var(--color-${name})` }} />
              <b className="font-mono text-[11px] font-medium tracking-[.06em] uppercase">{name}</b>
              <span className="text-[13px] leading-[1.35] text-ink-2">{role}</span>
            </div>
          ))}
        </div>
        <Cap>Дозволені пари (WCAG, §2.1)</Cap>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {PAIRS.map(([fg, bg, ratio, where]) => (
            <div key={fg + bg} className="flex items-center gap-3 px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--color-rule)]" style={{ background: `var(--color-${bg})`, color: `var(--color-${fg})` }}>
              <span className="font-display text-xl font-extrabold">Аа</span>
              <span className="font-mono text-[11px] leading-[1.4] tracking-[.04em] uppercase">{fg} / {bg}<br />{ratio} · {where}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block id="sg-type" title="2 · Типографіка">
        <div className="grid gap-5">
          <div><Cap>H1 · Unbounded 600</Cap><p className="m-0 mt-1 font-display text-h1">Посуд і подарунки ручної роботи</p></div>
          <div><Cap>H2 плакатний · Unbounded 800 + <Italic>курсив</Italic></Cap><p className="m-0 mt-1 font-display text-h2-poster font-extrabold uppercase">Скільки коштує і <Italic>скільки</Italic> часу</p></div>
          <div><Cap>H2 розділу · Unbounded 600</Cap><p className="m-0 mt-1 font-display text-h2 uppercase">Що робить і пропонує</p></div>
          <div><Cap>H3 · Unbounded 600 · 17px</Cap><p className="m-0 mt-1 font-display text-[17px] leading-[1.15] font-semibold">Київ</p></div>
          <div><Cap>Лід · Golos 18px</Cap><p className="m-0 mt-1 max-w-read text-lead">За прайсами студій 2026 року разовий майстер-клас коштує <b className="font-semibold">{f.range('group')}</b>.</p></div>
          <div><Cap>Текст · Golos 17px</Cap><p className="m-0 mt-1 max-w-read text-body">Звичайний абзац: числа лишаються з лінійними цифрами, 17 пікселів, інтерліньяж 1.5.</p></div>
          <div><Cap>Дрібний · Golos 15px ink-2</Cap><p className="m-0 mt-1 text-small text-ink-2">Примітки, опис у рядках.</p></div>
          <div><Cap>Кікер · JetBrains Mono 12px</Cap><Kicker as="p">Для бізнесу · оновлено {site.dataUpdated}</Kicker></div>
          <div><Cap>Мітка · mono 500 11px</Cap><p className="m-0 mt-1 font-mono text-label font-medium text-ink-2 uppercase">Типова ціна · термін · детальніше</p></div>
          <div><Cap>Епіграф · Playfair italic</Cap><p className="m-0 mt-1 font-serif text-epi text-cobalt-deep italic">Глина пам’ятає руки</p></div>
          <div><Cap>Кнопка · Unbounded 600 13.5px</Cap><p className="m-0 mt-1 font-display text-btn font-semibold uppercase">Отримати пропозиції</p></div>
          <div><Cap>Число · Unbounded 800, tabular</Cap><p className="m-0 mt-1 font-display text-[clamp(26px,2.6vw,36px)] leading-none font-extrabold text-cobalt tabular-nums">{fmt(all.length)}</p></div>
        </div>
      </Block>

      <Block id="sg-rules" title="3 · Лінійки, радіус, фокус">
        <div className={ruleStyle}>
          <Cap>Rule thin / ink / on-dark</Cap>
          <Rule />
          <Rule tone="ink" />
          <Panel tone="cobalt"><Rule tone="on-dark" /></Panel>
          <Cap>Радіус 2px — лише кнопки й чипи; решта 0. Тіней нема. Фокус — Tab на цих посиланнях:</Cap>
          <div className="flex flex-wrap gap-4">
            <a href="#sg-rules">Посилання на папері</a>
            <Button href="#sg-rules" size="sm">Кнопка</Button>
            <Panel tone="cobalt" className="flex gap-4"><a href="#sg-rules">Посилання на кобальті</a><Button href="#sg-rules" size="sm">Кнопка</Button></Panel>
          </div>
        </div>
      </Block>

      <Block id="sg-buttons" title="4 · Button">
        {(['paper', 'cobalt', 'ink'] as const).map((ctx) => {
          const inner = (
            <div className="grid gap-3">
              {ctx === 'paper' ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button variant="ink" arrow>ink</Button>
                  <Button variant="cobalt" arrow>cobalt</Button>
                  <Button variant="ghost">ghost</Button>
                  <Button variant="ink" disabled>disabled</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button arrow>за замовчуванням</Button>
                  <Button variant="paper">paper</Button>
                  <Button variant="peach">peach</Button>
                  <Button variant="ghost">ghost</Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2.5">
                {ctx === 'paper' ? <Button variant="cobalt" size="sm" arrow>sm</Button> : <Button size="sm" arrow>sm</Button>}
                <Button variant="ghost" size="sm">sm ghost</Button>
              </div>
              <Button variant={ctx === 'paper' ? 'cobalt' : undefined} full arrow>full</Button>
            </div>
          )
          return ctx === 'paper' ? <div key={ctx}>{inner}</div> : <Panel key={ctx} tone={ctx}>{inner}</Panel>
        })}
      </Block>

      <Block id="sg-heads" title="5 · Kicker, SectionHead, CityHead, MoreLink, Breadcrumbs, Updated">
        <SectionHead id="sg-h-rule" kicker="Для бізнесу" title="Ціни на майстер-класи" note="З прайсів студій, джерело вказано поруч. Актуальні ціни уточнюйте у студії." more={{ label: 'Усі ціни', href: '/tsiny-2026' }} />
        <SectionHead id="sg-h-poster" variant="poster" kicker="Коротко про ринок" title={<>Скільки коштує і <Italic>скільки</Italic> часу</>} more={{ label: 'Ціни 2026', href: '/tsiny-2026' }} />
        <div>
          <CityHead id="sg-city" name="Київ" count={kyiv.length} />
          <div className="flex flex-wrap items-center gap-6">
            <MoreLink href="/vyrobnyky/misto">Усі міста</MoreLink>
            <details>
              <MoreLink as="summary">Показати ще 5 / Згорнути</MoreLink>
              <Note>Розгорнутий вміст «details».</Note>
            </details>
            <Kicker tone="terracotta">Гайд · кікер терракоти</Kicker>
          </div>
        </div>
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: saga ? cleanName(saga.name) : 'Студія' }]} />
        <Updated />
      </Block>

      <Block id="sg-panels" title="6 · Panel, CtaBand, Mark">
        <Panel tone="cobalt">
          <Kicker>Як це працює</Kicker>
          <p className="m-0 mt-2 max-w-[60ch] text-body">Текст на кобальті. Кікер сам бере вторинний колір панелі, кнопка за замовчуванням стає paper.</p>
          <div className="mt-4"><Button href={REQUEST_HREF} arrow>Надіслати запит</Button></div>
        </Panel>
        <Panel tone="ink">
          <Kicker>Для студій і майстрів</Kicker>
          <p className="m-0 mt-2 max-w-[60ch] text-body">Текст на чорному. Кнопка за замовчуванням стає peach, посилання <a href="#sg-panels" className="text-peach underline underline-offset-[3px]">підкреслені</a>.</p>
          <div className="mt-4"><Button href={REQUEST_HREF}>Додати студію</Button></div>
        </Panel>
        <CtaBand tone="cobalt" title="Отримайте пропозиції від кількох студій" text="Безкоштовно для замовника: ціни встановлюють студії." cta={{ label: 'Отримати пропозиції', href: REQUEST_HREF }} />
        <CtaBand tone="ink" title="Потрібен посуд для закладу?" cta={{ label: 'Надіслати запит', href: REQUEST_HREF }} />
        <div className="flex items-center gap-4"><Mark size={22} /><Mark size={26} /><Mark size={28} /><Cap>Mark 22 / 26 / 28, text-terracotta</Cap></div>
      </Block>

      <Block id="sg-facts" title="7 · FactStrip, Stat">
        <FactStrip items={stripItems} />
        <FactStrip items={stripItems.slice(0, 3)} label="Три цифри" />
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <Stat value={fmt(all.length)} label="студій і майстрів" />
          <Stat value={fmt(byCity.length)} label="міст і сіл" />
          <Stat value={fmt(mkStudios.length)} label="місць із майстер-класами" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat variant="tile" value={fmt(all.length)} label="студій, майстрів і брендів" />
          <Stat variant="tile" value={fmt(byCity.length)} label="міст і сіл" />
          <Stat variant="tile" value={fmt(mkStudios.length)} label="місць із майстер-класами" />
          <Stat variant="tile" value={fmt(all.filter((s) => hryvniaAmounts(s).length).length)} label="профілів зі цінами в прайсі" />
        </div>
      </Block>

      <Block id="sg-cards" title="8 · PhotoCard (фото-заглушки з наявних файлів)">
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-3.5">
          {pcards.map((c) => (
            <PhotoCard key={c.n} {...c} href="/dlya-biznesu/posud-dlya-restoraniv" />
          ))}
        </div>
      </Block>

      <Block id="sg-tables" title="9 · DataTable, QuoteBlock">
        <QuoteBlock source={priced ? `Прайси ${priced.n} студій, 2026` : undefined}>
          {group ? <>Разовий майстер-клас найчастіше коштує <b className="font-semibold">{f.range('group')}</b>.</> : <>Недостатньо цін у прайсах для оцінки.</>}
        </QuoteBlock>
        {priced ? (
          <>
            <DataTable
              caption="Приклади з прайсів: разовий майстер-клас"
              columns={[{ key: 'studio', label: 'Студія' }, { key: 'city', label: 'Місто' }, { key: 'price', label: 'З прайсу' }, { key: 'src', label: 'Джерело', mono: true }]}
              rows={priced.examples.map((e) => ({ studio: <a href={`/vyrobnyky/${e.studio.slug}`}>{cleanName(e.studio.name)}</a>, city: e.studio.cityDoc?.name ?? '', price: e.text, src: e.source ?? 'сайт студії' }))}
            />
            <DataTable
              mode="scroll"
              caption="Широка таблиця: прокрутка вбік (mode=scroll)"
              columns={[{ key: 'a', label: 'Категорія' }, { key: 'b', label: 'Студій', numeric: true, align: 'end' }, { key: 'c', label: 'Від', numeric: true, align: 'end' }, { key: 'd', label: 'Медіана', numeric: true, align: 'end' }, { key: 'e', label: 'До', numeric: true, align: 'end' }, { key: 'f', label: 'Одиниця', mono: true }]}
              rows={idx.stats.slice(0, 5).map((x) => ({ a: x.cat.label, b: x.n, c: fmt(x.p10), d: fmt(x.median), e: fmt(x.p90), f: x.cat.unit }))}
            />
          </>
        ) : <Note>Немає даних про ціни — таблицю не показуємо.</Note>}
      </Block>

      <Block id="sg-chips" title="10 · Chip, ChipGroup">
        <ChipGroup label="У містах:" as="nav">
          {cityItems.slice(0, 4).map((c) => <Chip key={c.href} href={c.href} count={c.count}>{c.name}</Chip>)}
        </ChipGroup>
        <ChipGroup label="Формат:"><Chip as="span">тег</Chip><Chip href="#sg-chips" tone="cobalt">акцентний</Chip><Chip href="#sg-chips" active>активний</Chip><Chip size="sm" as="span">sm</Chip><Chip size="sm" tone="cobalt" as="span">sm cobalt</Chip></ChipGroup>
      </Block>

      <Block id="sg-faq" title="11 · Faq">
        <Faq id="sg-faq-list" title="Часті питання" kicker="Питання і відповіді" items={faqItems} openFirst jsonLd={false} />
      </Block>

      <Block id="sg-term" title="12 · Term">
        <p className="m-0 max-w-read">
          Перший <Term def={glossary.випал.def}>випал</Term> — без поливи, другий — з поливою (це пояснення стоїть і в тексті).
        </p>
        <p className="m-0"><Term def={glossary.випал.def}>Випал</Term> — слово на початку рядка, біля лівого краю.</p>
        <p className="m-0 text-right">Слово біля правого краю: <Term def={glossary.випал.def} side="end">випал</Term></p>
        <p className="m-0 max-w-read">Наведіть або зафокусуйте слово: підказка не виходить за межі екрана.</p>
      </Block>

      <Block id="sg-epi" title="13 · Epigraph">
        <Epigraph lines={verses.home} />
      </Block>

      <Block id="sg-forms" title="14 · Field, Input, Select, Textarea, Checkbox">
        {(['paper', 'cobalt'] as const).map((tone) => {
          const body = (
            <div className="grid max-w-[560px] gap-1">
              <Field label="Що потрібно" htmlFor={`${tone}-what`}>
                <Select id={`${tone}-what`} defaultValue="a"><option value="a">Посуд для закладу</option><option value="b">Майстер-клас</option></Select>
              </Field>
              <FieldRow>
                <Field label="Кількість" htmlFor={`${tone}-q`}><Input id={`${tone}-q`} placeholder="напр. 50" /></Field>
                <Field label="Місто" htmlFor={`${tone}-c`} error="Вкажіть місто"><Input id={`${tone}-c`} invalid defaultValue="" placeholder="Ваше місто" /></Field>
              </FieldRow>
              <Field label="Деталі" htmlFor={`${tone}-d`} hint="Необов’язково"><Textarea id={`${tone}-d`} placeholder="Об’єм, колір, бюджет" /></Field>
              <Checkbox label="Потрібен логотип" />
            </div>
          )
          return tone === 'cobalt' ? <Panel key={tone} tone="cobalt">{body}</Panel> : <div key={tone}>{body}</div>
        })}
      </Block>

      <Block id="sg-lists" title="15 · NumberedList, Note, SideBox, Facts, ListBlock, PriceList">
        <NumberedList items={[{ title: 'Зразок до партії', text: 'Попросіть 1–3 вироби з тієї ж глини й поливи, що й уся партія.' }, { title: 'Харчова полива', text: 'Уточніть, що полива харчова і без свинцю.' }, { title: 'Дозамовлення', text: 'Кожна партія трохи відрізняється — обговоріть це заздалегідь.' }, { title: 'Терміни', text: `Зазвичай ${site.lead.batch}.` }]} columns={2} />
        <NumberedList items={[{ title: 'Одна колонка', text: 'Те саме в одну колонку.' }]} />
        <Note>Студія ще не вказала мінімальне замовлення і терміни — запитайте у запиті.</Note>
        <div className="grid gap-6 md:grid-cols-2">
          <SideBox title="Міста у списку"><CityList columns={2} items={cityItems.slice(0, 4)} /></SideBox>
          <SideBox title="Це ваша студія?"><MoreLink href="/dlya-studiy">Керувати профілем</MoreLink></SideBox>
        </div>
        {saga && (
          <div className="grid gap-6 md:grid-cols-2">
            <Facts rows={[['Тип', 'Бренд'], ['Місто', saga.cityDoc?.name ?? '—'], ['Адреса', firstAddress(saga.address) || '—'], ['Instagram', saga.instagram ? <a key="ig" href={saga.instagram}>{saga.instagram.replace(/^https?:\/\//, '')}</a> : '—']]} />
            <div className="grid gap-6">
              <ListBlock title="Вироби" limit={3} items={(saga.products ?? []).map((p) => p.text).slice(0, 7)} />
              <PriceList items={prices} />
            </div>
          </div>
        )}
      </Block>

      <Block id="sg-studios" title="16 · StudioCell, StudioRow, MakerRow, CityList, SmallCities, IndexCell">
        {sample.length >= 2 ? (
          <>
            <Cap>StudioCell + IndexCell</Cap>
            <StudioCells>
              {sample.map((s) => <StudioCell key={s.id} s={s} showCity />)}
              <IndexCell href="/dobirky" kicker="Добірка" title="Де купити кераміку у Києві" text="Студії міста з доставкою і самовивозом." cta="Відкрити" />
            </StudioCells>
            <Cap>StudioRow</Cap>
            <StudioRows>{sample.map((s) => <StudioRow key={s.id} s={s} showCity line={s.summary ?? ''} />)}</StudioRows>
            <Cap>MakerRow ({inCity('Київ')})</Cap>
            <MakerRows>
              {sample.slice(0, 3).map((s) => <MakerRow key={s.id} s={s} price={s.id === makerWithPrice?.id && makerPrice ? { value: `${fmt(makerPrice)} грн`, unit: 'з особи' } : undefined} />)}
            </MakerRows>
          </>
        ) : <Note>У каталозі нема даних — студії не показуємо.</Note>}
        <Cap>CityList 4 колонки, SmallCities</Cap>
        {cityItems.length > 0 && <CityList items={cityItems} />}
        {small.length > 0 && <SmallCities groups={small} />}
      </Block>

      <Block id="sg-marks" title="17 · Мапа, форма запиту, нижній бар">
        <Note>MapFrame, VesselWindow, RequestForm і MobileRequestBar ще не переписані: вони з’являться на кроках 3–6 (SYSTEM.md §9).</Note>
      </Block>

      <Block id="sg-wordmark" title="18 · WordmarkWindow">
        <WordmarkWindow photo={{ desktop: sitePhotos.wordmarkDesktop, mobile: sitePhotos.wordmarkMobile }} />
      </Block>
    </main>
  )
}
