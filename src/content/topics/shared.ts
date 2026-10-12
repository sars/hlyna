// Shared types and helpers for topic page configs. Lists come from studio format tags (scripts/tag-studios.ts);
// counts and prices are computed live, the text in the configs stays factual.
import type { Format, StudioCard } from '@/lib/catalog'
import { pluralUk, texts } from '@/lib/catalog'
import { inCity } from '@/lib/present'
import { PRODUCT_RE } from '@/lib/products'
import { fmt } from '@/lib/money'
import type { HeroPhoto } from '../photos'

// min/max: «здебільшого» range. For whole-Ukraine pages whose price has an `index` category it is the price
// index's range (same numbers as /tsiny-2026); otherwise the range of this page's own price lines.
// price(key): the price index range for any category, e.g. c.price('corporate').
export type TopicCtx = { n: number; cities: number; min?: number; max?: number; median?: number; priceText?: string; place?: string; price: (key: string) => string }

export type TopicList = {
  title: string
  note?: string
  formats: Format[]
  // Alternative to formats for pages built on what studios make (products), not on tags.
  match?: (s: StudioCard) => boolean
  types?: string[]
  byCity?: boolean
  filter?: (s: StudioCard) => boolean
}

export type Topic = {
  path: string
  section: 'biz' | 'mk' | 'cert' | 'makers'
  parents: { label: string; href: string }[]
  crumb: string
  kicker: string
  h1: string
  metaTitle: (c: TopicCtx) => string
  metaDescription: (c: TopicCtx) => string
  lead: (c: TopicCtx) => string
  verse: string[]
  photo?: HeroPhoto
  ogImg?: string // site JPEG for the share card when it differs from the page photo
  ogTitle?: string // share-card title when the h1 carries a year
  ogSub: string // stable one-line description for the share card (no counts, prices or years)
  lists: TopicList[]
  evidence: RegExp
  // unit: only lines matching it count toward the «from–to» range (e.g. per person); unitLabel follows the range.
  price: { re: RegExp; exclude?: RegExp; unit?: RegExp; unitNot?: RegExp; unitLabel?: string; index?: string; title: string; note: string }
  sections: { kicker?: string; title: string; items: [string, string][] }[]
  faq: (c: TopicCtx) => { q: string; a: string }[]
  related: { label: string; href: string }[]
  form?: string
}

export const n = (k: number, forms: [string, string, string]) => `${fmt(k)} ${pluralUk(k, forms)}`
export const studios = (k: number) => n(k, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])
export const places = (k: number) => n(k, ['місце', 'місця', 'місць'])
export const inCities = (k: number) => `у ${fmt(k)} ${pluralUk(k, ['місті', 'містах', 'містах'])}`
export const where = (c: TopicCtx) => (c.place ? inCity(c.place) : inCities(c.cities))
export const priceRange = (c: TopicCtx) => c.priceText ?? ''

export const WORKSHOP = ['studio', 'school', 'maker', 'heritage', 'other']
// Makers of tableware (the logo page's second list): no cafés, no jewellery-only brands.
export const TABLEWARE = /посуд|чашк|горнят|кухл|тарілк|миск|піал|сервіз|чайник|глечик/iu
export const makesTableware = (s: StudioCard) => TABLEWARE.test(`${s.summary ?? ''} ${texts(s)}`) && !/кав.ярн|кафе(?!\p{L})|ресторан/iu.test(s.name)
export const MAKERS = ['studio', 'brand', 'maker', 'heritage']
export const CUPS = PRODUCT_RE.cups
export const DECOR = /(?<!\p{L})ваз(?!елін)|світильник|плитк|кахл|панно|кашпо|вазон/iu
// Price lines about classes, courses and services are not product prices.
export const CLASS_PRICE = /(?<!\p{L})мк(?!\p{L})|майстер-клас|занят|ліпк|ліплен|гончарств|курс|оренд|сертифікат|випал/iu
export const CLASS_PRICE_SETS = new RegExp(`${CLASS_PRICE.source}|(?<!\\p{L})сет(?!\\p{L})|набір|комплект|сервіз`, 'iu')

export const BIZ = [{ label: 'Головна', href: '/' }, { label: 'Для бізнесу', href: '/dlya-biznesu' }]
export const MK = [{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }]

export const mkCards = {
  after: ['Коли забрати виріб', 'Виріб має висохнути й пройти два випали — до поливи і після. Зазвичай це 2–4 тижні; деякі студії надсилають готове Новою поштою.'] as [string, string],
  ask: ['Що уточнити при записі', 'Чи входять у ціну випал і полива, скільки виробів можна зробити, скільки людей у групі і чи є безкоштовне перенесення.'] as [string, string],
}
