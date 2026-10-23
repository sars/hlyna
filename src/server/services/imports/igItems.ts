import { slugifyUk } from '../../../lib/transliterateUk'
import { ITEM_SEASON_END, type ITEM_CATEGORIES } from '../../../shared/options'
import { INSTAGRAM_POST_RE } from '../../../shared/schemas'
import type { ItemDraft } from '../items'

// Verified Instagram scans (09_instagram/<topic>/verified*.jsonl) → item drafts. The scans already hold our own words
// (details, photo_fact) and the studio's terms; this file only reads dates, prices, kind, availability and category from them.

type Category = (typeof ITEM_CATEGORIES)[number]

export type ScanItem = {
  title: string
  price?: string
  details?: string
  terms?: string
  seen?: string
  evidence?: string[]
  embed?: string | null
  href?: string | null
  check?: string
  photo_fact?: string
  kind?: string
  slug?: string | null
}
export type ScanRow = { slug?: string | null; handle?: string | null; href?: string | null; items?: ScanItem[] }

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const IG_EPOCH_MS = 1314220021721n

/** The day (UTC) an Instagram post was published, from its code: the media id carries a millisecond timestamp in its top bits. */
export function postDate(code: string): string | null {
  if (!/^[\w-]{11}/.test(code)) return null
  let id = 0n
  for (const ch of code.slice(0, 11)) id = id * 64n + BigInt(CODE_ALPHABET.indexOf(ch))
  return new Date(Number((id >> 23n) + IG_EPOCH_MS)).toISOString().slice(0, 10)
}

const postCode = (url?: string | null) => url?.match(/instagram\.com\/(?:p|reel)\/([\w-]+)/)?.[1] ?? null

/** Dates written in the text as dd.mm.yyyy, as ISO days. */
const textDates = (s: string) => [...s.matchAll(/(\d{2})\.(\d{2})\.(20\d\d)/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`)

/** Hryvnia amounts in a price line («900 грн», «190–445 грн», «від 7 500 грн»); sizes and volumes are not followed by грн. */
export function uahRange(s?: string | null): { min: number; max: number } | null {
  const n: number[] = []
  for (const m of (s ?? '').matchAll(/(\d[\d  ]*\d|\d)(?:\s*[–-]\s*(\d[\d  ]*\d|\d))?\s*(?:грн|₴)/g)) {
    for (const g of [m[1], m[2]]) if (g) n.push(Number(g.replace(/[  ]/g, '')))
  }
  return n.length ? { min: Math.min(...n), max: Math.max(...n) } : null
}

// Order matters: «підставка для прикрас» is decor, not jewellery; a set «тарілка, чашки» goes where the cups are.
const CATEGORY_RULES: [Category, RegExp][] = [
  ['svichky', /свічка|свічки|аромасвічк/i],
  ['vazy-i-dekor', /для прикрас|ялинков|іграшк|дзвоник|магніт|свічник/i],
  ['svitylnyky', /світильник|ламп|бра\b|абажур/i],
  ['plytka-i-panno', /плитк|панно|кахл/i],
  ['prykrasy', /кулон|сереж|намист|брош|підвіск|каф\b|браслет|прикраса|камінчик/i],
  ['chashky', /чашк|чашечк|горнят|кухл|стакан|еспресо/i],
  ['tarilky-i-mysky', /тарілк|тарілочк|миск|піал|блюд|цукерниц|тертк/i],
  ['vazy-i-dekor', /ваз|гарбуз|попільничк|скриньк|декор|птах|фігурк|баран/i],
]
/** Scan kinds that are not items for sale: finished interiors and fixtures shown as examples of work. */
const NOT_FOR_SALE = new Set(['project', 'fixtures'])

export const categoryOf = (title: string, details = '') =>
  CATEGORY_RULES.find(([, re]) => re.test(title))?.[0] ?? CATEGORY_RULES.find(([, re]) => re.test(details))?.[0] ?? null

const IN_STOCK = /(?:у|в) наявност|«наявн|наявне|є в наявност|з наявност|останні|кілька є|штуки на|розпродаж|доступн\S* для купівлі/i
const TO_ORDER = /на замовлення|під замовлення|індивідуальн/i
const ONE_OFF = /єдин\S* екземпляр|одиничн/i

function kindAndAvailability(title: string, terms: string) {
  if (TO_ORDER.test(title)) return { kind: 'to_order' as const, availability: 'to_order' as const }
  if (IN_STOCK.test(terms)) return { kind: ONE_OFF.test(terms) ? ('piece' as const) : ('series' as const), availability: 'in_stock' as const }
  if (ONE_OFF.test(terms)) return { kind: 'piece' as const, availability: 'unknown' as const }
  if (TO_ORDER.test(terms)) return { kind: 'to_order' as const, availability: 'to_order' as const }
  return { kind: 'series' as const, availability: 'unknown' as const }
}

/** First day a seasonal item is hidden: the season's end on or after the base day. */
export function seasonEnd(occasion: keyof typeof ITEM_SEASON_END, base: string) {
  const year = Number(base.slice(0, 4))
  const end = `${year}-${ITEM_SEASON_END[occasion]}`
  return end > base ? end : `${year + 1}-${ITEM_SEASON_END[occasion]}`
}

export type Skip = { skip: string }

/** One scanned item → a draft (or why it is skipped). `topic` is the scan folder: halloween, interior, souvenirs. */
export function draftFromScan(row: ScanRow, it: ScanItem, topic: string, today: string): (ItemDraft & { sourceKey: string }) | Skip {
  if (it.kind && NOT_FOR_SALE.has(it.kind)) return { skip: `not for sale (${it.kind})` }
  const category = categoryOf(it.title, it.details)
  if (!category) return { skip: 'no category' }
  const embed = it.embed && INSTAGRAM_POST_RE.test(it.embed) ? it.embed : null
  const code = postCode(embed)
  const postedAt = code ? postDate(code) : null
  const terms = it.terms ?? ''
  const dated = [postedAt, ...textDates(`${terms} ${it.seen ?? ''}`)].filter((d): d is string => Boolean(d) && d! <= today).sort()
  const confirmedAt = dated.at(-1) ?? null
  const { kind, availability } = kindAndAvailability(it.title, terms)
  const occasion = topic === 'halloween' ? ('halloween' as const) : /ялинков|різдв/i.test(it.title) ? ('xmas' as const) : null
  const base = postedAt ?? confirmedAt
  const price = uahRange(it.price)
  const handle = row.handle?.replace(/^@/, '')
  return {
    sourceKey: `${code ?? 'hl'}:${slugifyUk(it.title, 40)}`,
    source: 'instagram',
    sourceUrl: embed ?? it.href ?? row.href ?? (handle ? `https://www.instagram.com/${handle}/` : ''),
    postedAt,
    title: it.title,
    category,
    occasion,
    seasonEnds: occasion && base ? seasonEnd(occasion, base) : null,
    kind,
    priceText: it.price?.trim() || null,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    availability,
    availabilityText: terms || null,
    confirmedAt,
    description: it.details?.trim() || null,
    photoFact: it.photo_fact?.trim() || null,
    terms: terms || null,
    embed,
    sourceGone: false,
    evidence: { scan: topic, seen: it.seen ?? null, check: it.check ?? null, files: it.evidence ?? [] },
  }
}
