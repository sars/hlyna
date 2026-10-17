// Site navigation. Content lives in code and is edited with an LLM; keep labels in Ukrainian.
// Business first (see AGENTS.md → ICP). The arrays below are the full publishing plan; links to
// routes that are not built yet (PLANNED) are filtered out of what is rendered, so no page links
// to a 404. When a planned page ships, remove its prefix from PLANNED. `node scripts/check-links.mjs` verifies.

import { hasWrittenCopy } from '@/editorial/live'

export type NavLink = { label: string; href: string; note?: string; offSeason?: boolean }
export type NavColumn = { title: string; links: NavLink[] }
export type NavSection = {
  id: string
  label: string
  href: string
  emphasis?: boolean
  columns: NavColumn[]
  promo?: { title: string; text: string; cta: NavLink }
  /** Seasonal section: shown until this date (YYYY-MM-DD, Kyiv), then it leaves the menu on its own. */
  until?: string
}

export const REQUEST_HREF = '/zapyt'

// The header button keeps the page's context: /zapyt?what=<kind>&misto=<city slug>, read by the request form.
const NOT_CITY = new Set(['honcharne-kolo', 'lipennya', 'dlya-ditey', 'dlya-dvokh', 'rozpys', 'kursy', 'den-narodzhennya'])
export function requestHrefFor(pathname: string | null): string {
  if (!pathname) return REQUEST_HREF
  const p = pathname.split('/').filter(Boolean)
  let what = ''
  if (p[0] === 'maister-klasy' || p[0] === 'sertyfikaty') what = 'master-class'
  else if (pathname.includes('korporatyv') || pathname.includes('richnytsyu')) what = 'corporate-workshop'
  else if (pathname.includes('chashky-z-lohotypom')) what = 'logo-mugs'
  else if (pathname.includes('podarunky-spivrobitnykam') || pathname.includes('korporatyvni-podarunky') || p[0] === 'novyi-rik-i-rizdvo') what = 'corporate-gifts'
  else if (pathname.includes('posud-dlya') || p[0] === 'dlya-biznesu' || (p[0] === 'vyrobnyky' && p[1] === 'vyrib')) what = 'tableware'
  else if (p[0] === 'podarunky-z-keramiky') what = 'other'
  let city = ''
  if ((p[0] === 'maister-klasy' || p[0] === 'sertyfikaty') && p[1] && !NOT_CITY.has(p[1])) city = p[1]
  if (p[0] === 'vyrobnyky' && p[1] === 'misto' && p[2]) city = p[2]
  const q = new URLSearchParams()
  if (what) q.set('what', what)
  if (city) q.set('misto', city)
  const qs = q.toString()
  return qs ? `${REQUEST_HREF}?${qs}` : REQUEST_HREF
}
// Studios and makers use the same request form («Інше») until there is a page for them.
export const STUDIO_JOIN_HREF = '/zapyt?vid=studiya'

