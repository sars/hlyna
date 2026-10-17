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
import { businessData, candlesticksData, christmasTableData, etsyData, halloweenData, interiorData, kilnData, newYearData, patrioticData, souvenirData, symbolData, tablewareBrandsData, teaData, weddingData } from './selections'

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
  | 'symvol-2027'
  | 'svichnyky'
  | 'rizdvianyi-posud'
  | 'patriotychni-podarunky'
  | 'chaini-tseremonii'
  | 'vesillia'
  | 'khellovin'
  | 'vypal'
  | 'interyer'
  | 'suveniry'

type Section = 'dobirky' | 'hayidy' | null
export const WAVE_B: Record<WaveBId, { path: string; section: Section; crumb: string; kicker: string; form: string }> = {
  'brendy-posudu': { path: '/dobirky/brendy-posudu', section: 'dobirky', crumb: 'Бренди посуду', kicker: 'Добірки', form: 'tableware' },
  etsy: { path: '/dobirky/etsy', section: 'dobirky', crumb: 'Кераміка на Etsy', kicker: 'Добірки', form: 'other' },
  podiyi: { path: '/podiyi', section: null, crumb: 'Ярмарки й події', kicker: 'Події', form: 'other' },
  'muzei-keramiky': { path: '/muzei-keramiky', section: null, crumb: 'Музеї й галереї', kicker: 'Де подивитися', form: 'other' },
  'yalynkovi-prykrasy': { path: '/dobirky/yalynkovi-prykrasy', section: 'dobirky', crumb: 'Ялинкові прикраси', kicker: 'Добірки', form: 'corporate-gifts' },
  'vydy-keramiky': { path: '/hayidy/vydy-keramiky', section: 'hayidy', crumb: 'Види кераміки', kicker: 'Гайди', form: 'tableware' },
  'dohliad-za-keramikoyu': { path: '/hayidy/dohliad-za-keramikoyu', section: 'hayidy', crumb: 'Догляд за керамікою', kicker: 'Гайди', form: 'tableware' },
  'chornodymlena-i-molochena': { path: '/hayidy/chornodymlena-i-molochena', section: 'hayidy', crumb: 'Чорнодимлена й молочена', kicker: 'Гайди', form: 'other' },
  'pratsyuyut-z-biznesom': { path: '/dobirky/pratsyuyut-z-biznesom', section: 'dobirky', crumb: 'Хто працює з бізнесом', kicker: 'Добірки', form: 'tableware' },
  'symvol-2027': { path: '/dobirky/symvol-2027-roku', section: 'dobirky', crumb: 'Символ 2027 року', kicker: 'Добірки', form: 'corporate-gifts' },
  svichnyky: { path: '/dobirky/keramichni-svichnyky', section: 'dobirky', crumb: 'Керамічні свічники', kicker: 'Добірки', form: 'corporate-gifts' },
  'rizdvianyi-posud': { path: '/dobirky/rizdvianyi-posud', section: 'dobirky', crumb: 'Різдвяний посуд', kicker: 'Добірки', form: 'tableware' },
  'patriotychni-podarunky': { path: '/dobirky/patriotychni-podarunky', section: 'dobirky', crumb: 'Патріотичні подарунки', kicker: 'Добірки', form: 'corporate-gifts' },
  'chaini-tseremonii': { path: '/dobirky/posud-dlya-chainoi-tseremonii', section: 'dobirky', crumb: 'Посуд для чайної церемонії', kicker: 'Добірки', form: 'tableware' },
  vesillia: { path: '/dobirky/podarunky-gostyam-na-vesillia', section: 'dobirky', crumb: 'Подарунки гостям на весілля', kicker: 'Добірки', form: 'corporate-gifts' },
  khellovin: { path: '/dobirky/keramika-na-khellovin', section: 'dobirky', crumb: 'Кераміка на Хелловін', kicker: 'Добірки', form: 'corporate-gifts' },
  vypal: { path: '/dobirky/de-vypalyty-keramiku', section: 'dobirky', crumb: 'Де випалити кераміку', kicker: 'Добірки', form: 'other' },
  suveniry: { path: '/dobirky/suveniry-z-ukrainy', section: 'dobirky', crumb: 'Сувеніри з України', kicker: 'Добірки', form: 'corporate-gifts' },
  interyer: { path: '/dobirky/keramika-dlya-interyeru', section: 'dobirky', crumb: 'Кераміка для інтер’єру', kicker: 'Добірки', form: 'other' },
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
  | ({ id: 'symvol-2027' } & Awaited<ReturnType<typeof symbolData>>)
  | ({ id: 'svichnyky' } & Awaited<ReturnType<typeof candlesticksData>>)
  | ({ id: 'rizdvianyi-posud' } & Awaited<ReturnType<typeof christmasTableData>>)
  | ({ id: 'patriotychni-podarunky' } & Awaited<ReturnType<typeof patrioticData>>)
  | ({ id: 'chaini-tseremonii' } & Awaited<ReturnType<typeof teaData>>)
  | ({ id: 'vesillia' } & Awaited<ReturnType<typeof weddingData>>)
  | ({ id: 'khellovin' } & Awaited<ReturnType<typeof halloweenData>>)
  | ({ id: 'vypal' } & Awaited<ReturnType<typeof kilnData>>)
  | ({ id: 'interyer' } & Awaited<ReturnType<typeof interiorData>>)
  | ({ id: 'suveniry' } & Awaited<ReturnType<typeof souvenirData>>)

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
    case 'symvol-2027': return { id, ...(await symbolData()) }
    case 'svichnyky': return { id, ...(await candlesticksData()) }
    case 'rizdvianyi-posud': return { id, ...(await christmasTableData()) }
    case 'patriotychni-podarunky': return { id, ...(await patrioticData()) }
    case 'chaini-tseremonii': return { id, ...(await teaData()) }
    case 'vesillia': return { id, ...(await weddingData()) }
    case 'khellovin': return { id, ...(await halloweenData()) }
    case 'vypal': return { id, ...(await kilnData()) }
    case 'interyer': return { id, ...(await interiorData()) }
    case 'suveniry': return { id, ...(await souvenirData()) }
  }
}

