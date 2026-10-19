import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import type { City, Studio } from '@/types/catalog'
import { OBLAST_CENTRES } from '@/shared/options'
import { cleanAddress, cleanPublic } from './present'
import { wholeAmountsIn } from './money'
import { loadItemPhotos, loadPublicCities, loadPublicPhotos, loadPublicStudios } from '@/server/publicCatalog'

// Read-only data layer for public pages. Pages are pre-rendered HTML; they re-render only after a write
// (revalidateTag('studios')) or the page's daily refresh, and then read the catalogue from the data cache.

export const TYPE_LABEL: Record<string, string> = {
  studio: 'Студія',
  brand: 'Бренд',
  maker: 'Майстер',
  school: 'Школа',
  shop: 'Магазин',
  supplier: 'Постачальник',
  heritage: 'Традиційна майстерня',
  legacy: 'Спадщина',
  other: 'Інше',
}

// unverified: the research found no sign of activity after 2022 and says so (or work is suspended), or marked the
// status unclear or relocated (museums and memorial pages aside), with no fresher Instagram evidence. Such a studio keeps its profile (with its data date
// and no request form) but is left out of every list, count and map.
export type StudioCard = Studio & { cityDoc: City | null; unverified?: boolean }

// The data cache holds studios in SHARDS parts (by id) and cities apart, joined per request: Next caps one entry at
// 2 MB (fixed in Next; over it, production silently stops caching and dev throws), and the whole catalogue was
// already at 77% in one entry. No timer: entries change only when a write calls revalidateTag('studios').
const SHARDS = 4
const TAGS = ['studios']
// The build reads the database (Dockerfile); fewer studios than this means it read the wrong one or none,
// and an empty catalogue must never be pre-rendered and shipped.
const MIN_BUILD_STUDIOS = 100

type CachedStudio = Studio & { unverified: boolean; order: number }
const loadShard = async (index: number): Promise<CachedStudio[]> =>
  (await loadPublicStudios({ index, of: SHARDS })).map((s) => ({ ...publicText(s), order: s.order, unverified: isUnverified(s) }))

const joinCatalog = async (shard: (i: number) => Promise<CachedStudio[]>, cityList: () => Promise<City[]>): Promise<StudioCard[]> => {
  const [parts, cities] = await Promise.all([Promise.all(Array.from({ length: SHARDS }, (_, i) => shard(i))), cityList()])
  const byId = new Map(cities.map((c) => [c.id, c]))
  const out = parts
    .flat()
    .sort((a, b) => a.order - b.order)
    .map(({ order: _, ...s }) => ({ ...s, cityDoc: byId.get(s.city as number) ?? null }))
  if (process.env.NEXT_PHASE === 'phase-production-build' && out.length < MIN_BUILD_STUDIOS)
    throw new Error(`Build read ${out.length} public studios (expected ≥ ${MIN_BUILD_STUDIOS}): check DATABASE_URL for the build.`)
  return out
}

// Scripts (tsx …) have no Next data cache: HLYNA_SCRIPT=1 reads the database directly,
// so build scripts see exactly what the pages see.
let scriptLoad: Promise<StudioCard[]> | null = null
const cachedShard = unstable_cache(loadShard, ['studios-shard-v2'], { revalidate: false, tags: TAGS })
const cachedCities = unstable_cache(loadPublicCities, ['cities-v1'], { revalidate: false, tags: TAGS })
/** Every city row, with or without published studios (old URLs of towns whose page went). */
export const getCities = cache(() => (process.env.HLYNA_SCRIPT === '1' ? loadPublicCities() : cachedCities()))
// Outside a React render (route handlers: catalog-sitemap.xml, llms.txt, /poshuk/index.json) `cache` below does not
// memoize, and those builds ask for the catalogue hundreds of times (once per city × format). The joined catalogue is
// kept for a few seconds per process; a write's revalidateTag is seen at most that much later. Nothing mutates it.
const JOIN_TTL = 5000
let joined: { at: number; list: Promise<StudioCard[]> } | null = null
const sharedJoin = () => {
  if (!joined || Date.now() - joined.at > JOIN_TTL) {
    joined = { at: Date.now(), list: joinCatalog(cachedShard, cachedCities) }
    joined.list.catch(() => (joined = null))
  }
  return joined.list
}
const loadStudios = process.env.HLYNA_SCRIPT === '1' ? () => (scriptLoad ??= joinCatalog(loadShard, loadPublicCities)) : sharedJoin

