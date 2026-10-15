// Dates in written copy age on their own (audit cause 7): pages are ISR with a daily refresh, so a sentence that sells a
// date as current («триває до 1 листопада», «17 жовтня анонсовано МК», «Що в розкладі на жовтень 2026») drops out the
// day after that date, without a deploy. Sentences told in the past tense («пройшов 10–11 жовтня 2026 року») stay: they
// are history. Dates in parentheses are sources or examples («(Instagram, 09.2026)», «(у 2024 — 7–8.12)») and never age
// a sentence. Seasonal titles take their years from newYearSeason().

// One formatter: building it costs ~50 µs, and every price line asks for today.
const KYIV_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' })
/** Today in Kyiv as YYYY-MM-DD. */
export const kyivToday = (now = new Date()) => KYIV_DAY.format(now)

/** The New Year season a page is about: the coming one, or the running one until the Christmas holidays end (6 January). */
export function newYearSeason(today = kyivToday()) {
  const [y, m, d] = today.split('-').map(Number)
  const first = m === 1 && d <= 6 ? y - 1 : y
  return { label: `${first}/${String(first + 1).slice(2)}`, newYear: first + 1 }
}

const GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
// Any case of a month name: «жовтень», «жовтні», «на жовтень», «жовтневому».
const STEMS: [string, number][] = [['січ', 1], ['лют', 2], ['берез', 3], ['квіт', 4], ['трав', 5], ['черв', 6], ['лип', 7], ['серп', 8], ['верес', 9], ['жовт', 10], ['листопад', 11], ['груд', 12]]
const monthOf = (w: string) => STEMS.find(([s]) => w.toLowerCase().startsWith(s))?.[1]
const SEASON_END: [RegExp, number, number][] = [[/^(?:навесні|весн)/iu, 5, 31], [/^(?:влітку|улітку|літ)/iu, 8, 31], [/^(?:восени|осін|осен)/iu, 11, 30]]

const L = '\\p{L}'
const MONTH_ANY = `(?:січ|лют|берез|квіт|трав|черв|лип|серп|верес|жовт|листопад|груд)${L}*`
const DAY = `(\\d{1,2})(?:\\s*[–-]\\s*(\\d{1,2}))?\\s+(${GEN.join('|')})(?:\\s+(20\\d\\d))?`
const MENTION = new RegExp(
  [
    `(?<!\\d)${DAY}`, // 10 жовтня, 10–11 жовтня 2026
    `(?<![\\d.,])(\\d{1,2})\\.(\\d{2})(?:\\.(20\\d\\d))?(?![\\d,]|\\.\\d)`, // 10.10, 10.10.2026
    `(?<!${L})(${MONTH_ANY})(?:\\s*[–-]\\s*(${MONTH_ANY}))?\\s+(20\\d\\d)(?!\\d|\\/)`, // у жовтні 2026, листопад–грудень 2026
    `(?<!${L})(навесні|весн${L}*|влітку|улітку|літ${L}*|восени|осін${L}*|осен${L}*)\\s+(20\\d\\d)(?!\\d|\\/)`, // восени 2026
    `(?<!${L})сезон${L}*\\s+(20\\d\\d)\\/(\\d\\d)`, // сезон 2026/27
  ].join('|'),
  'giu',
)

