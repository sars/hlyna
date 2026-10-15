// Site search over the index from src/server/searchIndex.ts (served at /poshuk/index.json). Pure and small: the header
// search runs it in the browser on every keystroke, /poshuk runs it on the server. A document is found by the words of
// its title, its other names (w), its cities (c: names and aliases) and its formats (f: what people call them), so
// «коло львів» finds the page «Гончарне коло у Львові» first and then the Lviv studios with a wheel.
import type { StudioFormat } from '@/shared/options'
import { CITY_ALIASES, CONCEPT_WORDS, GENERIC, STOP } from './concepts'
import { fold, near, otherLayout, words } from './normalize'

/** page: hubs, topics, format × city, makers and certificate city pages; city: a city's master-class page; guide: guides. */
export type SearchKind = 'page' | 'city' | 'studio' | 'guide'
export type SearchDoc = {
  k: SearchKind
  t: string // title as shown
  u: string // path
  s?: string // one line under the title
  w?: string // other names: alternate names, Instagram handle, product words
  c?: string[] // city slugs the document is about
  f?: StudioFormat[]
  n?: number // how many places it lists (or 1): a light tie-breaker
  x?: 1 // closed or activity not confirmed: shown lower
}
export type SearchIndex = { v: 1; at: string; cities: [slug: string, name: string][]; docs: SearchDoc[] }

type Term = { w: string; f: string; weight: number }
type Prepared = { docs: (SearchDoc & { terms: Term[]; title: string })[]; cityTerms: Map<string, Term[]>; conceptTerms: Map<string, Term[]> }
export type SearchHit = SearchDoc & { score: number; marks: [start: number, end: number][] }
export type SearchResult = { query: string; corrected?: string; answer: SearchHit | null; cities: SearchHit[]; studios: SearchHit[]; pages: SearchHit[]; total: number }

const termsOf = (text: string, weight: number): Term[] => words(text).map((w) => ({ w, f: fold(w), weight }))

/** Expands every document into its searchable words once; search() then only compares. */
export function prepare(index: SearchIndex): Prepared {
  const cityTerms = new Map(index.cities.map(([slug, name]) => [slug, termsOf(`${name} ${CITY_ALIASES[slug] ?? ''}`, 0.9)]))
  const conceptTerms = new Map(Object.entries(CONCEPT_WORDS).map(([f, text]) => [f, termsOf(text, 0.85)]))
  return {
    cityTerms,
    conceptTerms,
    docs: index.docs.map((d) => {
      const all = [...termsOf(d.t, 1), ...termsOf(d.w ?? '', 0.9), ...(d.k === 'studio' ? [] : termsOf(d.s ?? '', 0.6)), ...(d.c ?? []).flatMap((c) => cityTerms.get(c) ?? []), ...(d.f ?? []).flatMap((f) => conceptTerms.get(f) ?? [])]
      const best = new Map<string, Term>()
      for (const t of all) if (!STOP.has(t.w) && (best.get(t.w)?.weight ?? 0) < t.weight) best.set(t.w, t)
      return { ...d, terms: [...best.values()], title: words(d.t).join(' ') }
    }),
  }
}

type QWord = { w: string; f: string; generic: boolean }
const GENERIC_FOLDS = [...GENERIC].map(fold)
const isGeneric = (f: string) => GENERIC_FOLDS.some((g) => f === g || (f.startsWith(g) && f.length - g.length <= 2))

// How well one query word matches one word of a document, 0…1. Prefixes count (people are still typing), and so do
// endings (a document word that starts the query word: «Львові» → «Львів»).
function score(q: QWord, t: Term): number {
  let s = 0
  if (t.w === q.w) s = 1
  else if (q.w.length >= 2 && t.w.startsWith(q.w)) s = 0.9
  else if (t.f === q.f) s = 0.85
  else if (q.f.length >= 2 && t.f.startsWith(q.f)) s = 0.75
  else if (t.f.length >= 3 && q.f.startsWith(t.f) && q.f.length - t.f.length <= 3) s = t.f.length >= 4 ? 0.85 : 0.55
  // One typo, not in the first letter (cheap to rule out, and people rarely miss it).
  else if (q.f.length >= 5 && t.f.length >= 5 && q.f[0] === t.f[0] && near(q.f, t.f) <= 1) s = 0.5
  else if (q.f.length >= 5 && t.f.length > q.f.length && q.f[0] === t.f[0] && near(q.f, t.f.slice(0, q.f.length)) <= 1) s = 0.45
  return s * t.weight
}

const KIND_BONUS: Record<SearchKind, number> = { page: 0.08, city: 0.1, studio: 0, guide: 0.02 }

// The cities and formats a query names: «коло львів» → lviv + wheel. A page about exactly them goes up; a page about a
// format or a city nobody asked for goes a little down, so «Львів» answers with the city page, not with «Ліплення у
// Львові», and «коло» with the whole-Ukraine wheel page, not with «Гончарне коло у Києві».
function intent(prepared: Prepared, query: QWord[]) {
  const named = (map: Map<string, Term[]>, min: number) =>
    new Set([...map].filter(([, terms]) => query.some((q) => q.w.length >= 3 && terms.some((t) => score(q, t) >= min * t.weight))).map(([k]) => k))
  return { cities: named(prepared.cityTerms, 0.7), formats: named(prepared.conceptTerms, 0.75) }
}

