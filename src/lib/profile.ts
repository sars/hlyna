// Studio profile helpers: which request form a profile opens on, and how its price list and offer lists are tidied.
import { hasFormat, offersMasterClasses, type StudioCard as Card } from '@/lib/catalog'
import { isExhibitingOnly, type PriceLine } from '@/lib/present'

// The request form opens on what this studio is known for.
export function formFor(s: Card): string {
  if (hasFormat(s, 'logo')) return 'logo-mugs'
  if (hasFormat(s, 'horeca')) return 'tableware'
  if (hasFormat(s, 'corporate-gifts')) return 'corporate-gifts'
  if (offersMasterClasses(s)) return 'master-class'
  if (hasFormat(s, 'corporate-workshop')) return 'corporate-workshop'
  return 'other'
}

/** Who can take a request (owner, 15.10.2026): an open studio, brand or maker with a live channel. Shops sell finished
 *  work, schools and clubs enrol through their own office, heritage pages have nobody to answer, closed and inactive
 *  ones (unverified: unclear or relocated without a fresh post) would not reply, and a profile without Instagram, site,
 *  phone, e-mail or Facebook would send the request nowhere. */
export function acceptsRequests(s: Card): boolean {
  if (s.status === 'closed' || s.unverified || isExhibitingOnly(s)) return false
  if (s.type === 'shop' || s.type === 'school' || s.type === 'supplier') return false
  return Boolean(s.instagram || s.website || s.facebook || s.phone || s.email)
}

// ---------- «Вироби» and «Послуги» ----------

// Research items carry where and when they were seen: «… (Instagram, 03.2025)», «(за видачею пошуку)»,
// «(Paint & Pottery Studio за TripAdvisor)», «(хайлайт «Фарфор»)». The profile shows the fact, not the note;
// a fact seen before 2025 keeps its year, so it does not read as current.
const ITEM_SOURCE = /\s*\((?:[^()]*?(?:instagram|facebook|tiktok|telegram|сайт|bodo|tripadvisor|google)[^()]*?(?:\d{1,2}\.)?(?:19|20)\d\d[^()]*|[^()]*(?<!\p{L})(?:за\s+(?:видач|list\.|tripadvisor|google|повідомл|назвами|даними|інформац)|згадк\p{L}*\s)[^()]*|\s*хайлайт[^()]*)\)/giu
// Items that are schedules, opening hours or directions go stale; contacts belong in «Коротко».
const ITEM_NOTE = /^\s*(?:розклад|графік(?!\p{L})|режим роботи|контакти|як знайти|ціни (?:станом|на .{0,40}оновлено)|на сертифікаті вказано)/iu
const CONTACT = /станом на \d|\+?38\s*\(?0\d|(?<!\d)0\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)|[\w.-]+@[\w-]+\.\w+/iu

/** One «Вироби» or «Послуги» item as a visitor reads it, or '' when it is a research note. */
export function offerItem(text: string): string {
  if (ITEM_NOTE.test(text)) return ''
  const kept = text
    .replace(ITEM_SOURCE, (m) => {
      const year = Number(m.match(/(?:19|20)\d\d/)?.[0])
      return year && year < 2025 ? ` (${year})` : ''
    })
    .split(/\s*;\s*/)
    .filter((part) => !CONTACT.test(part))
  return kept.join('; ').replace(/\s+([,.;)])/g, '$1').trim()
}

// ---------- prices ----------

// Price lines grouped the way people read a price list. Tested in this order: a certificate for a class is a
// certificate, a course with a coworking day is a course, «МК» with a duration is a class.
const GROUPS: [string, RegExp][] = [
  ['Сертифікати', /сертифікат/iu],
  ['Коворкінг і послуги', /^\s*(?:керамічн\p{L}* )?коворк|^\s*(?:оренд|полиц)|^\s*(?:бісквітн\p{L}*|глазурн\p{L}*|утильн\p{L}*|повн\p{L}*)?\s*випал|^\s*полива й випал|^\s*(?:сесія|заняття з)?\s*глазуруванн|консультац|фотосесі|зйомк|^\s*(?:творчий простір|відкрита студія)|глина\s+\d/iu],
  ['Для компаній', /корпоратив|тімбілд|тимбілд|для компан|для команд|груп\p{L}*\s+(?:від|до)\s+[1-9]\d|оптов|гурт(?!\p{L}*\s+з)/iu],
  ['Курси й навчання', /курс|абонемент|\d+\s*занять|навчанн|щомісяч/iu],
  ['Майстер-класи', /(?<!\p{L})мк(?!\p{L})|майстер-клас|заняття|урок|побачен|для двох|гончарств|ліплен|ліпк|розпис|гончарн\p{L}* (?:кол|круг)|\d\s*(?:год|хв)(?!\p{L})/iu],
  ['Знижки', /^\s*знижк/iu],
]
const OTHER_GROUP = 'Вироби'
// Prices from before 2025 move to the end when the studio has newer ones (visible, but last).
const OLD_GROUP = 'Старші ціни (до 2025 року)'
const ORDER = ['Майстер-класи', 'Курси й навчання', 'Для компаній', 'Сертифікати', 'Коворкінг і послуги', OTHER_GROUP, 'Знижки', OLD_GROUP]

