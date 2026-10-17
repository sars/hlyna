import data from '@/content/city-masters.json'

/**
 * «Майстри, які працювали в місті» (owner, 17.10.2026): makers whose profiles are hidden (no channel or address) but whose
 * record holds real substance — a title, a prize, a school, years of work. One curated line of fact each, with its source,
 * in src/content/city-masters.json keyed by city slug. No link to the hidden profile; no birth dates (privacy rule).
 * `date` is the source's own date (YYYY or YYYY-MM) when it has one; `seen` is when we read it (YYYY-MM), never guessed.
 */
export type CityMaster = { name: string; line: string; source: { title: string; url: string }; date?: string; seen: string }

export const cityMasters = (citySlug: string): CityMaster[] => (data as Record<string, CityMaster[]>)[citySlug] ?? []

const MONTHS_GEN = ['січні', 'лютому', 'березні', 'квітні', 'травні', 'червні', 'липні', 'серпні', 'вересні', 'жовтні', 'листопаді', 'грудні']
const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень']

/** «2013», «березень 2013» — the source's own date; without one, «без дати; переглянуто у жовтні 2026». */
export function sourceDateLabel(m: Pick<CityMaster, 'date' | 'seen'>): string {
  const [y, mo] = (m.date ?? '').split('-').map(Number)
  if (y && mo) return `${MONTHS[mo - 1]} ${y}`
  if (y) return String(y)
  const [sy, sm] = m.seen.split('-').map(Number)
  return `без дати; переглянуто ${sm ? `у ${MONTHS_GEN[sm - 1]} ` : ''}${sy}`
}
