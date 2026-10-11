// Product pages (/vyrobnyky/vyrib/<slug>): who makes plates, cups, vases, lamps, jewellery, tiles.
import { isExhibitingOnly } from '@/lib/present'
import { PRODUCT_RE, productText } from '@/lib/products'
import { site } from '../site'
import { verses } from '../verses'
import { docPhotos, type HeroPhoto } from '../photos'
import { CLASS_PRICE_SETS, CUPS, MAKERS, n, priceRange, type Topic, where } from './shared'

const MAKERS_ROOT = [{ label: 'Головна', href: '/' }, { label: 'Виробники', href: '/vyrobnyky' }, { label: 'Вироби', href: '/vyrobnyky/vyrib' }]
const makers = (k: number) => n(k, ['майстер чи студія', 'майстри й студії', 'майстрів і студій'])

type ProductCfg = {
  key: string
  slug: string
  crumb: string
  what: string // «тарілки, миски й піали» — after «які роблять»
  h1: string
  re: RegExp
  priceRe?: RegExp
  verse?: string[]
  photo?: HeroPhoto
  ogImg: string
  items: [string, string][]
  faq: { q: string; a: string }[]
  related: { label: string; href: string }[]
  form?: string
  priceNote?: string
  index?: string // price index category with the same meaning (/tsiny-2026)
  priceExclude?: RegExp // lines about other things that merely mention this product
}

function productTopic(p: ProductCfg): Topic {
  return {
    path: `/vyrobnyky/vyrib/${p.slug}`,
    section: 'makers',
    parents: MAKERS_ROOT,
    crumb: p.crumb,
    kicker: 'Українська кераміка ручної роботи',
    h1: p.h1,
    metaTitle: (c) => `${p.crumb} ручної роботи: ${makers(c.n)} в Україні${c.min ? ', ціни 2026' : ''}`,
    metaDescription: (c) => `${p.crumb} з кераміки від українських майстрів: ${makers(c.n)} ${where(c)}${priceRange(c) ? `, ціни здебільшого ${priceRange(c)}` : ''}. Де купити, як замовити, на що зважати.`,
    lead: (c) => `У каталозі — ${makers(c.n)} ${where(c)}, які роблять ${p.what}.${priceRange(c) ? ` У прайсах майстрів такий виріб коштує здебільшого ${priceRange(c)}.` : ''} Купують зазвичай напряму: через Instagram, власний сайт чи Etsy майстра; посилання — у профілях.`,
    verse: p.verse ?? [],
    photo: p.photo,
    ogImg: p.ogImg,
    lists: [{ title: `Хто робить: ${p.crumb.toLowerCase()}`, formats: [], match: (s) => p.re.test(productText(s)) && !isExhibitingOnly(s), types: MAKERS, byCity: true }],
    evidence: p.re,
    price: { re: p.priceRe ?? p.re, exclude: p.priceExclude ? new RegExp(`${CLASS_PRICE_SETS.source}|${p.priceExclude.source}`, 'iu') : CLASS_PRICE_SETS, index: p.index, title: 'Ціни в прайсах майстрів', note: p.priceNote ?? 'Роздрібні ціни з сайтів, Instagram і маркетплейсів майстрів; ціна залежить від розміру, поливи й розпису.' },
    sections: [{ kicker: 'Що варто знати', title: 'На що зважати', items: p.items }],
    faq: (c) => [
      { q: `Скільки коштують ${p.crumb.toLowerCase()} ручної роботи?`, a: priceRange(c) ? `У прайсах майстрів каталогу — здебільшого ${priceRange(c)} за виріб; авторські й великі речі дорожчі.` : 'У каталозі цін на ці вироби поки мало — уточнюйте в профілях майстрів.' },
      ...p.faq,
    ],
    related: p.related,
    form: p.form,
  }
}