// Words that make a clause history. Ukrainian past forms end in -в/-ла/-ло/-ли (тривав, пройшла, відбулося, були) or are
// impersonal -но/-то forms (знято, відкрито); nouns with the same endings are listed out.
const PAST_END = /(?:[аиоуя]в|[аиоуяі]вся|ла|ло|ли|лась|лася|лось|лося|лись|лися)$/u
// Nouns in -ив: «інтенсив», «колектив», «креатив», «курсив» (verbs end in -стив, -бив, -рив…, never these).
const NOUN_IV = /(?:ктив|атив|итив|отив|ентив|нсив|рсив)$/u
const NOT_PAST = new Set(
  'коло кола село села скло скла тло світло світла тепло тепла джерело джерела число числа крило крила сила сили мило тіло тіла діло ремесло ремесла весло житло крісла крісло масло мало чимало сало жало чоло дупло пекло шило осло школа школи смола смоли бджола зала зали коли столи стола зло зла ангела ярослав станіслав мирослав святослав вячеслав прав держав застав мотив мотивів колектив актив креатив перспектив позитив негатив наратив остров розмов умов основ мов слов'.split(' '),
)
const PAST_WORDS = /^(?:(?:при|про|від|пере|за|з|роз|ви|у|до|пі)?вів|зріс|ріс|міг|змогла|несла|росла|востаннє|торік|минул\p{L}*|колись|(?:зібран|перевірен|знят|оновлен|складен|записан)\p{L}*)$/u
// Announcing or planning: history when the date is the day it was announced («9 жовтня оголосила передзамовлення»),
// current when the date is the one announced («на 17 жовтня анонсував МК», «заплановано на листопад 2026 року»).
const ANNOUNCE = /^(?:анонс|оголош|оголос|заплан|призначен|чека)/u
// Past in form, present in meaning: what is left or open now («залишилось 3 місця», «набір відкрито»).
const STATE = /^(?:за)?лишил\p{L}*$|^відкрит\p{L}*$/u
const IMPERSONAL = /^\p{L}{2,}(?:ано|яно|ено|єно|ито|ято|уто)$/u
const NOT_IMPERSONAL = new Set('рано погано свято сито'.split(' '))
// Words that keep a month or season current: present verbs («веде», «коштує», «ідуть») and schedule words.
const PRESENT_END = /(?:ає|яє|ує|ює|іє|ють|ують|ить|ять|уть|ться)$/u
const NOT_PRESENT = new Set('пам’ять п’ять дев’ять десять двадцять тридцять мить суть путь ртуть'.split(' '))
const PRESENT_WORDS = /^(?:є|веде|ведуть|йде|іде|йдуть|ідуть|бере|беруть|живе|везе|пече|може|можуть|розклад\p{L}*|афіш\p{L}*)$/u
// «станом на 8 жовтня» is the date the data was seen, not an event.
const AS_OF = /(?:станом на|на момент|перевірено|за даними|оновлено|зріз|скан\p{L}*)\s*$/iu