// Research annotations stay in the database (the panel shows them) but never reach public pages.
const cleanList = <T extends { text: string }>(xs?: T[] | null) => (xs ?? []).map((x) => ({ ...x, text: cleanPublic(x.text) })).filter((x) => x.text)
const publicText = (s: Studio): Studio => ({
  ...s,
  summary: cleanPublic(s.summary),
  publicDescription: cleanPublic(s.publicDescription),
  description: cleanPublic(s.description),
  recentNote: cleanPublic(s.recentNote),
  address: cleanAddress(s.address),
  services: cleanList(s.services),
  products: cleanList(s.products),
  prices: cleanList(s.prices),
})

const DOUBT = /актуальн\p{L}*[^.!?]{0,60}не підтвердж|не підтвердж\p{L}*[^.!?]{0,30}актуальн|роботу призупинено|тимчасово (?:закрит|не працює)|більше не працює|статус[^.!?]{0,40}не підтвердж|актуальн\p{L}* активн\p{L}*[^.!?]{0,30}не підтвердж/iu
const FRESH_SINCE = '2025-01-01'
function isUnverified(s: Studio): boolean {
  if (s.status === 'closed') return false // handled separately
  const fresh = (s.activity?.lastPostDate ?? '') >= FRESH_SINCE
  return !fresh && ((s.type !== 'legacy' && (s.status === 'unclear' || s.status === 'relocated')) || DOUBT.test([s.publicDescription, s.description, s.summary].filter(Boolean).join(' ')))
}

/** Every published record, including closed and unverified ones (profiles and the sitemap). */
export const getCatalog = cache(loadStudios)

/** The same records read from the database, past the data cache: for src/proxy.ts, which runs outside a page render. */
export const loadCatalogUncached = () => joinCatalog(loadShard, loadPublicCities)

/** Universities, academies, departments and colleges teach ceramics but are not studios (owner, 16.10.2026): profile only, out of studio lists and counts. */
const ACADEMIC = /університет|академі[яї]|кафедр|факультет|інститут|коледж|ліцей|училищ/iu
export const isAcademic = (s: { name?: string | null }) => ACADEMIC.test(s.name ?? '')
/** Shops, galleries, «Спадщина» (museums, traditions, memory of masters) and academies are in the catalogue but are not studios: lists, counts and search about studios leave them out. */
export const isStudio = (s: { type?: string | null; name?: string | null }) => s.type !== 'shop' && s.type !== 'legacy' && !isAcademic(s)

/** Not closed and not unverified: the records lists may show. */
export const isOpen = (s: Pick<StudioCard, 'status' | 'unverified'>) => s.status !== 'closed' && !s.unverified

// Lists derived from the joined catalogue are kept with it (by its array): outside a render (see sharedJoin) they would
// otherwise be refiltered on every call, and so would everything built on them (the price index).
const fromCatalog = <T>(derive: (all: StudioCard[]) => T) => {
  const kept = new WeakMap<StudioCard[], T>()
  return cache(async () => {
    const all = await getCatalog()
    if (!kept.has(all)) kept.set(all, derive(all))
    return kept.get(all)!
  })
}

/** Open records of every kind, shops included: for the pages where shops belong. */
export const getAllWithShops = fromCatalog((all) => all.filter(isOpen))

/** What lists, counts, the map and the price index use: open studios and makers, no shops. */
export const getAllStudios = fromCatalog((all) => all.filter(isOpen).filter(isStudio))

/** Open shops and galleries only. */
export const getShops = fromCatalog((all) => all.filter(isOpen).filter((s) => s.type === 'shop'))

/** Open museums, traditions and memorial pages only. */
export const getLegacy = fromCatalog((all) => all.filter(isOpen).filter((s) => s.type === 'legacy'))

/** Open universities, academies and colleges (a block of their own on a city page). */
export const getAcademies = fromCatalog((all) => all.filter(isOpen).filter((s) => s.type !== 'shop' && s.type !== 'legacy' && isAcademic(s)))

export const getStudioBySlug = cache(async (slug: string) => (await getCatalog()).find((s) => s.slug === slug) ?? null)

export type StudioPhoto = { url: string; full: string; alt: string; width: number; height: number; focalY: number | null }

