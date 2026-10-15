// Shared types and helpers for topic page configs. Lists come from studio format tags (scripts/tag-studios.ts);
// counts and prices are computed live, the text in the configs stays factual.
import type { Format, StudioCard } from '@/lib/catalog'
import { NO_TERM, pluralUk, texts } from '@/lib/catalog'
import { inCity } from '@/lib/present'
import { PRODUCT_RE } from '@/lib/products'
import { fmt } from '@/lib/money'
import type { HeroPhoto } from '../photos'

// min/max: «здебільшого» range. For whole-Ukraine pages whose price has an `index` category it is the price
// index's range (same numbers as /tsiny-2026); otherwise the range of this page's own price lines.
// price(key): the price index range for any category, e.g. c.price('corporate').
// priceStudios: set when priceText comes from this page's own studios (not the price index) — the caption then says so.
// n: entries the page's claim holds for (on a business page only the confirmed ones); more: the rest of its list.
// local: what the studios on the page say themselves (editorial/topics localFacts) — copy quotes it instead of «most studios».
export type TopicCtx = { n: number; more?: number; cities: number; min?: number; max?: number; median?: number; priceText?: string; priceStudios?: number; place?: string; price: (key: string) => string; local?: LocalFacts }

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
  // Business pages: who the page's claim is confirmed for (sourced fact, catalog.ts confirmedFor*). They come first under
  // `title`, and only they are counted in the title and lead; everyone else the lists pick goes below under `rest`, without
  // the claim («уточнимо у вашому запиті»). Owner, 15.10.2026. line: the words that show the claim in a studio's own lines,
  // so the card under `title` quotes the reason it is there (evidenceFor), not the first line of its price list.
  confirmed?: { test: (s: StudioCard) => boolean; line: RegExp; title: string; note: string; rest: { title: string; note: string } }
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

// ---------- facts from the studios' own texts (audit 15.10.2026, cause 6) ----------
// A city, format or certificate page says only what its own studios say: who sells certificates and on what terms, when a
// piece from a class is ready, who runs corporate classes. Each helper returns null when no studio says it, and the copy
// then leaves the sentence (or the question) out instead of falling back to «most studios».
export type LocalFacts = {
  certs: { name: string; valid: string | null; electronic: boolean }[]
  pickup: { name: string; text: string; weeks: [number, number]; unfired: boolean }[]
  corporate: string[]
  parties: string[] // children's birthday parties in the studio
  cowork: string[] // coworking or renting a wheel after a course
}

