// Wave B pages: selections (tableware brands, Etsy, New Year ornaments, who works with business), events,
// museums and three guides (kinds of ceramics, care, black-smoked and milk-fired). Same mechanism as wave A:
// copy is written per page from data packs (UkraineCeramics/_site_content/waveB), reviewed, and synced into
// src/content/waveB by scripts/sync-wave-b.mjs. A page without copy returns 404 and stays out of the sitemap,
// navigation and llms.txt. Live lists and numbers come from the data here; copy uses {placeholders}.
import { copies } from '@/content/waveB'
import { fillCopy, type WaveCopy } from '@/editorial/copy'
import type { StudioCard } from '@/lib/catalog'
import { eventsPageData, museumsPageData } from './events'
import { careData, materialsData, smokeData } from './guides-data'
import { businessData, etsyData, newYearData, tablewareBrandsData } from './selections'

export * from './events'
export * from './guides-data'
export * from './selections'

export const waveBCopy = (id: string): WaveCopy | null => (copies as Record<string, WaveCopy>)[id] ?? null

export type WaveBId =
  | 'brendy-posudu'
  | 'etsy'
  | 'podiyi'
  | 'muzei-keramiky'
  | 'yalynkovi-prykrasy'
  | 'vydy-keramiky'
  | 'dohliad-za-keramikoyu'
  | 'chornodymlena-i-molochena'
  | 'pratsyuyut-z-biznesom'

type Section = 'dobirky' | 'hayidy' | null
export const WAVE_B: Record<WaveBId, { path: string; section: Section; crumb: string; kicker: string; form: string; pattern: string }> = {
  'brendy-posudu': { path: '/dobirky/brendy-posudu', section: 'dobirky', crumb: 'Бренди посуду', kicker: 'Добірки', form: 'tableware', pattern: 'brands' },
  etsy: { path: '/dobirky/etsy', section: 'dobirky', crumb: 'Кераміка на Etsy', kicker: 'Добірки', form: 'other', pattern: 'etsy' },
  podiyi: { path: '/podiyi', section: null, crumb: 'Ярмарки й події', kicker: 'Події', form: 'other', pattern: 'events' },
  'muzei-keramiky': { path: '/muzei-keramiky', section: null, crumb: 'Музеї й галереї', kicker: 'Де подивитися', form: 'other', pattern: 'museums' },
  'yalynkovi-prykrasy': { path: '/dobirky/yalynkovi-prykrasy', section: 'dobirky', crumb: 'Ялинкові прикраси', kicker: 'Добірки', form: 'corporate-gifts', pattern: 'newyear' },
  'vydy-keramiky': { path: '/hayidy/vydy-keramiky', section: 'hayidy', crumb: 'Види кераміки', kicker: 'Гайди', form: 'tableware', pattern: 'materials' },
  'dohliad-za-keramikoyu': { path: '/hayidy/dohliad-za-keramikoyu', section: 'hayidy', crumb: 'Догляд за керамікою', kicker: 'Гайди', form: 'tableware', pattern: 'care' },
  'chornodymlena-i-molochena': { path: '/hayidy/chornodymlena-i-molochena', section: 'hayidy', crumb: 'Чорнодимлена й молочена', kicker: 'Гайди', form: 'other', pattern: 'smoke' },
  'pratsyuyut-z-biznesom': { path: '/dobirky/pratsyuyut-z-biznesom', section: 'dobirky', crumb: 'Хто працює з бізнесом', kicker: 'Добірки', form: 'tableware', pattern: 'business' },
}
export const WAVE_B_IDS = Object.keys(WAVE_B) as WaveBId[]

// ---------- registry ----------

export type WaveBData =
  | ({ id: 'brendy-posudu' } & Awaited<ReturnType<typeof tablewareBrandsData>>)
  | ({ id: 'etsy' } & Awaited<ReturnType<typeof etsyData>>)
  | ({ id: 'podiyi' } & Awaited<ReturnType<typeof eventsPageData>>)
  | ({ id: 'muzei-keramiky' } & Awaited<ReturnType<typeof museumsPageData>>)
  | ({ id: 'yalynkovi-prykrasy' } & Awaited<ReturnType<typeof newYearData>>)
  | ({ id: 'vydy-keramiky' } & Awaited<ReturnType<typeof materialsData>>)
  | ({ id: 'dohliad-za-keramikoyu' } & Awaited<ReturnType<typeof careData>>)
  | ({ id: 'chornodymlena-i-molochena' } & Awaited<ReturnType<typeof smokeData>>)
  | ({ id: 'pratsyuyut-z-biznesom' } & Awaited<ReturnType<typeof businessData>>)

export async function waveBData(id: WaveBId): Promise<WaveBData> {
  switch (id) {
    case 'brendy-posudu': return { id, ...(await tablewareBrandsData()) }
    case 'etsy': return { id, ...(await etsyData()) }
    case 'podiyi': return { id, ...(await eventsPageData()) }
    case 'muzei-keramiky': return { id, ...(await museumsPageData()) }
    case 'yalynkovi-prykrasy': return { id, ...(await newYearData()) }
    case 'vydy-keramiky': return { id, ...(await materialsData()) }
    case 'dohliad-za-keramikoyu': return { id, ...(await careData()) }
    case 'chornodymlena-i-molochena': return { id, ...(await smokeData()) }
    case 'pratsyuyut-z-biznesom': return { id, ...(await businessData()) }
  }
}

/** Studios a page lists (for the ItemList JSON-LD). */
export const waveBStudios = (d: WaveBData): StudioCard[] =>
  d.id === 'brendy-posudu' || d.id === 'yalynkovi-prykrasy' || d.id === 'pratsyuyut-z-biznesom' || d.id === 'dohliad-za-keramikoyu'
    ? d.studios
    : d.id === 'chornodymlena-i-molochena'
      ? [...new Map([...d.black, ...d.milk].map((s) => [s.id, s])).values()]
      : d.id === 'vydy-keramiky'
        ? [...new Map(d.groups.flatMap((g) => g.studios).map((s) => [s.id, s])).values()]
        : []

/** Every live wave B page (copy exists), for the sitemap, llms.txt and the section index pages. */
export async function liveWaveBPages(): Promise<{ id: WaveBId; path: string; section: Section; title: string; summary: string }[]> {
  const out: { id: WaveBId; path: string; section: Section; title: string; summary: string }[] = []
  for (const id of WAVE_B_IDS) {
    const c = waveBCopy(id)
    if (!c) continue
    const f = fillCopy(c, (await waveBData(id)).vars)
    out.push({ id, path: WAVE_B[id].path, section: WAVE_B[id].section, title: f.title, summary: f.metaDescription })
  }
  return out
}

