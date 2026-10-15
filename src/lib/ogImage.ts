// URL of the generated share card (see src/app/(frontend)/og/route.tsx and docs/design/SYSTEM.md §7).
// Cards carry no years, counts or prices: callers pass a stable `sub` (a plain description of the page).
type Photo = { src: string; author?: string; license?: string }

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`)

// A card must stay true for as long as the page lives: no counts, prices or years (SYSTEM.md §7.4).
// Title: a year or a season goes wherever it stands, with its preposition and «році» («Ціни … 2026» → «Ціни …»,
// «Прикраси 2026/27: топ студій» → «Прикраси: топ студій», «Подарунки у 2026 році» → «Подарунки»; without a preposition
// «року» stays: «Символ 2027 року» → «Символ року»); then «Гончарне коло у Києві: 20 місць, ціни» keeps what stands
// before the colon when a number follows it.
const Y = String.raw`(?:19|20)\d{2}(?:\s*[/–—-]\s*(?:19|20)?\d{2})?\b(?!\s*(?:грн|₴|%))`
const YEAR = new RegExp(String.raw`\s+(?:у|в|на|за|до|з|від)\s+${Y}(?:\s+(?:році|року|рік|роки|років|рр?\.)(?!\p{L}))?|\s*\b${Y}`, 'gu')
export const stableTitle = (t: string) =>
  t
    .replace(YEAR, '')
    .replace(/\s+([:,.;!?])/g, '$1')
    .replace(/^[\s:,;–—-]+|[\s:,;–—-]+$/g, '')
    .replace(/:\s[^:]*\d[^:]*$/, '')
// Sub: clauses with a percentage go whole («…майстер-клас; 10% лише з укладених замовлень.» → «…майстер-клас»), then the
// text is cut where a price, a year or a parenthesised figure begins («…ліплення 900 грн за 2 години (2026), групи» → «…ліплення»).
const PRICE_OR_YEAR = /(?:[,;]\s*)?(?:(?:з|від|до|у|в)\s+)?(?:\b(?:19|20)\d{2}\b|\d[\d\s–—-]*\s*грн)|\s*\(\s*\d/u
const withoutPercent = (t: string) =>
  t
    .split(/(?<=[.;])\s+/)
    .filter((c) => !/\d\s*%/.test(c))
    .join(' ')
const stableSub = (s: string) => {
  const t = withoutPercent(s)
  const i = t.search(PRICE_OR_YEAR)
  const cut = i > 0 ? t.slice(0, i) : t
  return cut
    .replace(/\s*\([^)]*$/, '')
    .replace(/(?:\s+(?:від|до|за|з|у|в|на|по|—|–|-|коштує|коштують))+$/u, '')
    .replace(/[\s,;:—–(-]+$/, '')
}

/** Route params for a page photo: a site/doc/stock JPEG by name, with a credit line only for CC BY and CC BY-SA. */
export function ogPhoto(p?: Photo | null): { img?: string; credit?: string } {
  const m = p?.src.match(/^\/images\/(site|doc|stock)\/([\w-]+)\.jpg$/)
  if (!p || !m) return {}
  return { img: m[1] === 'site' ? m[2] : `${m[1]}-${m[2]}`, ...(p.author && p.license && p.license !== 'CC0' ? { credit: `Фото: ${p.author}, ${p.license}` } : {}) }
}

export function ogImage(p: { title: string; kicker?: string; sub?: string; img?: string; credit?: string; studio?: boolean; makes?: string[] }) {
  const q = new URLSearchParams()
  q.set('title', stableTitle(p.title))
  if (p.kicker) q.set('kicker', p.kicker)
  const sub = p.sub ? clip(stableSub(p.sub), 140) : ''
  if (sub) q.set('sub', sub)
  if (p.img) q.set('img', p.img)
  if (p.credit) q.set('credit', p.credit.slice(0, 80))
  if (p.studio) q.set('studio', '1')
  if (p.makes?.length) q.set('makes', p.makes.slice(0, 4).map((m) => m.slice(0, 24)).join('|'))
  return [{ url: `/og?${q.toString()}`, width: 1200, height: 630 }]
}