function rank(prepared: Prepared, query: QWord[], phrase: string) {
  const want = intent(prepared, query)
  const required = query.some((q) => !q.generic) ? query.filter((q) => !q.generic) : query
  const weight = query.reduce((a, q) => a + (q.generic ? 0.3 : 1), 0) // «майстер-клас», «кераміка» count less than «Львів»
  const hits: SearchHit[] = []
  const seen = new Set<number>() // query words that matched somewhere
  for (const d of prepared.docs) {
    let sum = 0, covered = 0
    for (const [i, q] of query.entries()) {
      let best = 0
      for (const t of d.terms) best = Math.max(best, score(q, t))
      if (best > 0) seen.add(i)
      sum += best * (q.generic ? 0.3 : 1)
      if (best > 0 && required.includes(q)) covered++
    }
    if (!covered) continue
    const coverage = covered / required.length
    const title = d.title
    let s = (sum / weight) * coverage * coverage
    if (title.startsWith(phrase)) s += d.k === 'studio' ? 0.25 : 0.1 // a name being typed
    else if (query.length > 1 && title.includes(phrase)) s += 0.1
    if (coverage === 1) s += KIND_BONUS[d.k]
    if (d.c?.[0] && want.cities.has(d.c[0])) s += 0.15
    else if (d.k === 'page' && d.c?.length && !d.c.some((c) => want.cities.has(c))) s -= 0.3 // one city's page, no city asked
    if (d.f?.some((f) => want.formats.has(f))) s += 0.1
    else if (d.f?.length && d.k !== 'studio') s -= 0.2
    s += 0.06 * Math.min(1, Math.log10((d.n ?? 1) + 1) / 2)
    if (d.x) s *= 0.7
    const { terms: _, title: __, ...doc } = d
    hits.push({ ...doc, score: s, marks: [] })
  }
  return { hits: hits.sort((a, b) => b.score - a.score), seen }
}

// Character ranges of the title to highlight: the typed prefix of a word, or the whole word for a looser match.
function marks(title: string, query: QWord[]): [number, number][] {
  const out: [number, number][] = []
  for (const m of title.matchAll(/[\p{L}\p{N}'’ʼ]+/gu)) {
    const [w] = words(m[0])
    if (!w) continue
    const t = { w, f: fold(w), weight: 1 }
    for (const q of query) {
      const s = score(q, t)
      if (s >= 0.9 && !/['’ʼ]/.test(m[0])) out.push([m.index, m.index + Math.min(q.w.length, m[0].length)])
      else if (s >= 0.55) out.push([m.index, m.index + m[0].length])
      else continue
      break
    }
  }
  return out
}

const parse = (raw: string): QWord[] =>
  words(raw)
    .filter((w) => !STOP.has(w) && (w.length > 1 || /\d/.test(w)))
    .map((w) => {
      const f = fold(w)
      return { w, f, generic: isGeneric(f) }
    })

/** Results grouped for the search panel and /poshuk; null for a query too short to search. */
export function search(prepared: Prepared, raw: string, limits = { cities: 3, studios: 6, pages: 5 }): SearchResult | null {
  let query = parse(raw)
  if (!query.length || query.map((q) => q.w).join('').length < 2) return null
  const first = rank(prepared, query, query.map((q) => q.w).join(' '))
  const { seen } = first
  let { hits } = first
  // A word that matches nothing anywhere may be typed in the wrong keyboard layout («kmdsd» → «львів»).
  let corrected: string | undefined
  const rawWords = raw.trim().split(/\s+/)
  if (seen.size < query.length && rawWords.length === query.length) {
    const fixed = rawWords.map((w, i) => (seen.has(i) ? w : (otherLayout(w) ?? w))).join(' ')
    const q2 = parse(fixed)
    if (fixed !== raw.trim() && q2.length) {
      const again = rank(prepared, q2, q2.map((q) => q.w).join(' '))
      if (again.seen.size > seen.size) {
        ;({ hits } = again)
        query = q2
        corrected = q2.map((q) => q.w).join(' ')
      }
    }
  }
  const top = hits[0]?.score ?? 0
  hits = hits.filter((h) => h.score >= Math.max(0.2, top * 0.3)) // half-matches far below the best are noise
  const answer = query.map((q) => q.w).join('').length < 3 ? null : hits.find((h) => (h.k === 'page' || h.k === 'city') && h.score >= top * 0.9 && h.score >= 0.75) ?? null
  const rest = hits.filter((h) => h !== answer)
  const shown = (xs: SearchHit[]) => xs.map((h) => ({ ...h, marks: marks(h.t, query) }))
  return {
    query: raw.trim(),
    corrected,
    answer: answer && shown([answer])[0],
    cities: shown(rest.filter((h) => h.k === 'city').slice(0, limits.cities)),
    studios: shown(rest.filter((h) => h.k === 'studio').slice(0, limits.studios)),
    pages: shown(rest.filter((h) => h.k === 'page' || h.k === 'guide').slice(0, limits.pages)),
    total: hits.length,
  }
}
