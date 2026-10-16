// The site search index (src/lib/search/engine.ts): every public page a search should land on, with the words it is
// found by. Built from the same sources as catalog-sitemap.xml, so search never links to a page that is not live.
import { unstable_cache } from 'next/cache'

import { guides } from '@/content/guides'
import { mainNav, simpleNav, utilityNav } from '@/content/navigation'
import { topicList } from '@/content/topics'
import { certificateCities } from '@/editorial/topics'
import { liveCasePages } from '@/editorial/cases'
import { FORMAT_PAGES, formatCityData, liveFixedWavePages, liveFormatCityPages } from '@/editorial/wave-a'
import { liveWaveBPages } from '@/editorial/wave-b'
import { liveWaveCPages } from '@/editorial/wave-c'
import { centreOf, cityPages, getAllStudios, getCatalog, igHandle, offersMasterClasses, pluralUk, TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { makerCities } from '@/lib/makers'
import { MK_CHIPS } from '@/lib/mkChips'
import { fmt, roundNice } from '@/lib/money'
import { studioPrice } from '@/lib/priceIndex'
import { productChips } from '@/lib/products'
import { cleanName, displayName, inCity, pageName, staleNote } from '@/lib/present'
import { prepare, search, type SearchDoc, type SearchIndex } from '@/lib/search/engine'
import type { StudioFormat } from '@/shared/options'

const places = (n: number) => `${fmt(n)} ${pluralUk(n, ['місце', 'місця', 'місць'])}`
const makers = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])}`
// The first sentence of a meta description, as a one-line subtitle.
const firstLine = (text: string) => text.split(/(?<=[.!?])\s/u)[0].replace(/[.:;]$/u, '')
// The mono kicker over a page row, by section.
const SECTIONS: [RegExp, string][] = [
  [/^\/maister-klasy/, 'Майстер-класи'],
  [/^\/sertyfikaty/, 'Сертифікати'],
  [/^\/dlya-biznesu/, 'Для бізнесу'],
  [/^\/hayidy/, 'Гайд'],
  [/^\/dobirky/, 'Добірка'],
  [/\/keisy\//, 'Кейс'],
  [/^\/vyrobnyky/, 'Виробники кераміки'],
  [/^\/tsiny/, 'Ціни'],
]
const sectionOf = (path: string) => SECTIONS.find(([re]) => re.test(path))?.[1] ?? 'Сторінка'
const cityOf = (p: { city: { slug?: string | null }; towns: { city: { slug?: string | null } }[] }) =>
  [p.city.slug, ...p.towns.map((t) => t.city.slug)].filter((s): s is string => Boolean(s))

function studioDoc(s: StudioCard): SearchDoc {
  // The studio's own single-class price (adults, per person), as on the city pages' rows.
  const price = offersMasterClasses(s) ? studioPrice(s, 'group') : null
  const centre = centreOf(s.cityDoc)
  const name = displayName(s)
  const formats = MK_CHIPS.filter(([f]) => s.formats?.includes(f)).map(([, label]) => label)
  const products = productChips(s)
  const other = [cleanName(s.name) !== name ? s.name : '', ...(s.alternateNames ?? []).map((a) => a.text), igHandle(s.instagram), products.join(' ')]
  return {
    k: 'studio',
    t: name,
    u: `/vyrobnyky/${s.slug}`,
    m: [TYPE_LABEL[s.type ?? 'studio'] ?? 'Студія', s.cityDoc?.name].filter(Boolean).join(' · '),
    s: [...formats.slice(0, 4), ...products.slice(0, 2)].join(' · ') || undefined,
    w: other.filter(Boolean).join(' '),
    // Its town first, then the oblast centre whose page lists it: «Львів» finds Truskavets too, below Lviv itself.
    c: s.cityDoc?.slug ? [...new Set([s.cityDoc.slug, centre ?? s.cityDoc.slug])] : undefined,
    ...(price ? { p: roundNice(price) } : {}),
    f: s.formats?.length ? s.formats : undefined,
    ...(s.status === 'closed' ? { x: 'закрито' } : s.unverified ? { x: staleNote(s) || 'активність не підтверджена' } : {}),
  }
}

export async function buildSearchIndex(): Promise<SearchIndex> {
  const [catalog, studios] = await Promise.all([getCatalog(), getAllStudios()])
  const docs = new Map<string, SearchDoc>() // by path; the first source of a path wins (most specific first)
  const add = (d: SearchDoc) => !docs.has(d.u) && docs.set(d.u, d)

  for (const p of await liveFormatCityPages()) {
    const { vars, place } = await formatCityData(p.city, p.format)
    const f = FORMAT_PAGES[p.format]
    add({ k: 'page', m: 'Майстер-класи', t: `${f.label} ${inCity(place)}`, u: `/maister-klasy/${p.city}/${p.format}`, s: [places(p.count), vars.priceRange].filter(Boolean).join(' · '), c: [p.city], f: [f.topic as StudioFormat], n: p.count })
  }
  for (const p of cityPages(studios.filter(offersMasterClasses)))
    add({ k: 'city', m: 'Майстер-класи', t: pageName(p), u: `/maister-klasy/${p.city.slug}`, s: `${places(p.studios.length)} для майстер-класу`, c: cityOf(p), n: p.studios.length })
  for (const p of await makerCities())
    add({ k: 'page', m: 'Виробники кераміки', t: `Кераміка ручної роботи: ${pageName(p)}`, u: `/vyrobnyky/misto/${p.city.slug}`, s: makers(p.studios.length), c: cityOf(p), n: p.studios.length })
  for (const c of await certificateCities())
    add({ k: 'page', m: 'Сертифікати', t: `Подарункові сертифікати на гончарство: ${c.name}`, u: `/sertyfikaty/${c.slug}`, s: 'Сертифікати на майстер-клас з кераміки', c: [c.slug!], f: ['certificates'] })
  for (const t of topicList) add({ k: 'page', m: sectionOf(t.path), t: t.h1, u: t.path, s: t.ogSub, f: [...new Set(t.lists.flatMap((l) => l.formats))] })
  for (const g of guides) add({ k: 'guide', m: 'Гайд', t: g.h1, u: g.path, s: g.short })
  // The written pages of src/editorial/registry.ts, without wave A's format × city ones (added above; recounting them doubles the build).
  const written = [...(await liveFixedWavePages()), ...(await liveWaveBPages()), ...(await liveWaveCPages()), ...liveCasePages()]
  for (const p of written) add({ k: 'page', m: sectionOf(p.path), t: p.title.replace(/ · Глина$/u, ''), u: p.path, s: firstLine(p.summary) })
  const navLinks = [...mainNav.flatMap((s) => s.columns.flatMap((c) => c.links.map((l) => ({ ...l, note: l.note ?? c.title })))), ...simpleNav, ...utilityNav]
  // A menu label is how people name a page («Гончарне коло»): a page already in the index is found by it too.
  for (const l of navLinks) {
    if (!l.href.startsWith('/') || l.href.includes('#') || l.href.includes('?')) continue
    const d = docs.get(l.href)
    if (!d) add({ k: 'page', m: sectionOf(l.href), t: l.label, u: l.href, s: l.note })
    else if (!d.t.toLowerCase().includes(l.label.toLowerCase())) d.w = [d.w, l.label].filter(Boolean).join(' ')
  }
  for (const s of catalog) if (s.slug) add(studioDoc(s))

  const cities = new Map<string, string>()
  for (const s of catalog) if (s.cityDoc?.slug) cities.set(s.cityDoc.slug, s.cityDoc.name)
  return { v: 1, at: new Date().toISOString(), cities: [...cities], docs: [...docs.values()] }
}

/** The index as served: cached with the catalogue (a studio edit refreshes it), at most a day old. */
export const getSearchIndex = unstable_cache(buildSearchIndex, ['search-index-v1'], { revalidate: 86400, tags: ['studios'] })

// The prepared index of this server process, rebuilt when the cached index changes.
let prepared: { at: string; p: ReturnType<typeof prepare> } | null = null
/** /poshuk: the same search the header runs in the browser, with longer lists. */
export async function searchCatalog(q: string) {
  const index = await getSearchIndex()
  if (prepared?.at !== index.at) prepared = { at: index.at, p: prepare(index) }
  return { index, result: search(prepared.p, q, { cities: 6, studios: 30, pages: 20 }) }
}