const PLANNED = [
  '/yak-tse-pratsyuye',
]
// Wave A pages exist only once their copy is written (src/content/waveA, scripts/sync-wave-a.mjs).
const WAVE_HREFS: Record<string, string> = {
  '/de-kupyty-keramiku': 'de-kupyty-keramiku',
  '/podarunky-z-keramiky': 'podarunky-z-keramiky',
  '/maister-klasy/den-narodzhennya': 'mk-den-narodzhennya',
  // Wave B (src/content/waveB, scripts/sync-wave-b.mjs)
  '/dobirky/brendy-posudu': 'brendy-posudu',
  '/dobirky/etsy': 'etsy',
  '/podiyi': 'podiyi',
  '/muzei-keramiky': 'muzei-keramiky',
  '/dobirky/yalynkovi-prykrasy': 'yalynkovi-prykrasy',
  '/hayidy/vydy-keramiky': 'vydy-keramiky',
  '/hayidy/dohliad-za-keramikoyu': 'dohliad-za-keramikoyu',
  '/hayidy/chornodymlena-i-molochena': 'chornodymlena-i-molochena',
  '/dobirky/pratsyuyut-z-biznesom': 'pratsyuyut-z-biznesom',
  '/dobirky/symvol-2027-roku': 'symvol-2027',
  '/dobirky/keramichni-svichnyky': 'svichnyky',
  '/dobirky/rizdvianyi-posud': 'rizdvianyi-posud',
  '/dobirky/patriotychni-podarunky': 'patriotychni-podarunky',
  '/dobirky/posud-dlya-chainoi-tseremonii': 'chaini-tseremonii',
  '/dobirky/podarunky-gostyam-na-vesillia': 'vesillia',
  '/dobirky/keramika-na-khellovin': 'khellovin',
  // Wave C (src/content/waveC, scripts/sync-wave-c.mjs)
  '/dlya-biznesu/yak-vidsvyatkuvaty-richnytsyu-kompaniyi': 'richnytsya-kompaniyi',
  '/dlya-biznesu/podarunky-spivrobitnykam': 'podarunky-spivrobitnykam',
  '/novyi-rik-i-rizdvo': 'novyi-rik-i-rizdvo',
}
export const isBuilt = (href: string) =>
  !PLANNED.some((p) => href === p || href.startsWith(p + '/') || href.startsWith(p + '#') || href.startsWith(p + '?')) &&
  (!(href.split(/[?#]/)[0] in WAVE_HREFS) || hasWrittenCopy(WAVE_HREFS[href.split(/[?#]/)[0]]))
const liveLinks = (links: NavLink[]) => links.filter((l) => isBuilt(l.href))

const mainNavPlan: NavSection[] = [
  {
    id: 'biz',
    label: 'Для бізнесу',
    href: '/dlya-biznesu',
    emphasis: true,
    columns: [
      {
        title: 'Посуд для закладів',
        links: [
          { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv', note: 'Тарілки, миски, подача' },
          { label: 'Посуд для кав’ярень', href: '/dlya-biznesu/posud-dlya-kavyaren', note: 'Чашки, блюдця, піали під ваш стиль' },
          { label: 'Посуд для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv', note: 'Сніданки, номери, лобі' },
          { label: 'Дозамовлення і серії', href: '/hayidy/dozamovlennya-posudu', note: 'Той самий посуд через пів року' },
        ],
      },
      {
        title: 'Для компаній',
        links: [
          { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom', note: 'Штамп, деколь, полива у фірмових кольорах' },
          { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky', note: 'Для команди і клієнтів' },
          { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026', note: 'Що встигнуть зробити до свят' },
          { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny', note: 'У студії або у вашому офісі' },
          { label: 'Як відсвяткувати річницю компанії', href: '/dlya-biznesu/yak-vidsvyatkuvaty-richnytsyu-kompaniyi', note: '14 форматів поруч: ціни, групи, терміни' },
          { label: 'Подарунки співробітникам', href: '/dlya-biznesu/podarunky-spivrobitnykam', note: 'Кераміка, сертифікати, ліміт без податку' },
        ],
      },
      {
        title: 'Корисне',
        links: [
          { label: 'Ціни 2026', href: '/tsiny-2026', note: 'Майстер-класи, корпоративи, посуд — медіани за прайсами студій' },
          { label: 'Як замовити партію кераміки', href: '/hayidy/yak-zamovyty-partiyu', note: 'Терміни, зразки, оплата, доставка' },
          { label: 'Харчова безпечність і посудомийка', href: '/hayidy/kharchova-bezpechnist', note: 'Що питати в студії' },
        ],
      },
    ],
    promo: {
      title: 'Один запит — кільком студіям',
      text: 'Опишіть, що потрібно, кількість і термін. Ми передамо запит студіям, які можуть це зробити.',
      cta: { label: 'Надіслати запит', href: REQUEST_HREF },
    },
  },
  {
    id: 'season',
    label: 'Свята',
    href: '/novyi-rik-i-rizdvo',
    until: '2027-01-20',
    columns: [
      {
        title: 'Купити до свят',
        links: [
          { label: 'Ялинкові прикраси', href: '/dobirky/yalynkovi-prykrasy', note: 'Топ сезону: ціни й наявність' },
          { label: 'Символ 2027 року', href: '/dobirky/symvol-2027-roku', note: 'Кози й баранці з кераміки' },
          { label: 'Свічники й трійці', href: '/dobirky/keramichni-svichnyky', note: 'Трійці на Святвечір, будиночки' },
          { label: 'Різдвяний посуд', href: '/dobirky/rizdvianyi-posud', note: 'Макітри, глечики, набори' },
        ],
      },
      {
        title: 'Подарунки й заходи',
        links: [
          { label: 'Новорічні подарунки компаніям', href: '/dlya-biznesu/novorichni-podarunky-2026', note: 'Що встигнуть зробити до свят' },
          { label: 'Корпоратив з глиною в грудні', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny', note: 'Ціни з людини й за групу' },
          { label: 'Сертифікати на гончарство', href: '/sertyfikaty', note: 'Ціни й строк дії' },
          { label: 'Новий рік і Різдво з керамікою', href: '/novyi-rik-i-rizdvo', note: 'Огляд сезону й дедлайни' },
        ],
      },
    ],
    promo: {
      title: 'Партія до свят?',
      text: 'Прикраси, набори чи корпоратив для команди: опишіть кількість і дату, і ми передамо запит студіям.',
      cta: { label: 'Надіслати запит', href: '/zapyt?what=corporate-gifts' },
    },
  },
  {
    id: 'makers',
    label: 'Виробники',
    href: '/vyrobnyky',
    columns: [
      {
        title: 'За виробом',
        links: [
          { label: 'Тарілки і миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' },
          { label: 'Чашки і кухлі', href: '/vyrobnyky/vyrib/chashky' },
          { label: 'Вази і декор', href: '/vyrobnyky/vyrib/vazy-i-dekor' },
          { label: 'Світильники', href: '/vyrobnyky/vyrib/svitylnyky' },
          { label: 'Прикраси з кераміки', href: '/vyrobnyky/vyrib/prykrasy' },
          { label: 'Плитка і панно', href: '/vyrobnyky/vyrib/plytka-i-panno' },
        ],
      },
      {
        title: 'За містом',
        links: [
          { label: 'Київ', href: '/vyrobnyky/misto/kyiv' },
          { label: 'Львів', href: '/vyrobnyky/misto/lviv' },
          { label: 'Одеса', href: '/vyrobnyky/misto/odesa' },
          { label: 'Харків', href: '/vyrobnyky/misto/kharkiv' },
          { label: 'Дніпро', href: '/vyrobnyky/misto/dnipro' },
          { label: 'Усі міста', href: '/vyrobnyky/misto' },
        ],
      },
      {
        title: 'Добірки',
        links: [
          { label: 'Сучасні українські керамісти', href: '/dobirky/suchasni-keramisty', note: 'Автори, бренди, студії' },
          { label: 'Косів і Опішне сьогодні', href: '/dobirky/kosiv-i-opishne', note: 'Традиція в сучасному виконанні' },
          { label: 'Хто працює з бізнесом', href: '/dobirky/pratsyuyut-z-biznesom', note: 'Партії, логотипи, терміни' },
          { label: 'Бренди посуду', href: '/dobirky/brendy-posudu', note: 'Сучасні українські колекції' },
          { label: 'Кераміка на Etsy', href: '/dobirky/etsy', note: 'Українські магазини в цифрах' },
          { label: 'Працюють із закладами', href: '/dlya-biznesu/posud-dlya-restoraniv', note: 'Посуд на замовлення' },
          { label: 'Персоналізовані вироби', href: '/dlya-biznesu/chashky-z-lohotypom', note: 'Логотип, написи, корпоративні подарунки' },
          { label: 'Каталог усіх виробників', href: '/vyrobnyky' },
        ],
      },
    ],
    promo: {
      title: 'Ви студія або майстер?',
      text: 'Додайте профіль безкоштовно й отримуйте запити від ресторанів і компаній. Ваша студія вже є на сайті? Знайдіть її профіль і натисніть «Керувати профілем».',
      cta: { label: 'Додати студію', href: STUDIO_JOIN_HREF },
    },
  },
  {
    id: 'mk',
    label: 'Майстер-класи',
    href: '/maister-klasy',
    columns: [
      {
        title: 'Міста',
        links: [
          { label: 'Київ', href: '/maister-klasy/kyiv' },
          { label: 'Львів', href: '/maister-klasy/lviv' },
          { label: 'Одеса', href: '/maister-klasy/odesa' },
          { label: 'Луцьк', href: '/maister-klasy/lutsk' },
          { label: 'Харків', href: '/maister-klasy/kharkiv' },
          { label: 'Дніпро', href: '/maister-klasy/dnipro' },
          { label: 'Усі міста', href: '/maister-klasy' },
        ],
      },
      {
        title: 'Формати',
        links: [
          { label: 'Гончарство для двох', href: '/maister-klasy/dlya-dvokh' },
          { label: 'Для дітей', href: '/maister-klasy/dlya-ditey' },
          { label: 'Гончарне коло', href: '/maister-klasy/honcharne-kolo' },
          { label: 'Ліплення з глини', href: '/maister-klasy/lipennya' },
          { label: 'Розпис кераміки', href: '/maister-klasy/rozpys' },
          { label: 'Курси й абонементи', href: '/maister-klasy/kursy' },
          { label: 'День народження в студії', href: '/maister-klasy/den-narodzhennya' },
        ],
      },
      {
        title: 'Подарунок',
        links: [
          { label: 'Сертифікати на гончарство', href: '/sertyfikaty', note: 'Ціни, термін дії, формати' },
          { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky', note: 'За бюджетом і приводом' },
          { label: 'Новий рік і Різдво', href: '/novyi-rik-i-rizdvo', note: 'Прикраси, набори, дедлайни сезону' },
          { label: 'Сертифікат у Києві', href: '/sertyfikaty/kyiv' },
          { label: 'Сертифікат у Львові', href: '/sertyfikaty/lviv' },
          { label: 'Сертифікат в Одесі', href: '/sertyfikaty/odesa' },
        ],
      },
    ],
    promo: {
      title: 'Для команди?',
      text: 'Корпоративи з ліплення з глини: у студії або в офісі. Ціни з особи — на сторінці.',
      cta: { label: 'Корпоративи', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
    },
  },
]

const simpleNavPlan: NavLink[] = [
  { label: 'Ціни', href: '/tsiny-2026' },
  // The header holds one row: while a seasonal section is shown, these two wait in the footer.
  { label: 'Гайди', href: '/hayidy', offSeason: true },
  { label: 'Мапа', href: '/mapa', offSeason: true },
]

const utilityNavPlan: NavLink[] = [
  { label: 'Для бізнесу', href: '/dlya-biznesu' },
  { label: 'Для студій і майстрів', href: '/dlya-studiy' },
  { label: 'Як це працює', href: '/pro-nas#zapyty' },
]

// What is rendered: built routes only. Sections whose own page isn't built are dropped; so are empty columns and promos.
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Kyiv' }).format(new Date())
export const mainNav: NavSection[] = mainNavPlan
  .filter((s) => isBuilt(s.href) && (!s.until || today <= s.until))
  .map((s) => ({
    ...s,
    columns: s.columns.map((c) => ({ ...c, links: liveLinks(c.links) })).filter((c) => c.links.length),
    promo: s.promo && isBuilt(s.promo.cta.href) ? s.promo : undefined,
  }))
const inSeason = mainNav.some((s) => s.until)
export const simpleNav = liveLinks(simpleNavPlan.filter((l) => !(inSeason && l.offSeason)))
export const utilityNav = liveLinks(utilityNavPlan)

// Footer: only pages that exist (it is on every page); the full plan lives in mainNav.
export const footerColumns: NavColumn[] = ([
  {
    title: 'Для бізнесу',
    links: [
      { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' },
      { label: 'Посуд для кав’ярень', href: '/dlya-biznesu/posud-dlya-kavyaren' },
      { label: 'Посуд для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv' },
      { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' },
      { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky' },
      { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
      { label: 'Новорічні подарунки', href: '/dlya-biznesu/novorichni-podarunky-2026' },
      { label: 'Річниця компанії: формати', href: '/dlya-biznesu/yak-vidsvyatkuvaty-richnytsyu-kompaniyi' },
      { label: 'Подарунки співробітникам', href: '/dlya-biznesu/podarunky-spivrobitnykam' },
      { label: 'Новий рік і Різдво з керамікою', href: '/novyi-rik-i-rizdvo' },
      { label: 'Надіслати запит', href: REQUEST_HREF },
    ],
  },
  {
    title: 'Майстер-класи',
    links: [
      { label: 'Київ', href: '/maister-klasy/kyiv' },
      { label: 'Львів', href: '/maister-klasy/lviv' },
      { label: 'Одеса', href: '/maister-klasy/odesa' },
      { label: 'Харків', href: '/maister-klasy/kharkiv' },
      { label: 'Дніпро', href: '/maister-klasy/dnipro' },
      { label: 'Луцьк', href: '/maister-klasy/lutsk' },
      { label: 'Усі міста', href: '/maister-klasy' },
    ],
  },
  {
    title: 'Формати',
    links: [
      { label: 'Гончарне коло', href: '/maister-klasy/honcharne-kolo' },
      { label: 'Ліплення з глини', href: '/maister-klasy/lipennya' },
      { label: 'Розпис кераміки', href: '/maister-klasy/rozpys' },
      { label: 'Для двох', href: '/maister-klasy/dlya-dvokh' },
      { label: 'Для дітей', href: '/maister-klasy/dlya-ditey' },
      { label: 'Курси й абонементи', href: '/maister-klasy/kursy' },
      { label: 'Сертифікати', href: '/sertyfikaty' },
      { label: 'День народження в студії', href: '/maister-klasy/den-narodzhennya' },
    ],
  },
  {
    title: 'Каталог',
    links: [
      { label: 'Усі студії й майстри', href: '/vyrobnyky' },
      { label: 'За містами', href: '/vyrobnyky/misto' },
      { label: 'За виробами', href: '/vyrobnyky/vyrib' },
      { label: 'Мапа студій', href: '/mapa' },
      { label: 'Де купити кераміку', href: '/de-kupyty-keramiku' },
      { label: 'Подарунки з кераміки', href: '/podarunky-z-keramiky' },
      { label: 'Ярмарки й події', href: '/podiyi' },
      { label: 'Музеї й галереї кераміки', href: '/muzei-keramiky' },
      { label: 'Ціни 2026', href: '/tsiny-2026' },
      { label: 'Для бізнесу', href: '/dlya-biznesu' },
      { label: 'Добірки', href: '/dobirky' },
      { label: 'Гайди', href: '/hayidy' },
      { label: 'Для студій і майстрів', href: '/dlya-studiy' },
      { label: 'Вхід для студій', href: '/kabinet/vhid' },
      { label: 'Про «Глину»', href: '/pro-nas' },
      { label: 'llms.txt — для ШІ-асистентів', href: '/llms.txt' },
    ],
  },
] as NavColumn[]).map((c) => ({ ...c, links: liveLinks(c.links) }))