const groupOf = (l: PriceLine, hasNew: boolean) => {
  if (hasNew && l.year && l.year < 2025) return OLD_GROUP
  const g = GROUPS.find(([, re]) => re.test(l.text))?.[0] ?? OTHER_GROUP
  // A potter's wheel or a kiln for sale («Гончарний круг Rad-Pro — 34 700 грн») is not a class.
  return g === 'Майстер-класи' && Math.max(0, ...amounts(l.text)) >= 15000 && !/груп|осіб|учасник|компан|корпорат|виїзн/iu.test(l.text) ? OTHER_GROUP : g
}
const hasNewPrices = (lines: PriceLine[]) => lines.some((l) => (l.year ?? 0) >= 2025)

export function groupPrices(lines: PriceLine[]) {
  const out = new Map<string, PriceLine[]>()
  const hasNew = hasNewPrices(lines)
  for (const l of lines) {
    const g = groupOf(l, hasNew)
    out.set(g, [...(out.get(g) ?? []), l])
  }
  return ORDER.filter((g) => out.has(g)).map((g) => [g, out.get(g)!] as const)
}

// The same class is often quoted several times: from the site, Bodo and a highlight, in other words, and once more
// inside a summary line («МК ліплення — 1 700 грн; гончарний круг — 1 700 грн, для двох 3 200 грн; …»).
// A line goes when its amounts are all in a kept line of its group about the same thing; a summary line goes when each
// of its parts does (in any group, except certificates: «сертифікат на МК — 1 700 грн» is news next to «МК — 1 700 грн»).
// Newer lines and the studio's own sources are kept first. A listing's older or undated price («МК — 1 500–1 800 грн
// (tykyiv.com, 2025)») goes when the studio's own site or Instagram gives newer ones.
const STEMS: [RegExp, string][] = [
  [/кру[гз]\p{L}*|(?<!\p{L})кол(?:о|і|ом|а)(?!\p{L})/gu, 'круг'],
  [/ліп(?:лен|к)\p{L}*/gu, 'ліплен'],
  [/глазур\p{L}*|полив\p{L}*/gu, 'глазур'],
  [/порцел\p{L}*|фарфор\p{L}*/gu, 'порцел'],
  [/сім(?:ей|['’]?[єї])\p{L}*/gu, 'сімей'],
  [/дит\p{L}*|діт\p{L}*/gu, 'дит'],
  [/корпорат\p{L}*|т[іи]мбілд\p{L}*/gu, 'корпор'],
  [/курс\p{L}*/gu, 'курс'],
]
const STOP = new Set(['майсте', 'клас', 'класи', 'класу', 'год', 'грн', 'особа', 'особи', 'осіб', 'особу', 'учасни', 'людина', 'люд', 'разом', 'матері', 'включе', 'включн', 'випал', 'випали', 'вартіс', 'для', 'або', 'від', 'вироб', 'виріб', 'занятт', 'занять', 'двоета', 'етапи', 'етапн', 'керамі', 'ручної', 'роботи'])
const topic = (t: string) => {
  let s = t.toLowerCase().replace(/(?<!\p{L})мк(?!\p{L})/gu, ' ')
  for (const [re, to] of STEMS) s = s.replace(re, ` ${to} `)
  return new Set((s.match(/\p{L}{3,}/gu) ?? []).map((w) => w.slice(0, 6)).filter((w) => !STOP.has(w)))
}
// Amounts a line quotes: hryvnia figures and bare price-list numbers («3 — 2750; 5 — 4250»), not sizes, volumes,
// temperatures, years or deposits.
const amounts = (t: string) => {
  const out = new Set<number>()
  for (const m of t.matchAll(/\d{1,3}(?:[  ]\d{3})+(?!\d)|\d+(?:[.,]\d+)?/g)) {
    const v = Number(m[0].replace(/[  ]/g, '').replace(',', '.'))
    const after = t.slice(m.index! + m[0].length, m.index! + m[0].length + 8)
    const before = t.slice(Math.max(0, m.index! - 24), m.index!)
    if (v < 100 || !Number.isInteger(v)) continue
    if (/^\s*(?:°|мл|см|мм|кг|г(?!р)|л(?!\p{L})|%|р\.|рок|хв|год|шт|осіб|особ|учасн|занят|×|x|х(?!\p{L})|коп)/iu.test(after)) continue
    if (/(?:передоплат|депозит|завдат|аванс)\p{L}*[^;]*$/iu.test(before)) continue
    if (v >= 2000 && v <= 2030 && !/^\s*(?:грн|₴)/u.test(after)) continue
    out.add(v)
  }
  return out
}
const covers = (a: { n: Set<number>; w: Set<string> }, b: { n: Set<number>; w: Set<string> }) => {
  if (!a.n.size || ![...a.n].every((x) => b.n.has(x))) return false
  const shared = [...a.w].filter((x) => b.w.has(x)).length
  // Same amounts: one shared word is enough; fewer amounts than the other line: at least half of its words.
  return a.n.size === b.n.size ? shared >= 1 || !a.w.size : a.w.size > 0 && shared * 2 >= a.w.size
}
const sourceRank = (s?: string) => (/сайт|instagram|telegram|facebook|tiktok/i.test(s ?? '') ? 0 : 1)

export function dedupePrices(lines: PriceLine[]): PriceLine[] {
  const hasNew = hasNewPrices(lines)
  const info = lines.map((l, i) => {
    const parts = l.text.split(/\s*;\s*/).filter((p) => /\d/.test(p))
    // A part with only numbers («5 — 3 900 грн») is about the same thing as the part before it.
    let prev = new Set<string>()
    const segs = parts.map((p) => {
      const w = topic(p)
      const seg = { n: amounts(p), w: w.size ? w : prev }
      prev = seg.w
      return seg
    }).filter((s) => s.n.size)
    return { l, i, g: groupOf(l, hasNew), n: amounts(l.text), w: topic(l.text), segs, multi: segs.length > 1 }
  })
  const rank = [...info].sort((a, b) => Number(a.multi) - Number(b.multi) || (b.l.year ?? 0) - (a.l.year ?? 0) || sourceRank(a.l.source) - sourceRank(b.l.source) || b.n.size - a.n.size || a.i - b.i)
  // «Code380, USD, 2025–2026» is a 2026 price.
  const yearOf = (l: PriceLine) => Math.max(l.year ?? 0, ...(l.source?.match(/(?:19|20)\d\d/g) ?? []).map(Number))
  const ownYear = Math.max(0, ...lines.filter((l) => sourceRank(l.source) === 0).map(yearOf))
  const kept: typeof info = []
  for (const x of rank) {
    if (ownYear && x.l.source && sourceRank(x.l.source) > 0 && yearOf(x.l) < ownYear) continue
    const near = kept.filter((k) => k.g === x.g || x.g !== 'Сертифікати')
    const dup = near.some((k) => k.g === x.g && covers(x, k)) || (x.multi && x.segs.every((s) => near.some((k) => covers(s, k) || k.segs.some((ks) => covers(s, ks)))))
    if (!dup) kept.push(x)
  }
  return kept.sort((a, b) => a.i - b.i).map((x) => x.l)
}

// ---------- «Інші студії та майстри» ----------

// Small stable number per pair, so profiles with equally good neighbours show different ones.
const pairHash = (a: string, b: string) => {
  let h = 2166136261
  for (const c of `${a}|${b}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}
const OFFER_FORMATS = ['wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca']
const handle = (u?: string | null) => (u ?? '').replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase()

/** Up to `n` studios from the same city worth opening next: related profiles first (one names the other), then those
 *  that offer the same things, are alive and are the same kind; ties differ from profile to profile. */
export function relatedStudios(s: Card, candidates: Card[], n = 6): Card[] {
  const city = s.cityDoc?.slug
  if (!city) return []
  const text = (x: Card) => [x.publicDescription, x.description, x.summary, ...(x.services ?? []).map((i) => i.text), ...(x.alternateNames ?? []).map((i) => i.text)].join(' ').toLowerCase()
  const mine = text(s)
  const names = (x: Card) => [x.shortName, handle(x.instagram)].filter((t): t is string => Boolean(t && t.length > 3)).map((t) => t.toLowerCase())
  const mk = offersMasterClasses(s)
  const formats = new Set((s.formats ?? []).filter((f) => OFFER_FORMATS.includes(f)))
  const year = 365 * 86400000
  const now = Date.now()
  return candidates
    .filter((x) => x.cityDoc?.slug === city && x.slug !== s.slug)
    .map((x) => {
      const linked = names(x).some((t) => mine.includes(t)) || names(s).some((t) => text(x).includes(t))
      const shared = (x.formats ?? []).filter((f) => formats.has(f)).length
      const post = x.activity?.lastPostDate ? now - new Date(x.activity.lastPostDate).getTime() : Infinity
      const score =
        (linked ? 100 : 0) +
        shared * 2 +
        (mk && offersMasterClasses(x) ? 3 : 0) +
        (x.type === s.type ? 2 : 0) +
        (post < year / 2 ? 3 : post < year ? 1.5 : 0) +
        pairHash(s.slug ?? '', x.slug ?? '') * 3
      return { x, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((r) => r.x)
}