/** Studios a page lists (for the ItemList JSON-LD). */
export const waveBStudios = (d: WaveBData): StudioCard[] =>
  d.id === 'brendy-posudu' || d.id === 'yalynkovi-prykrasy' || d.id === 'pratsyuyut-z-biznesom' || d.id === 'dohliad-za-keramikoyu' || d.id === 'symvol-2027' || d.id === 'svichnyky' || d.id === 'rizdvianyi-posud' || d.id === 'patriotychni-podarunky' || d.id === 'chaini-tseremonii' || d.id === 'vesillia' || d.id === 'khellovin' || d.id === 'vypal' || d.id === 'interyer' || d.id === 'suveniry'
    ? d.studios
    : d.id === 'chornodymlena-i-molochena'
      ? [...new Map([...d.black, ...d.milk].map((s) => [s.id, s])).values()]
      : d.id === 'vydy-keramiky'
        ? [...new Map(d.groups.flatMap((g) => g.studios).map((s) => [s.id, s])).values()]
        : []

/** Every live wave B page (copy exists), for the sitemap, llms.txt and the section index pages. */
export async function liveWaveBPages(): Promise<{ id: WaveBId; path: string; section: Section; title: string; summary: string; updated?: string }[]> {
  const out: { id: WaveBId; path: string; section: Section; title: string; summary: string; updated?: string }[] = []
  for (const id of WAVE_B_IDS) {
    const c = waveBCopy(id)
    if (!c) continue
    const f = fillCopy(c, (await waveBData(id)).vars)
    out.push({ id, path: WAVE_B[id].path, section: WAVE_B[id].section, title: f.title, summary: f.metaDescription, updated: c.updated })
  }
  return out
}