// Published photos of one studio (owner uploads, shown only with photo consent). Separate from the catalogue
// query so the big cached list stays small.
export const getStudioPhotos = unstable_cache(
  async (id: number): Promise<StudioPhoto[]> => {
    return loadPublicPhotos(id)
  },
  ['studio-photos-v3'],
  { revalidate: false, tags: TAGS },
)

// A collection item's own photos (TopItem.photos), refreshed with the catalogue (consent or media changes).
export const getItemPhotos = unstable_cache(async (slug: string, shas: string[]): Promise<StudioPhoto[]> => loadItemPhotos(slug, shas), ['item-photos-v1'], {
  revalidate: false,
  tags: TAGS,
})

export const texts = (s: Studio) =>
  [s.description, ...(s.services ?? []).map((x) => x.text), ...(s.products ?? []).map((x) => x.text), ...(s.prices ?? []).map((x) => x.text)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

// A studio's own sentences (description, offers, prices): what the city and format pages quote instead of a «most studios»
// claim.
const ownSentences = (s: Studio) =>
  [s.publicDescription, s.description, ...(s.services ?? []).map((x) => x.text), ...(s.prices ?? []).map((x) => x.text)]
    .filter(Boolean)
    .flatMap((t) => t!.split(/(?<=[.!?;])\s+/))

// Gift certificates as the studio's own texts state them (offers, prices, description), not the format tag: the FAQ of a
// city page names who sells them, for how long one is valid (or that it has no term) and whether it comes by email.
const CERT = /сертифікат/iu
const NOT_GIFT_CERT = /сертифікат\p{L}* (?:якості|відповідності)|сертифікован/iu
const CERT_VALID = /(?:дійсн\p{L}*|ді[єюя]\p{L}*|термін\p{L}*(?: дії)?)\D{0,20}?(\d{1,2})\s*(міс|рок|рік)/iu
const CERT_FOREVER = /без\s+термін|безстроков|необмежен/iu
// Electronic only when the certificate itself is: «електронний сертифікат», «паперовий або електронний», PDF, sent by
// e-mail or messenger. Paying online («оплатити онлайн») is not.
const CERT_ONLINE = /електронн\p{L}*\s+(?:сертифікат|вигляд|формат|варіант)|сертифікат\p{L}*[^.;]{0,60}?електронн|(?<!\p{L})pdf(?!\p{L})|(?:на|в|у)\s+(?:пошту|e-?mail|месенджер|телеграм|telegram|вайбер|viber)(?!\p{L})/iu
export const NO_TERM = 'без терміну'
export function giftCertificate(s: Studio): { valid: string | null; electronic: boolean } | null {
  const sentences = ownSentences(s).filter((t) => CERT.test(t) && !NOT_GIFT_CERT.test(t))
  if (!sentences.length) return null
  const electronic = sentences.some((t) => CERT_ONLINE.test(t))
  const m = sentences.map((t) => t.match(CERT_VALID)).find(Boolean)
  if (!m) return { valid: sentences.some((t) => CERT_FOREVER.test(t)) ? NO_TERM : null, electronic }
  const n = Number(m[1])
  return { valid: `${n} ${m[2].toLowerCase() === 'міс' ? pluralUk(n, ['місяць', 'місяці', 'місяців']) : pluralUk(n, ['рік', 'роки', 'років'])}`, electronic }
}
/** «дійсний 3 місяці» / «без терміну дії», for a list of who sells certificates. */
export const certTerm = (c: { valid: string | null }) => (c.valid === NO_TERM ? 'без терміну дії' : c.valid ? `дійсний ${c.valid}` : null)

// When a piece from a class can be collected, as the studio's own sentence says it («забирають через 3–4 тижні», «готові за
// п'ять тижнів»): the phrase as written and its span in weeks. Coworking, subscriptions, courses, a glazing visit and orders
// are other terms.
const PICKUP = /забира|забрати|забер|віддают|видают|готов|отрима/iu
// A course or a programme runs «за 2 місяці»: that is how long it lasts, not when a piece is ready.
const NOT_PICKUP = /коворк|абонемент|виготовлен|сертифікат|візит|замовлен|(?<!\p{L})курс|\d+\s*занят|програм|навчан/iu
const NUM_WORDS: Record<string, number> = { один: 1, одного: 1, два: 2, двох: 2, три: 3, трьох: 3, чотири: 4, чотирьох: 4, пять: 5, шість: 6, півтора: 1.5, півтори: 1.5 }
const SPAN = /(?:через|за|займа\p{L}*)\s+(?:приблизно\s+|близько\s+)?(\d+(?:[.,]\d)?(?:\s*[–-]\s*\d+(?:[.,]\d)?)?|один|одного|два|двох|три|трьох|чотири|чотирьох|п.ять|шість|півтора|півтори)\s+(тиж\p{L}*|дн\p{L}*|міс\p{L}*)/giu
export function pickupTime(s: Studio): { text: string; weeks: [number, number]; unfired: boolean } | null {
  for (const t of ownSentences(s)) {
    if (!PICKUP.test(t) || NOT_PICKUP.test(t)) continue
    const m = [...t.matchAll(SPAN)].at(-1)
    if (!m) continue
    const per = /^дн/iu.test(m[2]) ? 1 / 7 : /^міс/iu.test(m[2]) ? 4.3 : 1
    const nums = m[1].split(/\s*[–-]\s*/).map((x) => NUM_WORDS[x.toLowerCase().replace(/\P{L}/gu, '')] ?? Number(x.replace(',', '.')))
    if (nums.some((x) => !x)) continue
    return { text: `${m[1].replace(/\s*[–-]\s*/, '–')} ${m[2]}`, weeks: [nums[0] * per, (nums[1] ?? nums[0]) * per], unfired: /не випалю|без випалу/iu.test(t) }
  }
  return null
}

export type Format = NonNullable<Studio['formats']>[number]

// Format tags come from scripts/tag-studios.ts (and admin edits); the regexes below are a fallback for untagged studios.
export const hasFormat = (s: Studio, f: Format) => Boolean(s.formats?.includes(f))

// Master-class places come from format tags only (scripts/tag-studios.ts). Studios and schools need any
// class tag; makers and brands need a class-specific tag or a class word next to a technique tag, so an
// artist who simply paints ceramics is not listed as a place to take a class. Shops and academic
// departments are never listed.
const CLASS_TAGS: Format[] = ['wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop']
const CLASS_ONLY_TAGS: Format[] = ['kids', 'couples', 'courses', 'corporate-workshop']
const CLASS_WORDS = /майстер-клас|(?<!\p{L})мк(?!\p{L})|заняття|урок|навчан|гурт[оі]к/iu

// A school whose course is for one group only («Гончарство в темряві»: ветерани, які втратили зір) is not a place anyone books a class.
const closedGroup = (s: Studio) => s.type === 'school' && /для ветеранів, які втратили зір/iu.test(s.summary ?? '')

export const offersMasterClasses = (s: Studio) => {
  if (isAcademic(s) || closedGroup(s)) return false
  if (s.type === 'studio' || s.type === 'school') return CLASS_TAGS.some((f) => hasFormat(s, f)) || CLASS_WORDS.test(texts(s))
  if (!s.formats?.length) return false
  if (s.type === 'shop' || s.type === 'supplier') return false
  return CLASS_ONLY_TAGS.some((f) => hasFormat(s, f)) || (CLASS_TAGS.some((f) => hasFormat(s, f)) && CLASS_WORDS.test(texts(s)))
}

const MAKER_TYPES = new Set(['studio', 'brand', 'maker', 'school'])

// Business claims («працює із закладами», «з логотипом», «корпоративні замовлення», «проводить корпоративи») come from
// sourced facts only: the b2b fields (filled from sources, scripts/app/edits/2026-10-15-b2b.json) or the studio's own
// offer, product and price lines. Format tags only pick who may sit lower on a business page, under «уточнимо в запиті».
// Every list, count, badge and map filter that makes the claim uses these (audit 15.10.2026, cause 3).
const ownLines = (s: Studio) => [...(s.services ?? []), ...(s.products ?? []), ...(s.prices ?? [])].map((x) => x.text).join('\n')
const LOGO_LINE = /логотип|персоналізован/iu
const COMPANY_LINE = /корпоративн\p{L}* (?:подарун|замовлен)|подарунк\p{L}* (?:для )?(?:співробітник|партнер|клієнт|компан)|брендован/iu
const WORKSHOP_LINE = /корпоратив|тімбілд|тимбілд|для (?:команд|компан|колектив)/iu
export const confirmedForVenues = (s: Studio) => MAKER_TYPES.has(s.type ?? '') && Boolean(s.b2b?.worksWithHoreca)
export const confirmedForLogo = (s: Studio) => MAKER_TYPES.has(s.type ?? '') && (Boolean(s.b2b?.logoMethods?.length) || LOGO_LINE.test(ownLines(s)))
export const confirmedForCompanies = (s: Studio) => Boolean(s.b2b?.worksWithCorporate) || confirmedForLogo(s) || COMPANY_LINE.test(ownLines(s))
export const runsCorporateWorkshops = (s: Studio) => WORKSHOP_LINE.test(ownLines(s))
// The words that show each claim in a studio's own lines: a business page's card quotes such a line (editorial/topics
// evidenceFor). Venues are confirmed by a b2b field; their words are lines made for venues («для закладів», HoReCa,
// restaurants, chefs), not a café that merely stocks the studio's cups.
export const CLAIM_WORDS = {
  venues: /horeca|хорека|ресторан|шеф|для\s+(?:\p{L}+\s+)?(?:заклад|кав.ярн|кафе|готел|бар)/iu,
  logo: LOGO_LINE,
  companies: new RegExp(`${COMPANY_LINE.source}|${LOGO_LINE.source}|корпоратив|для (?:компан|бізнес)|брендув`, 'iu'),
  workshops: WORKSHOP_LINE,
}

// Hryvnia amounts mentioned in a studio's price lines (used for honest "from–to" ranges).
export const hryvniaAmounts = (s: Studio): number[] => (s.prices ?? []).flatMap((p) => wholeAmountsIn(p.text))

export type CityGroup = { city: City; studios: StudioCard[] }

export function groupByCity(studios: StudioCard[]): CityGroup[] {
  const map = new Map<string, CityGroup>()
  for (const s of studios) {
    if (!s.cityDoc?.slug) continue
    const g = map.get(s.cityDoc.slug) ?? { city: s.cityDoc, studios: [] }
    g.studios.push(s)
    map.set(s.cityDoc.slug, g)
  }
  return [...map.values()].sort((a, b) => b.studios.length - a.studios.length)
}

/** The slug of the oblast centre whose page lists this city (a centre's own slug for the centre), or null. */
export const centreOf = (c?: Pick<City, 'oblast'> | null) => (c?.oblast ? (OBLAST_CENTRES[c.oblast] ?? null) : null)

/** A city page: the city's entries, or on an oblast centre's page the whole oblast (`towns`: the other settlements, largest first). */
export type CityPage = CityGroup & { towns: CityGroup[] }

/**
 * Which cities get a page for this list (owner, 15.10.2026). An oblast centre with at least one entry gets a page for the
 * whole oblast («Тернопіль і область»: the centre first, then every other town or village with its name), even with one or
 * two entries: people search by their oblast centre. Any other town or village keeps its own page with at least MIN_LIST
 * entries, and is on its centre's page as well. Entries of an oblast whose centre has none, or of a city without an oblast,
 * are on no city page (the index lists them by name).
 */
export function cityPages(studios: StudioCard[]): CityPage[] {
  const groups = groupByCity(studios)
  const pages: CityPage[] = []
  for (const g of groups) {
    const centre = centreOf(g.city)
    if (centre === g.city.slug) {
      const towns = groups.filter((t) => t !== g && centreOf(t.city) === centre)
      pages.push({ city: g.city, studios: [...g.studios, ...towns.flatMap((t) => t.studios)], towns })
    } else if (g.studios.length >= MIN_LIST) pages.push({ ...g, towns: [] })
  }
  return pages.sort((a, b) => b.studios.length - a.studios.length)
}

/** Slugs of every city some page lists (its own page or its centre's): the rest go to an index's «Ще міста і села». */
export const onPages = (pages: CityPage[]) => new Set(pages.flatMap((p) => [p.city.slug, ...p.towns.map((t) => t.city.slug)]))

export const cityPage = (studios: StudioCard[], slug: string) => cityPages(studios).find((p) => p.city.slug === slug) ?? null

/** Newest updatedAt among studios (page dateModified / sitemap lastmod). */
export const latestUpdate = (xs: { updatedAt?: string | null }[]) => xs.reduce<string | null>((m, x) => (x.updatedAt && (!m || x.updatedAt > m) ? x.updatedAt : m), null)

export const MIN_LIST = 3 // no thin pages: a list needs at least 3 real entries (AGENTS.md; oblast centres' pages excepted, cityPages)

export const igHandle = (url?: string | null) => url?.replace(/\/$/, '').split('/').pop() ?? ''

// Ukrainian plural: pluralUk(5, ['місце', 'місця', 'місць']) → 'місць'
export function pluralUk(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
