// Site navigation. Content lives in code and is edited with an LLM; keep labels in Ukrainian.
// Business first (see AGENTS.md → ICP). Links to pages that don't exist yet are fine: they are
// the publishing plan, and 404s are caught by the sitemap check before launch.

export type NavLink = { label: string; href: string; note?: string }
export type NavColumn = { title: string; links: NavLink[] }
export type NavSection = {
  id: string
  label: string
  href: string
  emphasis?: boolean
  columns: NavColumn[]
  promo?: { title: string; text: string; cta: NavLink }
}

export const REQUEST_HREF = '/zapyt'

export const mainNav: NavSection[] = [
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
          { label: 'Новорічні подарунки 2026', href: '/dlya-biznesu/novorichni-podarunky-2026', note: 'Що встигнуть зробити до свят' },
          { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny', note: 'У студії або у вашому офісі' },
        ],
      },
      {
        title: 'Корисне',
        links: [
          { label: 'Ціни на партії', href: '/tsiny-2026/partiyi', note: 'Як ціна залежить від кількості' },
          { label: 'Як замовити партію кераміки', href: '/hayidy/yak-zamovyty-partiyu', note: 'Терміни, зразки, оплата, доставка' },
          { label: 'Харчова безпечність і посудомийка', href: '/hayidy/kharchova-bezpechnist', note: 'Що питати в студії' },
          { label: 'Кейси', href: '/keisy', note: 'Хто для кого робив посуд' },
        ],
      },
    ],
    promo: {
      title: 'Один запит — пропозиції від 3–5 студій',
      text: 'Опишіть, що потрібно, кількість і термін. Ми передамо запит студіям, які можуть це зробити.',
      cta: { label: 'Надіслати запит', href: REQUEST_HREF },
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
          { label: 'Каталог усіх виробників', href: '/vyrobnyky' },
        ],
      },
    ],
    promo: {
      title: 'Ви студія або майстер?',
      text: 'Додайте профіль безкоштовно й отримуйте запити від ресторанів і компаній.',
      cta: { label: 'Додати студію', href: '/dlya-studiy' },
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
        ],
      },
      {
        title: 'Подарунок',
        links: [
          { label: 'Сертифікати на гончарство', href: '/sertyfikaty', note: 'Ціни, термін дії, формати' },
          { label: 'Сертифікат у Києві', href: '/sertyfikaty/kyiv' },
          { label: 'Сертифікат у Львові', href: '/sertyfikaty/lviv' },
          { label: 'Сертифікат в Одесі', href: '/sertyfikaty/odesa' },
        ],
      },
    ],
    promo: {
      title: 'Для команди?',
      text: 'Корпоративи з ліплення з глини: у студії або в офісі, 550–1 550 грн з особи.',
      cta: { label: 'Корпоративи', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
    },
  },
  {
    id: 'prices',
    label: 'Ціни',
    href: '/tsiny-2026',
    columns: [
      { title: 'Індекс цін 2026', links: [{ label: 'Скільки коштує кераміка в Україні', href: '/tsiny-2026', note: 'Огляд за даними сотень студій' }] },
      {
        title: 'Для бізнесу',
        links: [
          { label: 'Партії посуду', href: '/tsiny-2026/partiyi' },
          { label: 'Чашки з логотипом', href: '/tsiny-2026/chashky-z-lohotypom' },
          { label: 'Корпоративи', href: '/tsiny-2026/korporatyvy' },
        ],
      },
      {
        title: 'Для себе',
        links: [
          { label: 'Майстер-класи за містами', href: '/tsiny-2026/maister-klasy' },
          { label: 'Сертифікати', href: '/tsiny-2026/sertyfikaty' },
          { label: 'Кераміка ручної роботи в роздріб', href: '/tsiny-2026/rozdrib' },
        ],
      },
    ],
    promo: {
      title: 'Як ми рахуємо',
      text: 'Ціни беремо з сайтів, прайсів і сторіс студій та оновлюємо щосезону. Дата вказана на кожній сторінці.',
      cta: { label: 'Методологія', href: '/pro-nas/metodolohiya' },
    },
  },
]

export const simpleNav: NavLink[] = [
  { label: 'Кейси', href: '/keisy' },
  { label: 'Гайди', href: '/hayidy' },
  { label: 'Мапа', href: '/mapa' },
]

export const utilityNav: NavLink[] = [
  { label: 'Для бізнесу', href: '/dlya-biznesu' },
  { label: 'Для студій і майстрів', href: '/dlya-studiy' },
  { label: 'Як це працює', href: '/yak-tse-pratsyuye' },
]

// Footer: only pages that exist (it is on every page); the full plan lives in mainNav.
export const footerColumns: NavColumn[] = [
  {
    title: 'Для бізнесу',
    links: [
      { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' },
      { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' },
      { label: 'Корпоратив з ліплення з глини', href: '/dlya-biznesu/korporatyv-lipennya-z-hlyny' },
      { label: 'Новорічні подарунки 2026', href: '/dlya-biznesu/novorichni-podarunky-2026' },
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
    ],
  },
  {
    title: 'Каталог',
    links: [
      { label: 'Усі студії й майстри', href: '/vyrobnyky' },
      { label: 'Для бізнесу', href: '/dlya-biznesu' },
      { label: 'Майстер-класи', href: '/maister-klasy' },
      { label: 'Для LLM: llms.txt', href: '/llms.txt' },
    ],
  },
]
