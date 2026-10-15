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

type LivePage = { path: string; title: string; summary: string }
const livePage = (path: string, c: WaveCopy, vars: WaveVars): LivePage => {
  const f = fillCopy(c, vars)
  return { path, title: f.title, summary: f.metaDescription }
}

/** The live fixed wave A pages (where to buy, gifts, birthdays), without the format × city ones (the slow part). */
export async function liveFixedWavePages(): Promise<LivePage[]> {
  const out: LivePage[] = []
  const fixed: [keyof typeof FIXED_PAGES, () => Promise<{ vars: WaveVars }>][] = [
    ['de-kupyty-keramiku', whereToBuyData],
    ['podarunky-z-keramiky', giftsData],
    ['mk-den-narodzhennya', partyData],
  ]
  for (const [id, data] of fixed) {
    const c = waveCopy(id)
    if (c) out.push(livePage(FIXED_PAGES[id].path, c, (await data()).vars))
  }
  return out
}

/** Every live wave A page (copy exists): path, title and filled meta description, for the sitemap and llms.txt. */
export async function liveWavePages(): Promise<LivePage[]> {
  const out = await liveFixedWavePages()
  for (const p of await liveFormatCityPages()) {
    const c = waveCopy(formatCityId(p.city, p.format))!
    out.push(livePage(`/maister-klasy/${p.city}/${p.format}`, c, (await formatCityData(p.city, p.format)).vars))
  }
  return out
}