export const productTopics: Record<string, Topic> = {
  plates: productTopic({
    key: 'plates',
    slug: 'tarilky-i-mysky',
    index: 'plate',
    crumb: 'Тарілки і миски',
    what: 'тарілки, миски, піали й сервірувальний посуд',
    h1: 'Тарілки і миски ручної роботи від українських майстрів',
    re: PRODUCT_RE.plates,
    verse: verses.tableware,
    photo: docPhotos.barCups,
    ogImg: 'doc-bar-cups',
    items: [
      ['Для щоденного вжитку', 'Питайте про харчову поливу без свинцю і про посудомийку: щільний черепок витримує миття, пористий — гірше.'],
      ['Кожна трохи інша', 'Ручні тарілки з однієї серії відрізняються відтінком і краєм. Для сервізу попросіть зробити всі в одній партії.'],
      ['Розмір', 'Обідня тарілка — 24–28 см, десертна — 18–21 см, піала — 300–600 мл. Уточнюйте розміри, а не назви.'],
      ['Для закладу', `Серії для ресторанів роблять на замовлення за ${site.lead.batch} — див. сторінку для ресторанів.`],
    ],
    faq: [{ q: 'Чи можна мити ручні тарілки в посудомийці?', a: 'Залежить від глини, поливи й температури випалу. Більшість майстрів кам’яної маси (стоунвер) і порцеляни дозволяють; про теракоту й майоліку спитайте окремо.' }],
    related: [
      { label: 'Чашки і кухлі', href: '/vyrobnyky/vyrib/chashky' },
      { label: 'Посуд для ресторанів', href: '/dlya-biznesu/posud-dlya-restoraniv' },
      { label: 'Виробники за містами', href: '/vyrobnyky/misto' },
    ],
    form: 'tableware',
  }),
  cups: productTopic({
    key: 'cups',
    slug: 'chashky',
    index: 'cup',
    // «Масельничка, чашка й тарілка — …», «свічник у формі чашки» are not a cup price.
    priceExclude: /^[^—–:]*?(?:масельн|маслянк|свічник|свічк|цукорниц|глечик|чайник)|usd|eur|\$|€/,
    crumb: 'Чашки і кухлі',
    what: 'чашки, горнята, кухлі й філіжанки',
    h1: 'Чашки і кухлі ручної роботи від українських майстрів',
    re: CUPS,
    verse: verses.cups,
    ogImg: 'teal-mug',
    items: [
      ['Об’єм', 'Еспресо — 60–90 мл, звичайна чашка — 250–350 мл, великий кухоль — 400 мл і більше. Майстри вказують об’єм у прайсі.'],
      ['Ручка і вага', 'Ручну чашку варто потримати: товщина стінок і форма ручки сильно відрізняються від майстра до майстра.'],
      ['Мікрохвильовка', 'Чашки з золотом чи люстром у мікрохвильовку не ставлять. Про решту спитайте майстра.'],
      ['Як подарунок', `Окрему чашку з написом роблять на замовлення за ${site.lead.customItem}, партію з логотипом — за ${site.lead.logo}; з наявності відправляють за кілька днів.`],
    ],
    faq: [{ q: 'Чи можна замовити чашку з написом або логотипом?', a: 'Так, багато майстрів роблять персоналізовані чашки. Для компаній — див. сторінку «Чашки з логотипом».' }],
    related: [
      { label: 'Чашки з логотипом', href: '/dlya-biznesu/chashky-z-lohotypom' },
      { label: 'Посуд для кав’ярень', href: '/dlya-biznesu/posud-dlya-kavyaren' },
      { label: 'Тарілки і миски', href: '/vyrobnyky/vyrib/tarilky-i-mysky' },
    ],
    form: 'tableware',
  }),
  vases: productTopic({
    key: 'vases',
    slug: 'vazy-i-dekor',
    index: 'vase',
    crumb: 'Вази і декор',
    what: 'вази, кашпо, свічники, скульптуру та інший декор',
    h1: 'Вази і декор з кераміки від українських майстрів',
    re: PRODUCT_RE.vases,
    priceRe: /(?<!\p{L})ваз(?!елін)|кашпо|вазон|свічник|статуетк|фігурк/iu,
    verse: verses.vases,
    photo: docPhotos.terracotta,
    ogImg: 'terracotta',
    items: [
      ['Чи тримає воду', 'Не кожна керамічна ваза водонепроникна: теракоту без поливи зсередини краще використовувати для сухоцвітів.'],
      ['Розмір і вага', 'Великі вази й вазони важкі; уточніть вагу й спосіб доставки.'],
      ['Авторський предмет', 'Скульптура й декор — часто єдиний екземпляр. Якщо подобається — питайте одразу, повтор може бути іншим.'],
      ['Для інтер’єру й закладів', 'Серію ваз чи кашпо для готелю чи ресторану роблять на замовлення.'],
    ],
    faq: [{ q: 'Чи можна замовити вазу під свій інтер’єр?', a: 'Так, багато майстрів роблять речі на замовлення: розмір, колір поливи, форма. Термін — зазвичай кілька тижнів.' }],
    related: [
      { label: 'Світильники', href: '/vyrobnyky/vyrib/svitylnyky' },
      { label: 'Посуд і декор для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv' },
      { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky' },
    ],
  }),
  lamps: productTopic({
    key: 'lamps',
    slug: 'svitylnyky',
    crumb: 'Світильники',
    what: 'керамічні світильники, лампи й абажури',
    h1: 'Керамічні світильники ручної роботи',
    re: PRODUCT_RE.lamps,
    ogImg: 'lamps',
    items: [
      ['Електрика', 'Спитайте, чи світильник продається з патроном і дротом, і під яку лампу він розрахований.'],
      ['Світло крізь кераміку', 'Перфорація і тонка порцеляна дають візерунок світла; щільна кераміка світить лише вниз чи вгору.'],
      ['Для закладів', 'Серію світильників для ресторану чи готелю роблять на замовлення — закладайте кілька тижнів.'],
    ],
    faq: [],
    related: [
      { label: 'Вази і декор', href: '/vyrobnyky/vyrib/vazy-i-dekor' },
      { label: 'Посуд і декор для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv' },
    ],
  }),
  jewelry: productTopic({
    key: 'jewelry',
    slug: 'prykrasy',
    index: 'jewelry',
    crumb: 'Прикраси з кераміки',
    what: 'сережки, кулони, брошки, намиста та інші прикраси з кераміки й порцеляни',
    h1: 'Прикраси з кераміки й порцеляни від українських майстрів',
    re: PRODUCT_RE.jewelry,
    ogImg: 'jewelry',
    items: [
      ['Фурнітура', 'Спитайте, з якого металу застібки й вушка: для чутливої шкіри краще срібло чи медична сталь.'],
      ['Вага', 'Порцелянові сережки легші, ніж здаються; великі керамічні кулони — відчутні.'],
      ['Як подарунок', 'Невеликі, легко надіслати поштою; багато майстрів пакують у подарункові коробки.'],
    ],
    faq: [],
    related: [
      { label: 'Корпоративні подарунки', href: '/dlya-biznesu/korporatyvni-podarunky' },
      { label: 'Чашки і кухлі', href: '/vyrobnyky/vyrib/chashky' },
    ],
  }),
  tiles: productTopic({
    key: 'tiles',
    slug: 'plytka-i-panno',
    crumb: 'Плитка і панно',
    what: 'плитку, кахлі, панно й мозаїку ручної роботи',
    h1: 'Плитка, кахлі й панно ручної роботи',
    re: PRODUCT_RE.tiles,
    ogImg: 'terracotta',
    items: [
      ['Для чого', 'Кухонний фартух, камін, ванна чи панно на стіну — для підлоги й вулиці потрібна морозостійка плитка.'],
      ['Партія і запас', 'Ручна плитка з різних партій відрізняється відтінком; беріть усю кількість одразу і 5–10% запасу.'],
      ['Терміни', 'Плитку під проєкт роблять тижнями; великі об’єкти — кілька місяців.'],
    ],
    faq: [],
    related: [
      { label: 'Вази і декор', href: '/vyrobnyky/vyrib/vazy-i-dekor' },
      { label: 'Посуд і декор для готелів', href: '/dlya-biznesu/posud-dlya-hoteliv' },
    ],
  }),
}