const words = (t: string) => t.toLowerCase().replace(/'/g, '’').split(/[^\p{L}’-]+/u).filter(Boolean)
const isPastWord = (w: string, target: boolean) =>
  !(target && ANNOUNCE.test(w)) &&
  !STATE.test(w) &&
  ((PAST_END.test(w) && w.length > 2 && !NOT_PAST.has(w) && !NOUN_IV.test(w)) || PAST_WORDS.test(w) || (IMPERSONAL.test(w) && !NOT_IMPERSONAL.has(w)))
const isPresentWord = (w: string) => PRESENT_WORDS.test(w) || ANNOUNCE.test(w) || STATE.test(w) || (PRESENT_END.test(w) && !NOT_PRESENT.has(w))

type Mention = { start: number; end: number; y?: number; m: number; d?: number; level: 'day' | 'month'; to?: string }

/** End date (YYYY-MM-DD) of a mention once its year is known. */
const endOf = (y: number, m: number, d?: number) => {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d ?? last, last)).padStart(2, '0')}`
}

function mentions(sentence: string): Mention[] {
  const out: Mention[] = []
  for (const x of sentence.matchAll(MENTION)) {
    const start = x.index!
    const end = start + x[0].length
    if (x[3]) out.push({ start, end, m: GEN.indexOf(x[3].toLowerCase()) + 1, d: Number(x[2] ?? x[1]), y: x[4] ? Number(x[4]) : undefined, level: 'day' })
    else if (x[6]) {
      const m = Number(x[6])
      const d = Number(x[5])
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) out.push({ start, end, m, d, y: x[7] ? Number(x[7]) : undefined, level: 'day' })
    } else if (x[8]) {
      const m = monthOf(x[9] ?? x[8])
      if (m) out.push({ start, end, m, y: Number(x[10]), level: 'month' })
    } else if (x[11]) {
      const season = SEASON_END.find(([re]) => re.test(x[11]))
      if (season) out.push({ start, end, m: season[1], d: season[2], y: Number(x[12]), level: 'month' })
    } else if (x[13]) out.push({ start, end, m: 1, d: 6, y: Number(x[13]) + 1, level: 'month' })
  }
  return out
}

/** Ranges of the sentence inside parentheses: sources and examples. */
function parenthesised(s: string): [number, number][] {
  const spans: [number, number][] = []
  let depth = 0
  let open = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      if (!depth) open = i
      depth++
    } else if (s[i] === ')' && depth) {
      depth--
      if (!depth) spans.push([open, i])
    }
  }
  if (depth) spans.push([open, s.length])
  return spans
}

/** Clauses of a sentence: spans between , ; : — ( ) and the sentence ends. */
function clauses(s: string): [number, number][] {
  const out: [number, number][] = []
  let from = 0
  for (let i = 0; i <= s.length; i++) {
    if (i === s.length || /[,;:()—]/.test(s[i])) {
      out.push([from, i])
      from = i + 1
    }
  }
  return out
}

const YEAR = /(?<!\d)(20\d\d)(?!\d)/g

export type DatedPart = { text: string; end: string; yearFrom: 'text' | 'context' }

/** When an undated «3.01» was written: a year, or a year and month (a source «(Instagram, 10.2026)», a news date). */
export type DateContext = number | { y: number; m?: number }

/** The year of an undated day in a text written at `ctx`: a month well before the writing month is the next year's
 *  («Новорічні МК 27.12, 3.01 (Instagram, 10.2026)» → 3 January 2027; «10 січня» in news of 20 December → January). */
function yearFor(m: number, ctx: DateContext): number {
  if (typeof ctx === 'number') return ctx
  return ctx.m && m < ctx.m - 2 ? ctx.y + 1 : ctx.y
}

const MONTH_YEAR = new RegExp(`(?<!${L})(${MONTH_ANY})\\s+(20\\d\\d)`, 'iu')
/** The date a source note names: «11.10.2026», «10.2026», «жовтень 2026», «2026». */
export function sourceDate(src?: string | null): DateContext | undefined {
  if (!src) return undefined
  const dmy = src.match(/(?<!\d)\d{1,2}\.(\d{1,2})\.(20\d\d)(?!\d)/)
  if (dmy) return { y: Number(dmy[2]), m: Number(dmy[1]) }
  const my = src.match(/(?<![\d.])(\d{1,2})\.(20\d\d)(?!\d)/)
  if (my && Number(my[1]) <= 12) return { y: Number(my[2]), m: Number(my[1]) }
  const named = src.match(MONTH_YEAR)
  if (named) return { y: Number(named[2]), m: monthOf(named[1]) }
  const y = src.match(/(?<!\d)(20\d\d)(?!\d)/)
  return y ? Number(y[1]) : undefined
}

/** The dates of a sentence that it presents as current, with the day each one ends. Dates told in the past tense, in
 *  parentheses, «станом на …» or «з …» (a start) are left out. A «10 жовтня» takes its year from its own clause, else
 *  from `context` (a profile line's source date); with neither it is a yearly date («Різдво — 25 грудня») and stays. */
export function currentDates(sentence: string, context?: DateContext): DatedPart[] {
  const parens = parenthesised(sentence)
  const inParens = (i: number) => parens.some(([a, b]) => i > a && i < b)
  const list = mentions(sentence).filter((x) => !inParens(x.start))
  const spans = clauses(sentence)
  const clauseOf = (i: number) => spans.findIndex(([a, b]) => i >= a && i < b)
  // «з 2023 року» is a start: it doesn't date a «25 грудня» next to it.
  const yearsIn = (k: number) =>
    [...sentence.slice(...spans[k]).matchAll(YEAR)].filter((m) => !/(?:^|\s)(?:з|із|від|після)\s*$/iu.test(sentence.slice(0, spans[k][0] + m.index!))).map((m) => ({ at: spans[k][0] + m.index!, y: Number(m[1]) }))
  const out: DatedPart[] = []
  for (let i = 0; i < list.length; i++) {
    const x = list[i]
    const before = sentence.slice(Math.max(0, x.start - 24), x.start)
    if (AS_OF.test(before)) continue
    const k = clauseOf(x.start)
    // «з 8 жовтня до 1 листопада 2026 року», «8 жовтня — 1 листопада»: one span that ends with the second date.
    const next = list[i + 1]
    if (next && /^\s*(?:до|по|[—–-])\s*$/u.test(sentence.slice(x.end, next.start))) {
      const y = next.y ?? yearsIn(clauseOf(next.start)).find((v) => v.at > next.start)?.y
      if (y && !next.y) next.y = y
      continue
    }
    // «з травня 2025 року працює» is a start, not an end.
    if (/(?:^|\s)(?:з|із|від|починаючи з)\s*$/iu.test(before)) continue
    // The verb that tells the date: in its clause, else the nearest clause after it, else before it.
    const target = /(?:^|\s)(?:на|до|по)\s*$/iu.test(before)
    const order = [k, ...spans.map((_, j) => j).filter((j) => j > k), ...spans.map((_, j) => j).filter((j) => j < k).reverse()]
    const ws = order.map((j) => words(sentence.slice(...spans[j]))).find((w) => w.some((v) => isPastWord(v, target) || isPresentWord(v))) ?? []
    if (ws.some((v) => isPastWord(v, target))) continue
    // A month or a season stays current unless the clause says something is going on now («веде», «в розкладі»).
    if (x.level === 'month' && !ws.some(isPresentWord)) continue
    let y = x.y
    let yearFrom: DatedPart['yearFrom'] = 'text'
    if (!y) {
      const ys = yearsIn(k)
      y = ys.find((v) => v.at > x.end)?.y ?? ys.filter((v) => v.at < x.start).at(-1)?.y
    }
    if (!y && context) {
      y = yearFor(x.m, context)
      yearFrom = 'context'
    }
    if (!y) continue
    out.push({ text: sentence.slice(x.start, x.end), end: endOf(y, x.m, x.d), yearFrom })
  }
  return out
}

/** A sentence whose dates, all of them, have passed while it still presents them as current («на 12.10 або 20.10» stays
 *  until 20.10). */
export function isStale(sentence: string, today = kyivToday(), context?: DateContext): boolean {
  const parts = currentDates(sentence, context)
  return parts.length > 0 && parts.every((p) => p.end < today)
}

// Sentence ends: . ! ? before a capital, a digit, a quote or a link, but not after «вул.», «ім.», «пл.» or inside «…».
const ABBR = /(?:^|[\s(])(?:вул|ім|пл|просп|пров|бул|ч|ст|р|рр|м|с|смт|див|обл|тис|млн|напр|акад|проф|ін|т|д|н|е|пп)$/iu
export function sentences(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let from = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '«') depth++
    else if (c === '»') depth = Math.max(0, depth - 1)
    else if ((c === '.' || c === '!' || c === '?') && !depth && /\s/.test(text[i + 1] ?? '') && /[\p{Lu}\d«[(]/u.test(text.slice(i + 1).trimStart()[0] ?? '')) {
      if (c === '.' && ABBR.test(text.slice(from, i))) continue
      out.push(text.slice(from, i + 1))
      from = i + 1
    }
  }
  out.push(text.slice(from))
  return out.map((s) => s.trim()).filter(Boolean)
}

/** The text without the sentences that sell a past date as current; '' when nothing is left. Line breaks and paragraphs
 *  stay as written: each line is filtered on its own, a line left empty goes with its break. */
export function dropStale(text: string, today = kyivToday(), context?: DateContext): string {
  if (!text || !/\d/.test(text)) return text
  const parts = text.split(/(\s*\n\s*)/)
  let out = ''
  let gap = ''
  let changed = false
  for (let i = 0; i < parts.length; i += 2) {
    const all = sentences(parts[i])
    const kept = all.filter((s) => !isStale(s, today, context))
    if (kept.length < all.length) changed = true
    // Between two kept lines, the widest break of those in between (a dropped paragraph leaves one blank line).
    if (i > 0 && (parts[i - 1].match(/\n/g)?.length ?? 0) > (gap.match(/\n/g)?.length ?? 0)) gap = parts[i - 1]
    if (!kept.length) continue
    out += (out ? gap : '') + (kept.length === all.length ? parts[i].trim() : kept.join(' '))
    gap = ''
  }
  return changed ? out : text
}
