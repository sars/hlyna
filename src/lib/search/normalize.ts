// Text keys for site search. Runs in the browser and on the server, so no imports.
// plain(): lowercase words as typed, apostrophes and ґ/ё folded. fold(): a sound skeleton shared by Ukrainian, Russian
// and Latin spellings, so «Львів», «Lviv», «Львов» and «у Львові» meet: every vowel (and й, ь-less glides) is one
// class «a», г/ґ/g/h/х/kh are one class, doubled letters collapse, soft signs and apostrophes drop.

const APOSTROPHES = /['’ʼ`‘ʹ]/g

/** Lowercase words (letters and digits), apostrophes removed, ґ → г, ё → е. Hyphenated names split into words. */
export function words(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(/ґ/g, 'г')
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

const CYR: Record<string, string> = {
  а: 'a', е: 'a', є: 'a', и: 'a', і: 'a', ї: 'a', й: 'a', о: 'a', у: 'a', ю: 'a', я: 'a', ы: 'a', э: 'a', ё: 'a',
  б: 'b', в: 'v', г: 'h', ґ: 'h', д: 'd', ж: 'ж', з: 'z', к: 'k', л: 'l', м: 'm', н: 'n', п: 'p', р: 'r', с: 's',
  т: 't', ф: 'f', х: 'h', ц: 'ц', ч: 'ч', ш: 'ш', щ: 'ш', ь: '', ъ: '',
}
// Latin spellings of the same sounds; digraphs first.
const LATIN: [RegExp, string][] = [
  [/shch|sch/g, 'ш'],
  [/sh/g, 'ш'],
  [/ch/g, 'ч'],
  [/zh/g, 'ж'],
  [/kh/g, 'h'],
  [/ts|tz/g, 'ц'],
  [/ph/g, 'f'],
  [/ck/g, 'k'],
  [/x/g, 'ks'],
  [/[cq]/g, 'k'],
  [/w/g, 'v'],
  [/g/g, 'h'],
  [/[aeiouyj]/g, 'a'],
]

/** The sound skeleton of one word (see the file comment). */
export function fold(word: string): string {
  // Latin digraphs first, so a Cyrillic «сх» (→ s, h) never reads as «sh».
  let latin = word
  for (const [re, to] of LATIN) latin = latin.replace(re, to)
  let s = ''
  for (const ch of latin) s += ch in CYR ? CYR[ch] : ch
  return s.replace(/(.)\1+/g, '$1')
}

// Keys of the Ukrainian ЙЦУКЕН layout under the Latin QWERTY ones: «kmdsd» typed with the wrong layout is «львів».
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`"
const UK = 'йцукенгшщзхїфівапролджєячсмитьбюʼ'
const toUk = new Map([...EN].map((c, i) => [c, UK[i]]))
const toEn = new Map([...UK].map((c, i) => [c, EN[i]]))

/** The same keys read in the other layout (Latin ↔ Cyrillic), or null when the word mixes both or neither. */
export function otherLayout(raw: string): string | null {
  const s = raw.toLowerCase()
  if ([...s].every((c) => toUk.has(c))) return [...s].map((c) => toUk.get(c)).join('')
  if ([...s].every((c) => toEn.has(c) || c === 'ы' || c === 'э' || c === 'ъ')) return [...s].map((c) => toEn.get(c) ?? (c === 'ы' ? 's' : c === 'э' ? "'" : ']')).join('')
  return null
}

/** Optimal string alignment distance capped at 2 (enough to tell 0, 1 or «more»). */
export function near(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  const prev2: number[] = [], prev: number[] = [], cur: number[] = []
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur[j] = v
      rowMin = Math.min(rowMin, v)
    }
    if (rowMin >= 2) return 2
    prev2.splice(0, prev2.length, ...prev)
    prev.splice(0, prev.length, ...cur)
  }
  return Math.min(prev[b.length], 2)
}