const joinUk = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} і ${xs.at(-1)}`)
/** «A, B і C»; past `max` names, «A, B, C і ще 4». */
export const nameList = (xs: string[], max = 5) => (xs.length <= max ? joinUk(xs) : `${xs.slice(0, max).join(', ')} і ще ${fmt(xs.length - max)}`)
/** The verb agrees with the count: «згадує Хаос», «згадують A і B». */
export const verb = (k: number, one: string, many: string) => (k === 1 ? one : many)
export const mentionedBy = (xs: string[]) => `${verb(xs.length, 'згадує', 'згадують')} ${nameList(xs)}`
/** After «з», «за прайсами»: «однієї студії», «3 студій». */
export const ofStudios = (k: number) => (k === 1 ? 'однієї студії' : n(k, ['студії', 'студій', 'студій']))
/** After «з»: «1 місця», «4 місць». */
export const ofPlaces = (k: number) => n(k, ['місця', 'місць', 'місць'])
const weeks = (a: number, b: number) => (a === b ? n(a, ['тиждень', 'тижні', 'тижнів']) : `${a}–${b} ${pluralUk(b, ['тиждень', 'тижні', 'тижнів'])}`)

/** When pieces are ready on this page: the span over the studios that say it and up to four of their own phrases. */
export function pickupFacts(f?: LocalFacts): { span: string; by: string; many: boolean; examples: string } | null {
  const fired = (f?.pickup ?? []).filter((p) => !p.unfired)
  if (!fired.length) return null
  const lo = Math.max(1, Math.round(Math.min(...fired.map((p) => p.weeks[0]))))
  const hi = Math.max(lo, Math.round(Math.max(...fired.map((p) => p.weeks[1]))))
  return {
    span: weeks(lo, hi),
    many: fired.length > 2,
    by: fired.length > 2 ? `за профілями ${ofStudios(fired.length)}` : joinUk(fired.map((p) => p.name)),
    examples: nameList(f!.pickup.slice(0, 4).map((p) => `${p.name} — ${p.text}${p.unfired ? ' (без випалу)' : ''}`), 4),
  }
}
/** « Готові вироби забирають через 3–5 тижнів (за профілями 6 студій).» or ''. */
export const pickupLead = (c: TopicCtx) => {
  const p = pickupFacts(c.local)
  return p ? ` Готові вироби забирають через ${p.span} (${p.by}).` : ''
}
/** The FAQ answer on when to collect a piece, from the page's studios; null leaves the question out. */
export const pickupAnswer = (f?: LocalFacts) => {
  const p = pickupFacts(f)
  return p ? `${p.many ? `${p.by[0].toUpperCase()}${p.by.slice(1)} — ${p.span}. ` : ''}Як пишуть самі студії: ${p.examples}. Виріб має висохнути й пройти випал, тому термін залежить від студії.` : null
}

/** Who on the page mentions gift certificates: «Так: сертифікати згадують 3 з 8 місць — A, B і C.» or null. */
export const certAnswer = (c: TopicCtx) => {
  const certs = c.local?.certs ?? []
  return certs.length ? `Сертифікати ${verb(certs.length, 'згадує', 'згадують')} ${fmt(certs.length)} з ${ofPlaces(c.n)} цієї сторінки: ${nameList(certs.map((x) => x.name))}. Суми й умови — у профілях.` : null
}
const termOf = (valid: string) => (valid === NO_TERM ? 'без терміну дії' : valid)
/** Certificate terms the studios state: «Термін дії вказують 2 з 3 місць: Хаос — 2 місяці і KUST — без терміну дії»;
 *  null if none. */
export const certTerms = (c: TopicCtx) => {
  const named = (c.local?.certs ?? []).filter((x) => x.valid)
  return named.length ? `Термін дії ${verb(named.length, 'вказує', 'вказують')} ${fmt(named.length)} з ${ofPlaces(c.n)}: ${nameList(named.map((x) => `${x.name} — ${termOf(x.valid!)}`), 4)}` : null
}
/** Who says the certificate comes by email or messenger («згадує Хаос»); null if no one. */
export const certOnline = (c: TopicCtx) => {
  const online = (c.local?.certs ?? []).filter((x) => x.electronic)
  return online.length ? mentionedBy(online.map((x) => x.name)) : null
}
/** The page's price as its studios give it: «здебільшого …» only over five or more studios or the price index, else
 *  the exact prices with how many studios they come from («850 і 950 грн (за прайсами 2 студій)»). */
export const mostly = (c: TopicCtx) =>
  !c.priceText ? '' : c.priceStudios && c.priceStudios < 5 ? `${c.priceText} (${verb(c.priceStudios, 'за прайсом', 'за прайсами')} ${ofStudios(c.priceStudios)})` : `здебільшого ${c.priceText}`

/** Who on the page runs corporate classes («згадують A і B»); null if no one says so. */
export const corporateNames = (c: TopicCtx) => (c.local?.corporate.length ? mentionedBy(c.local.corporate) : null)

export const BIZ = [{ label: 'Головна', href: '/' }, { label: 'Для бізнесу', href: '/dlya-biznesu' }]
export const MK = [{ label: 'Головна', href: '/' }, { label: 'Майстер-класи', href: '/maister-klasy' }]

export const mkCards = {
  after: ['Коли забрати виріб', 'Виріб має висохнути й пройти два випали — до поливи і після, тож термін кожна студія називає свій. Деякі надсилають готове Новою поштою.'] as [string, string],
  ask: ['Що уточнити при записі', 'Чи входять у ціну випал і полива, скільки виробів можна зробити, скільки людей у групі і чи є безкоштовне перенесення.'] as [string, string],
}
