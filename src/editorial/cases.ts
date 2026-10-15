// Studio case pages («Кейси студії»): how a studio did a corporate or HoReCa order, told from public sources with the date we
// checked them. A case says only what its sources say; what the studio hasn't published goes to «Що спитати в
// студії». Labels: open-sources (за відкритими джерелами) → studio-confirmed → studio-and-client-confirmed.
import { caseCopies } from '@/content/cases'
import { site } from '@/content/site'

export type CaseStatus = 'open-sources' | 'studio-confirmed' | 'studio-and-client-confirmed'
export type CaseCopy = {
  id: string
  slug: string
  title: string
  metaDescription: string
  status: CaseStatus | string
  checked: string
  studio: { name: string; slug: string | null; note?: string }
  published?: string
  client: { name: string; type: string }
  facts: { label: string; value: string; source: string }[]
  lead: string
  sections: { heading: string; paragraphs: string[] }[]
  askStudio: string[]
  embeds: string[]
  sources: { title: string; url: string; date: string }[]
  related: { topics?: string[] }
}

// A case belongs to its studio: it lives at /vyrobnyky/<studio>/keisy/<short>, where <short> is the client/project
// part of the case id. Cases without a studio in the catalogue are not published.
const SHORT: Record<string, string> = {
  'art-hall-metinvest-yuvileina-taril': 'metinvest-yuvileina-taril',
  'keramika-lviv-fest-superhumans-inklyuzyvna-tarilka': 'fest-superhumans-inklyuzyvna-tarilka',
  'quiet-form-tc-pizza-tarilky-z-heroyamy': 'tc-pizza-tarilky-z-heroyamy',
  'zola-alternatyva-posud-dlya-kavyaren-odesa': 'alternatyva-posud-dlya-kavyaren',
  'sholomitska-alex-cooper-tatar-bunar-london': 'alex-cooper-tatar-bunar',
}
export const caseShort = (c: Pick<CaseCopy, 'slug'>) => SHORT[c.slug] ?? c.slug

export const CASES = (caseCopies as CaseCopy[]).filter((c) => c.studio.slug)
export const caseBySlug = (slug: string) => CASES.find((c) => c.slug === slug) ?? null
export const caseFor = (studioSlug: string, short: string) =>
  CASES.find((c) => c.studio.slug === studioSlug && caseShort(c) === short) ?? null
export const caseByShort = (short: string) => CASES.find((c) => caseShort(c) === short) ?? null
export const casesForStudio = (studioSlug?: string | null) => CASES.filter((c) => c.studio.slug === studioSlug)
// First publication of the current cases; a case added later sets its own `published`.
export const FIRST_PUBLISHED = '2026-10-11'
export const casePath = (c: Pick<CaseCopy, 'slug' | 'studio'>) => `/vyrobnyky/${c.studio.slug}/keisy/${caseShort(c)}`

export const CASE_LABEL: Record<string, string> = {
  'open-sources': 'За відкритими джерелами',
  'studio-confirmed': 'Підтверджено студією',
  'studio-and-client-confirmed': 'Підтверджено студією і замовником',
}

// «11.10.2026» from an ISO date.
export const dateUk = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}.${m}.${y}` : iso
}

// Which request type a reader of this case most likely wants (the form on the page opens on it).
const FORM_BY_TOPIC: [RegExp, string][] = [
  [/chashky-z-lohotypom/, 'logo-mugs'],
  [/korporatyvni-podarunky|podarunky-spivrobitnykam|richnytsyu|novorichni/, 'corporate-gifts'],
  [/posud-dlya-/, 'tableware'],
]
export function caseFormWhat(c: CaseCopy): string {
  // A case for a restaurant, café or hotel reads as a tableware case, even if it also links the logo-mugs page.
  if (/ресторан|кав.ярн|готел|заклад|холдинг/i.test(c.client.type)) return 'tableware'
  const topics = c.related.topics ?? []
  for (const [re, what] of FORM_BY_TOPIC) if (topics.some((t) => re.test(t))) return what
  return 'tableware'
}

// Labels for the related links (pages the cases point to).
export const RELATED_LABEL: Record<string, string> = {
  '/dlya-biznesu/chashky-z-lohotypom': 'Чашки з логотипом',
  '/dlya-biznesu/korporatyvni-podarunky': 'Корпоративні подарунки',
  '/dlya-biznesu/novorichni-podarunky-2026': 'Новорічні подарунки',
  '/dlya-biznesu/podarunky-spivrobitnykam': 'Подарунки співробітникам',
  '/dlya-biznesu/posud-dlya-hoteliv': 'Посуд для готелів',
  '/dlya-biznesu/posud-dlya-kavyaren': 'Посуд для кав’ярень',
  '/dlya-biznesu/posud-dlya-restoraniv': 'Посуд для ресторанів',
  '/dlya-biznesu/yak-vidsvyatkuvaty-richnytsyu-kompaniyi': 'Як відсвяткувати річницю компанії',
  '/dobirky/yalynkovi-prykrasy': 'Ялинкові прикраси з кераміки',
  '/novyi-rik-i-rizdvo': 'Новий рік і Різдво з керамікою',
  '/vyrobnyky/misto/kyiv': 'Виробники Києва',
  '/vyrobnyky/misto/lviv': 'Виробники Львова',
  '/vyrobnyky/misto/odesa': 'Виробники Одеси',
  '/vyrobnyky/vyrib/plytka-i-panno': 'Плитка і панно',
  '/vyrobnyky/vyrib/tarilky-i-mysky': 'Тарілки й миски',
}

// For the sitemap and llms.txt (via the editorial registry).
export function liveCasePages() {
  return [
    ...CASES.map((c) => ({ id: c.slug, path: casePath(c), section: 'keysy', title: c.title, summary: c.metaDescription })),
  ]
}

export const studioLdId = (slug?: string | null) => `${site.url}/vyrobnyky/${slug}#studio`
