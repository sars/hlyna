// Wave A pages: format × city master classes, where to buy, gifts by budget, birthdays in a studio.
// Copy (title, lead, sections, FAQ…) is written per page from data packs (UkraineCeramics/_site_content/waveA)
// and synced into src/content/waveA by scripts/sync-wave-a.mjs. A page without copy does not exist:
// it returns 404 and stays out of the sitemap, navigation and llms.txt. Live numbers come from the data here.
import { fillCopy, type WaveCopy, type WaveVars } from '@/editorial/copy'
import { waveCopy } from './copies'
import { formatCityData, formatCityId, liveFormatCityPages } from './format-city'
import { giftsData } from './gifts'
import { partyData } from './party'
import { whereToBuyData } from './where-to-buy'

export { fill, fillCopy, type WaveCopy, type WaveVars } from '@/editorial/copy'
export { hasCopy, waveCopy } from './copies'
export * from './format-city'
export * from './gifts'
export * from './party'
export * from './where-to-buy'

// ---------- registry ----------

export const FIXED_PAGES = {
  'de-kupyty-keramiku': { path: '/de-kupyty-keramiku' },
  'podarunky-z-keramiky': { path: '/podarunky-z-keramiky' },
  'mk-den-narodzhennya': { path: '/maister-klasy/den-narodzhennya' },
} as const

/** Every live wave A page (copy exists): path, title and filled meta description, for the sitemap and llms.txt. */
export async function liveWavePages(): Promise<{ path: string; title: string; summary: string }[]> {
  const out: { path: string; title: string; summary: string }[] = []
  const add = (path: string, c: WaveCopy, vars: WaveVars) => {
    const f = fillCopy(c, vars)
    out.push({ path, title: f.title, summary: f.metaDescription })
  }
  const fixed: [keyof typeof FIXED_PAGES, () => Promise<{ vars: WaveVars }>][] = [
    ['de-kupyty-keramiku', whereToBuyData],
    ['podarunky-z-keramiky', giftsData],
    ['mk-den-narodzhennya', partyData],
  ]
  for (const [id, data] of fixed) {
    const c = waveCopy(id)
    if (c) add(FIXED_PAGES[id].path, c, (await data()).vars)
  }
  for (const p of await liveFormatCityPages()) {
    const c = waveCopy(formatCityId(p.city, p.format))!
    add(`/maister-klasy/${p.city}/${p.format}`, c, (await formatCityData(p.city, p.format)).vars)
  }
  return out
}
