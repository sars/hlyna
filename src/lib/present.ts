// Presentation helpers: turn raw research data into tidy public text. Display-only: the database
// keeps everything; these functions decide what a visitor (and an LLM) sees.
import type { City, Studio } from '@/types/catalog'

import { type DateContext, dropStale, kyivToday, sourceDate } from './dates'
import { amountsIn, groupMoney } from './money'

// ---------- text lists ----------

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[«»"'’ʼ`.,;:!?/\\|–—-]+/g, ' ')
    .replace(/(?<!\p{L})мк(?!\p{L})/gu, 'майстер клас')
    .replace(/майстер[\s-]*клас\p{L}*/gu, 'майстер клас')
    .replace(/коворк\p{L}*/gu, 'коворкінг')
    .replace(/\s+/g, ' ')
    .trim()

const words = (t: string) => new Set(norm(t).split(' ').filter((w) => w.length > 2).map((w) => w.slice(0, 6)))

// Drop exact and near duplicates ("майстер-класи" vs "МК", "сертифікати" vs "подарункові сертифікати"):
// an item whose words are all contained in a longer kept item is dropped.
export function dedupeTexts(items: string[]): string[] {
  const sorted = [...new Set(items.map((s) => s.trim()).filter(Boolean))].sort((a, b) => b.length - a.length)
  const kept: { text: string; w: Set<string> }[] = []
  for (const text of sorted) {
    const w = words(text)
    if (!w.size) continue
    const dup = kept.some((k) => [...w].every((x) => k.w.has(x)))
    if (!dup) kept.push({ text, w })
  }
  // Restore original order for the survivors.
  const order = new Map(items.map((t, i) => [t.trim(), i]))
  return kept.map((k) => k.text).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
}

// ---------- research notes ----------

// Research annotations that must not reach visitors: «(уточнюється)», «дані зі сніпета пошуку»,
// «сторінка зараз 404», «717 використань», «~2024». Inside a parenthesis only the note part is removed,
// so a source hint like «(tvoeshop, 2026; сертифікат наразі «недоступний»)» keeps «tvoeshop, 2026».
const NOTE_WORDS = /уточн|можливо|ймовірно|не підтвердж|сніпет|снипет|(?<!\d)404(?!\d)|станом на|не вказано|орієнтир|стара картка|недоступн|перевірит|на сайті —|з публікації|назва бренду|в іншому місці|у лістингу|точка збору|^\s*сайт\s*$/iu
const NOTE_SENTENCE = /[^.!?\n]*(?:актуальн\p{L}* [^.!?\n]{0,60}не підтвердж|сторінк\p{L}* зараз 404|дані зі сніпет)[^.!?\n]*[.!?]?/giu

export function cleanPublic(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/коворкинг/giu, 'коворкінг')
    .replace(NOTE_SENTENCE, '')
    .replace(/\(([^()]*)\)/g, (_m, inner: string) => {
      const kept = inner.split(/\s*;\s*/).filter((seg) => seg.trim() && !NOTE_WORDS.test(seg))
      return kept.length ? `(${kept.join('; ')})` : ''
    })
    .replace(/[;,]?\s*\d[\d\s]*використан\p{L}*/giu, '')
    .replace(/\s*[—–-]\s*уточнити\.?\s*$/iu, '')
    .replace(/~\s?((?:19|20)\d\d)(?!\d)/g, '$1')
    .replace(/~\s?(?=\d)/g, '≈')
    .replace(/,\s*(?=,)/g, '')
    .replace(/\s+([,.;)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


// ---------- prices ----------

// "… — 1750 грн (сайт, 2026)" → body + source hint. Old (≤2022) and internal lines are dropped.
const SOURCE = /\s*\(([^()]*?(?:19|20)\d\d[^()]*?|[^()]*?(?:сайт|instagram|bodo|kava|tvoeshop|prom|etsy|olx|facebook|магазин|\.ua|\.com|\.net)[^()]*?)\)\s*$/iu
const INTERNAL = /медіан|переглянуто|вітрин|застаріл|ціна за запитом|ціни не опубліковано|за квед|ймовірно|уточнити|ціна в хайлайті/iu
// Donations and charity prices are not a price of a class or a product (and never go into priceRange).
const DONATION = /донат|благодійн|(?<!\p{L})зсу(?!\p{L})|на військо|на збір/iu

export type PriceLine = { text: string; source?: string; year?: number }

export function splitSource(raw: string): PriceLine {
  const m = raw.match(SOURCE)
  const body = m ? raw.slice(0, m.index).trim() : raw.trim()
  const src = m?.[1]?.trim()
  const year = Number((src ?? raw).match(/(?:19|20)(\d\d)(?!\d)/)?.[0]) || undefined
  return { text: body.replace(/[,;]\s*$/, '').replace(/коворкинг/giu, 'коворкінг'), source: src, year }
}

export function publicPrices(s: Studio): PriceLine[] {
  const out: PriceLine[] = []
  const seen = new Set<string>()
  // Newest first, so when the same price appears from several sources (Bodo, bodo.ua, Instagram) the freshest stays.
  const raw = [...(s.prices ?? [])].map((p) => p.text).sort((a, b) => (splitSource(b).year ?? 0) - (splitSource(a).year ?? 0))
  for (const text of raw) {
    if (INTERNAL.test(text) || DONATION.test(text)) continue
    const line = splitSource(currentLine(text))
    if (line.year && line.year < 2023) continue
    if (!/\d/.test(line.text)) continue
    const key = norm(line.text)
    if (seen.has(key)) continue
    // Near duplicate: same amounts and one wording contained in the other («МК кераміки, 1,5 год — 1200 грн» twice).
    const am = amountsIn(line.text).join(',')
    const w = words(line.text)
    if (am && out.some((o) => amountsIn(o.text).join(',') === am && (() => { const ow = words(o.text); return [...w].every((x) => ow.has(x)) || [...ow].every((x) => w.has(x)) })())) continue
    seen.add(key)
    // Prices in dollars or euros come from shops abroad (Etsy, own site for export); say so instead of leaving a bare «43 USD».
    if (/(?<!\p{L})(?:usd|eur)(?!\p{L})|\$|€/iu.test(line.text) && !/грн|₴/.test(line.text))
      line.source = [line.source, /etsy/i.test(line.source ?? '') ? 'ціна для покупців за кордоном' : 'ціна в іноземній валюті, для покупців за кордоном'].filter(Boolean).join('; ')
    out.push(line)
  }
  // Separators only on the way out: the duplicate check above compares the plain wording.
  return out.map((l) => ({ ...l, text: groupMoney(l.text) }))
}

// ---------- card captions ----------

// A card already shows the name above its line, so a line that opens with it («Quiet Form — київський бренд…»,
// «ZOLA, Одеса: кераміка…», «Київська арт-студія КатАртСис: майстер-класи…») drops the name and that lead-in.
const LEAD_IN = /^[»”"]?\s*(?:\([^)]*\)\s*)?(?:(?:,|з|із|зі|в|у|на|біля)\s+[^:—–.]{1,40}?)?\s*[:—–]\s+/u
function withoutName(text: string, s: Pick<Studio, 'name' | 'shortName'>): string {
  const t = text.trim()
  for (const n of [...new Set([displayName(s), s.name.trim()])].filter(Boolean).sort((a, b) => b.length - a.length)) {
    // «у»/«в» alternate in Ukrainian («майстерня у Старому замку» / «в Старому замку»); same length, so indices hold.
    const fold = (x: string) => x.toLowerCase().replace(/(?<!\p{L})в(?!\p{L})/gu, 'у')
    const at = fold(t).indexOf(fold(n))
    // The name at the start, or after a few words of kind («Гончарна студія Glynar на Лютеранській: …»), never further in.
    if (at < 0 || at > 40 || /[:—–.;,]/u.test(t.slice(0, at))) continue
    const rest = t.slice(at + n.length)
    const lead = rest.match(LEAD_IN)
    // «Dosebe робить посуд…» → «Робить посуд…»; anything else (a possessive, a clause) keeps the name.
    const body = lead ? rest.slice(lead[0].length) : at === 0 && /^\s+\p{Ll}/u.test(rest) && !/^\s+(?:з|із|зі|в|у|та|і|й)\s/u.test(rest) ? rest.trim() : null
    if (body) return body
  }
  return t
}

// Short enough for two lines on a phone, cut where the text allows: at the end of a sentence or a «;» item, then at a
// comma, then between words — never inside a word or a number («1 4…», «м…»). Trailing joiners («для», «і») go too.
export const CAPTION_MAX = 80
export function clipText(text: string, max = CAPTION_MAX): string {
  const t = text.trim()
  if (t.length <= max) return t
  const head = t.slice(0, max + 1)
  const at = (re: RegExp) => [...head.matchAll(re)].map((m) => m.index!).filter((i) => i >= max * 0.4 && i <= max)
  // A sentence ends at «. » before a capital letter, unless the dot closes an abbreviation («вул. Шевченка», «10 зан. — …»).
  const clause = at(/[;!?](?=\s)|(?<!(?:^|[\s(])(?:вул|просп|пров|бульв|бул|пл|наб|ст|м|с|смт|ім|св|р|т|д|ч))\.(?=\s+\p{Lu})/gu).at(-1)
  if (clause !== undefined) return t.slice(0, clause).replace(/[\s,:—–-]+$/u, '')
  const trim = (x: string) => {
    for (let prev = ''; prev !== x; ) {
      prev = x
      x = x.replace(/[\s,;:—–(-]+$/u, '').replace(/\s+(?:і|й|та|а|в|у|з|із|зі|на|до|для|від|по|за|що|чи|або|при|про|без)$/iu, '')
    }
    return x
  }
  // A cut right after a number would leave a price without its unit («— 5 600…»): step back to the word before it.
  // Never inside a parenthesis («(tykyiv.com, лютий…»): such a cut falls back to before it.
  const open = (x: string) => (x.match(/\(/g)?.length ?? 0) > (x.match(/\)/g)?.length ?? 0)
  const cuts = [...at(/,(?=\s)/g), ...at(/(?<!\d)\s|\s(?!\d)/g)].sort((a, b) => b - a).map((i) => t.slice(0, i)).map((x) => trim(open(x) ? x.slice(0, x.lastIndexOf('(')) : x))
  return `${cuts.find((x) => !/\d$/u.test(x)) ?? cuts[0] ?? trim(t.slice(0, max))}…`
}

/** A studio's line on a card: without the studio's own name in front, cut by clause or word, capitalised. */
export function caption(s: Pick<Studio, 'name' | 'shortName'>, text: string, max = CAPTION_MAX): string {
  const t = clipText(withoutName(text, s), max)
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ---------- people and places ----------

// Birth years and similar personal details are not business information (CLAUDE.md → privacy).
export function stripPersonal(text: string): string {
  return text
    // «Народилася в 1964 році, закінчила …» → «Закінчила …» (the rest of the sentence is about work, keep it).
    .replace(/(^|[.!?]\s+)народи\p{L}*\s+(?:у|в)\s+\d{4}\s+році,\s*(\p{L})/giu, (_m, a: string, c: string) => a + c.toUpperCase())
    // A short sentence that is only about birth («Народилася 1985 року в Ужгороді.»).
    .replace(/(^|[.!?]\s+)народи\p{L}*(?:(?<!\p{L})р\.|[^.!?;]){0,40}?\d{4}(?:(?<!\p{L})р\.|[^.!?;]){0,60}?[.!?](?=\s|$)\s*/giu, '$1')
    // Inline: «…, народилася 1985 року у Львові, …» / «народився у 1985 р.»
    .replace(/,?\s*народи\p{L}*\s+(?:у|в)?\s*\d{4}\s*(?:року|р\.)?(?:\s+(?:у|в)\s+[^,.;]+)?/giu, '')
    // «(нар. 1985 р.)», «(1985 р. н.)», «(1985 року народження)»
    .replace(/\s*\(\s*(?:\d{4}\s*(?:р\.\s*н\.|року народження)|нар\.\s*(?:у|в)?\s*\d{4}\s*(?:р\.|року)?)\s*\)/giu, '')
    .replace(/,?\s*\d{4}\s*(?:р\.\s*н\.|року народження)/giu, '')
    // Leftover punctuation after a removed clause.
    .replace(/^[\s,;]+/u, '')
    .replace(/\s+([,;])/g, '$1')
    .replace(/,([.;])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim()
}

// «у Києві», not «у місті Київ». Unknown names fall back to «у м. X».
export const LOCATIVE: Record<string, string> = {
  Київ: 'у Києві', Львів: 'у Львові', Одеса: 'в Одесі', Харків: 'у Харкові', Дніпро: 'у Дніпрі', Луцьк: 'у Луцьку',
  Вінниця: 'у Вінниці', Запоріжжя: 'у Запоріжжі', 'Івано-Франківськ': 'в Івано-Франківську', Тернопіль: 'у Тернополі',
  Ужгород: 'в Ужгороді', Полтава: 'у Полтаві', Чернігів: 'у Чернігові', Черкаси: 'у Черкасах', Житомир: 'у Житомирі',
  Рівне: 'у Рівному', Хмельницький: 'у Хмельницькому', Чернівці: 'у Чернівцях', Миколаїв: 'у Миколаєві', Суми: 'у Сумах',
  Кропивницький: 'у Кропивницькому', 'Кривий Ріг': 'у Кривому Розі', 'Біла Церква': 'у Білій Церкві', Кременчук: 'у Кременчуці',
  Бровари: 'у Броварах', Ірпінь: 'в Ірпені', Буча: 'у Бучі', Косів: 'у Косові', Опішне: 'в Опішному', Миргород: 'у Миргороді',
  "Кам'янець-Подільський": 'у Кам’янці-Подільському', 'Кам’янець-Подільський': 'у Кам’янці-Подільському', Мукачево: 'у Мукачеві',
  "Слов'янськ": 'у Слов’янську', 'Слов’янськ': 'у Слов’янську', Коломия: 'у Коломиї', Нікополь: 'у Нікополі', Бар: 'у Барі',
  Городенка: 'у Городенці', Трускавець: 'у Трускавці', Вишгород: 'у Вишгороді', Васильків: 'у Василькові', Яремче: 'у Яремчі',
  Канів: 'у Каневі', Переяслав: 'у Переяславі', Лубни: 'у Лубнах', Чугуїв: 'у Чугуєві', Соснівка: 'у Соснівці', Кути: 'у Кутах',
}
/** «про Одесу», «про Вінницю»: the accusative of a settlement name, word by word (feminine -а/-ія/-ия/-ця/-ня), else unchanged. */
export const aboutCity = (name: string) =>
  name
    .split(' ')
    .map((w) => (/(ія|ия|ця|ня)$/u.test(w) ? `${w.slice(0, -1)}ю` : /а$/u.test(w) ? `${w.slice(0, -1)}у` : w))
    .join(' ')

export const inCity = (name?: string | null) => (name ? LOCATIVE[name] ?? `у м. ${name}` : '')

/** A city page's name and «where»: «Тернопіль і область», «у Тернополі й області» on a centre's page with other towns. */
export const pageName = (p: { city: Pick<City, 'name'>; towns: unknown[] }) => (p.towns.length ? `${p.city.name} і область` : p.city.name)
/** «Населені пункти Тернопільської області» for the towns on a centre's page (their oblast as written in cities.oblast). */
export const oblastGen = (towns: { city: Pick<City, 'oblast'> }[]) => {
  const o = towns.find((t) => t.city.oblast)?.city.oblast?.replace(/\([^)]*\)/g, '').trim()
  return o ? `Населені пункти ${o.replace(/ька$/u, 'ької')} області` : 'Населені пункти області'
}
export const pageWhere = (p: { city: Pick<City, 'name'>; towns: unknown[] }) => {
  const w = inCity(p.city.name)
  return p.towns.length ? `${w} ${/[аеєиіїоуюя]$/u.test(w) ? 'й' : 'і'} області` : w
}

// Admin labels like «м. Київ (спецстатус)» or a bare «Вінницька» → readable region names.
export function oblastLabel(c?: Pick<City, 'oblast' | 'name'> | null): string {
  const o = (c?.oblast ?? '').replace(/\([^)]*\)/g, '').trim()
  if (!o || /Київ$/.test(o) || o.replace(/^м\.\s*/, '') === c?.name) return ''
  if (/обл/.test(o)) return o.replace(/обл\.?$/, 'область')
  if (/(ська|цька|зька|ька)$/.test(o)) return `${o} область`
  return o
}

// ---------- links and addresses ----------

const PROFILE_HOSTS = /(?:^|\.)(instagram\.com|facebook\.com|etsy\.com|tiktok\.com|youtube\.com|pinterest\.com|behance\.net|t\.me)$/i

// A link field (instagram, website, facebook) as an absolute http(s) URL, or null when it holds a research note, a name
// or a bare handle: in an href those resolve against the page, and crawlers then request /vyrobnyky/<note>.
export function webUrl(v: string | null | undefined): string | null {
  const s = v?.trim()
  if (!s || !/^https?:\/\/\S+$/i.test(s)) return null
  try {
    return new URL(s).hostname.includes('.') ? s : null
  } catch {
    return null
  }
}

// sameAs must hold clean URLs of the entity's own profiles, not booking pages or articles.
export function profileUrls(s: Studio): string[] {
  const own = (() => {
    try {
      return s.website ? new URL(s.website).hostname.replace(/^www\./, '') : ''
    } catch {
      return ''
    }
  })()
  const urls = [s.instagram, s.website, s.facebook, ...(s.otherLinks ?? []).map((l) => l.url)]
  const out = new Set<string>()
  for (const u of urls) {
    if (!u || /\s/.test(u.trim())) continue
    try {
      const url = new URL(u.trim())
      const host = url.hostname.replace(/^www\./, '')
      if (!/^https?:$/.test(url.protocol)) continue
      const ok = PROFILE_HOSTS.test(host) ? !/etsy\.com$/i.test(host) || /\/shop\//.test(url.pathname) : host === own && url.pathname.length <= 1
      if (ok || u === s.website || u === s.instagram || u === s.facebook) out.add(url.toString())
    } catch {
      /* not a URL */
    }
  }
  return [...out]
}

// First address only, without metro stations and entrance notes (for JSON-LD streetAddress).
// Addresses that research marked as no longer current («історично: …», «актуальні адреси не вказані»).
const STALE_ADDRESS = /^\s*(?:історично|раніше|колишн)|актуальн\p{L}* адрес\p{L}* .{0,30}не вказан/iu

export function firstAddress(addr?: string | null): string {
  if (!addr || STALE_ADDRESS.test(addr)) return ''
  return addr
    .replace(/\([^)]*\)/g, '')
    .split(/;|\s+та\s+|\s+і\s+(?=вул)/)[0]
    .replace(/\([^)]*\)/g, '')
    .replace(/,?\s*(?:ст\.\s*)?м\.\s*[«"]?[А-ЯІЇЄҐ][^,;]*$/u, '')
    .replace(/^м\.\s*[^,]+,\s*/, '')
    // «Mercury Art Center, вул. Січових Стрільців, 3» → start at the street (schema.org streetAddress).
    .replace(/^[^,]*?[A-Za-zА-ЯІЇЄҐа-яіїєґ«»"'’ ]+,\s*(?=(?:вул|просп|пров|пл|бульв|шосе|узвіз)\.?\s)/u, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,\s]+$/, '')
    .trim()
}

// Display address: tidy punctuation and drop a lone postal code («…, Одеса 65000» → «…, Одеса»).
export const cleanAddress = (a?: string | null) =>
  (a && STALE_ADDRESS.test(a) ? '' : cleanPublic(a))
    .replace(/(?<=\p{L})\s+\d{5}(?=\s*(?:,|$))/gu, '')
    .replace(/,\s*,/g, ',')
    .replace(/[,\s]+$/, '')

// ---------- who is a business ----------

const EXHIBIT_ONLY = /виставк|музе|галере|колекці|симпозіум|пленер|аукціон/iu

// Artists known from exhibitions and museums, with nothing to order or book: no request form,
// no «умови для закладів», no master-class badge.
export function isExhibitingOnly(s: Studio): boolean {
  if (s.type === 'legacy') return true // museums, traditions and memorial pages: nothing to book or order
  if (!['maker', 'heritage', 'other'].includes(s.type ?? '')) return false
  // Technique tags (wheel, painting…) describe the work; only offer tags mean something can be booked or ordered.
  const OFFER = ['kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca']
  if (s.formats?.some((f) => OFFER.includes(f))) return false
  if (s.prices?.length) return false
  const channels = (s.salesChannels ?? []).map((c) => c.text)
  if (channels.length) return channels.every((c) => EXHIBIT_ONLY.test(c)) && !s.website
  return !s.website && !s.instagram && !s.facebook
}

// Names imported from listings sometimes carry a phone or a partner note in brackets:
// «Гончарні майстер-класи у Миколаєві (партнер KAVA, тел. 066 569 19 64)» → without the bracket.
// Display name: research titles carry addresses, marketplaces and spelling variants («Гончарна студія (Луцьк,
// вул. Драгоманова, 1а) — МК на ТВОЄ», «Mercury Art Center (Меркурій)»). The variants live in alternateNames and
// show on the profile as «Також відомі як»; the heading keeps the name itself. City qualifiers like «(Суми)» stay.
const ADDRESS = /(?<!\p{L})(?:вул|просп|пров|пл|бульв|шосе|узвіз|м-н)\.?\s|(?<!\p{L})\d+[а-яa-z]?(?:\/\d+)?(?!\p{L})/iu
const hasLatin = (t: string) => /[a-z]/i.test(t)
const hasCyr = (t: string) => /[а-яіїєґ]/i.test(t)
/** The name a studio goes by on the site: its short name when set, else the cleaned full name. */
export const displayName = (s: { name: string; shortName?: string | null }): string => s.shortName?.trim() || cleanName(s.name)

export function cleanName(name: string): string {
  let n = name
    .replace(/\s*\((?=[^)]*(?:тел\.?|\+?\d[\d\s-]{6,}|партнер))[^)]*\)/giu, '')
    .replace(/\s+[—–-]\s+(?:мк|майстер-клас\p{L}*)\s+на\s+.+$/iu, '')
    .replace(/,?\s*(?:тел\.?\s*)?\+?\d[\d\s()-]{8,}\d/gu, '')
  n = n.replace(/\s*\(([^()]*)\)/g, (m, inner: string) => {
    const outer = n.replace(m, '')
    if (ADDRESS.test(inner)) return ''
    const alias = inner.trim().split(/\s+/).length <= 3 && ((hasLatin(inner) && !hasLatin(outer)) || (hasCyr(inner) && !hasCyr(outer)))
    return alias ? '' : m
  })
  n = n.replace(/,\s*(?:вул|просп|пров|пл|бульв)\.?\s[^()]+$/iu, '')
  return n.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim() || name
}

// ---------- staleness ----------

// «останній пост — лютий 2022» when the latest Instagram post is more than a year old; shown next to the
// studio in lists so people check before they go.
export function staleNote(s: { activity?: { lastPostDate?: string | null } | null }, now = Date.now()): string {
  const d = s.activity?.lastPostDate
  if (!d) return ''
  const t = new Date(d).getTime()
  if (!Number.isFinite(t) || now - t < 365 * 86400000) return ''
  const parts = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).formatToParts(new Date(t))
  return `останній пост — ${parts.filter((x) => x.type === 'month' || x.type === 'year').map((x) => x.value).join(' ')}`
}

// The newest dated fact a profile rests on: the last Instagram post, the studio's own news, a price's year or a year
// named in the text. Year-only facts count as the end of that year. Null when nothing is dated.
export function dataDate(s: Studio, now = Date.now()): { at: number; label: string } | null {
  const thisYear = new Date(now).getUTCFullYear()
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' })
      .formatToParts(new Date(d))
      .filter((x) => x.type === 'month' || x.type === 'year')
      .map((x) => x.value)
      .join(' ')
  const facts = [s.activity?.lastPostDate, s.ownerNewsAt]
    .filter((d): d is string => Boolean(d) && Number.isFinite(new Date(d!).getTime()))
    .map((d) => ({ at: new Date(d).getTime(), label: fmt(d) }))
  const text = [s.summary, s.publicDescription, s.description, s.recentNote, ...(s.prices ?? []).map((p) => p.text)].filter(Boolean).join(' ')
  for (const m of text.matchAll(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d|\s*(?:грн|₴|мл|см|шт))/g)) {
    const y = Number(m[1])
    if (y <= thisYear) facts.push({ at: Date.UTC(y, 11, 31), label: String(y) })
  }
  return facts.reduce<{ at: number; label: string } | null>((a, f) => (!a || f.at > a.at ? f : a), null)
}

/** The data date of a profile whose newest fact is more than a year old («2019», «березень 2021»), else ''. */
export function oldDataLabel(s: Studio, now = Date.now()): string {
  const d = dataDate(s, now)
  return d && now - d.at > 365 * 86400000 ? d.label : ''
}

// «Є прайс.» says nothing when the profile shows no prices (all of them old, or none collected): the sentence goes,
// a clause after it stays («Є прайс; записатися можна через Instagram.» → «Записатися можна через Instagram.»).
export function withoutPriceMention(text: string): string {
  return text
    .replace(/(^|[.!?]\s+|\n)Є прайс(?: на [^.;,]+)?(?:, тож[^.]*)?\.[ \t]*/gu, '$1')
    .replace(/(^|[.!?]\s+|\n)Є прайс(?: на [^.;,]+)?;\s*(\p{L})/gu, (_m, a: string, c: string) => a + c.toUpperCase())
    .replace(/Є прайс і /gu, 'Є ')
    .replace(/,\s*є прайс\./gu, '.')
    .replace(/\s+[йі] прайс\./gu, '.')
    .replace(/[ \t]+$/gm, '')
    .trim()
}

// Domains and web addresses are not names: «dobraglina.com.ua» or «bigme.ua» shouldn't show as «Також відомі як».
export const isDomainLike = (t: string) => /\.(com|ua|net|org|shop|store)(\.|_|$)|^https?:|^www\./i.test(t.trim())

const MONTH_STEMS: [RegExp, number][] = [
  [/січн/i, 1], [/лют/i, 2], [/берез/i, 3], [/квіт/i, 4], [/травн/i, 5], [/червн/i, 6], [/липн/i, 7], [/серпн/i, 8],
  [/верес/i, 9], [/жовтн/i, 10], [/листопад/i, 11], [/грудн/i, 12], [/зим/i, 1], [/весн/i, 4], [/літ/i, 7], [/осен/i, 10],
]

const NEWS_TTL = 183 * 24 * 3600 * 1000

/** A profile line as shown today: a sentence whose date has passed goes («розклад на вересень: 18.09, 19.09 (Instagram,
 *  09.2026)»); an undated «18.09» is dated by the line's source, «3.01» in a line from 10.2026 being next January. */
export function currentLine(raw: string, today = kyivToday()): string {
  const line = splitSource(raw)
  return dropStale(raw, today, sourceDate(line.source) ?? line.year)
}

// A YYYY-MM-DD (or ISO) date as the context of an undated «10 січня» written then.
const writtenAt = (iso: string): DateContext => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) || undefined })

/** The studio's own news is dated by the owner's save; like «Що нового», it goes after about six months. */
export const newsIsFresh = (at: string, now = Date.now()) => now - new Date(at).getTime() < NEWS_TTL

// «Що нового» is news: hide it once it is older than about six months. The note's own latest «<місяць> <рік>» counts;
// without a date in the text, the date of the studio's last Instagram post does.
export function noteIsFresh(note: string, lastPostDate?: string | null, now = Date.now()): boolean {
  let newest = 0
  for (const m of note.matchAll(/(?:(\p{L}+)\s+)?(20\d\d)(?=\s*(?:року|р\.|\b))/gu)) {
    const year = Number(m[2])
    const month = m[1] ? MONTH_STEMS.find(([re]) => re.test(m[1]!))?.[1] ?? 12 : 12
    newest = Math.max(newest, Date.UTC(year, month - 1, 28))
  }
  if (!newest && lastPostDate) newest = new Date(lastPostDate).getTime()
  if (!newest) return true
  return now - newest < NEWS_TTL
}

const yearIn = (t: string, now: number) => Math.max(0, ...[...t.matchAll(/(?<!\d)(20\d\d)(?!\d)/g)].map((m) => Number(m[1])).filter((y) => y <= now))

/** «Що нового» as shown today: nothing once it is stale (noteIsFresh), and no sentence whose date has passed. An undated
 *  «10 жовтня» in it is of the note's newest year, else of the last post's date. */
export function currentNote(note: string, lastPostDate?: string | null, today = kyivToday()): string {
  if (!note || !noteIsFresh(note, lastPostDate, Date.parse(today))) return ''
  const year = yearIn(note, Number(today.slice(0, 4)))
  return dropStale(note, today, year || (lastPostDate ? writtenAt(lastPostDate) : undefined))
}

/** The studio's own news as shown today: until it is stale (newsIsFresh), without sentences whose date has passed. */
export function currentNews(text: string, at: string, today = kyivToday()): string {
  if (!text || !newsIsFresh(at, Date.parse(today))) return ''
  return dropStale(text, today, writtenAt(at))
}
