import data from '@/content/city-masters.json'

/**
 * «Майстри, які працювали в місті» (owner, 17.10.2026): makers whose profiles are hidden (no channel or address) but whose
 * record holds real substance — a title, a prize, a school, years of work. One curated line of fact each, with its sources,
 * in src/content/city-masters.json keyed by city slug. No link to the hidden profile; no birth dates (privacy rule).
 * A source's `date` is its own date (YYYY or YYYY-MM) when it has one; `seen` is when we read the sources (YYYY-MM), never guessed.
 */
export type CityMasterSource = { title: string; url: string; date?: string }
export type CityMaster = { name: string; line: string; sources: CityMasterSource[]; seen: string }

export const cityMasters = (citySlug: string): CityMaster[] => (data as Record<string, CityMaster[]>)[citySlug] ?? []

const MONTHS_LOC = ['січні', 'лютому', 'березні', 'квітні', 'травні', 'червні', 'липні', 'серпні', 'вересні', 'жовтні', 'листопаді', 'грудні']
const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень']

/** «2013», «березень 2013» — the source's own date; without one, «без дати; переглянуто у жовтні 2026». */
export function sourceDateLabel(source: Pick<CityMasterSource, 'date'>, seen: string): string {
  const [y, mo] = (source.date ?? '').split('-').map(Number)
  if (y && mo) return `${MONTHS[mo - 1]} ${y}`
  if (y) return String(y)
  const [sy, sm] = seen.split('-').map(Number)
  return `без дати; переглянуто ${sm ? `у ${MONTHS_LOC[sm - 1]} ` : ''}${sy}`
}
