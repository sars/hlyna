// The site search index (src/lib/search/engine.ts): every public page a search should land on, with the words it is
// found by. Built from the same sources as catalog-sitemap.xml, so search never links to a page that is not live.
import { guides } from '@/content/guides'
import { mainNav, simpleNav, utilityNav } from '@/content/navigation'
import { topicList } from '@/content/topics'
import { certificateCities } from '@/editorial/topics'
import { liveWrittenPages } from '@/editorial/registry'
import { FORMAT_PAGES, formatCityData, liveFormatCityPages } from '@/editorial/wave-a'
import { cityPages, getAllStudios, getCatalog, igHandle, offersMasterClasses, pluralUk, TYPE_LABEL, type StudioCard } from '@/lib/catalog'
import { makerCities } from '@/lib/makers'
import { MK_CHIPS } from '@/lib/mkChips'
import { fmt } from '@/lib/money'
import { productChips } from '@/lib/products'
import { cleanName, displayName, inCity, pageName } from '@/lib/present'
import type { SearchDoc, SearchIndex } from '@/lib/search/engine'
import type { StudioFormat } from '@/shared/options'

const places = (n: number) => `${fmt(n)} ${pluralUk(n, ['місце', 'місця', 'місць'])}`
const makers = (n: number) => `${fmt(n)} ${pluralUk(n, ['студія чи майстер', 'студії й майстри', 'студій і майстрів'])}`
// The first sentence of a meta description, as a one-line subtitle.
const firstLine = (text: string) => text.split(/(?<=[.!?])\s/u)[0].replace(/[.:;]$/u, '')
const cityOf = (p: { city: { slug?: string | null }; towns: { city: { slug?: string | null } }[] }) =>
  [p.city.slug, ...p.towns.map((t) => t.city.slug)].filter((s): s is string => Boolean(s))

function studioDoc(s: StudioCard): SearchDoc {
  const name = displayName(s)
  const formats = MK_CHIPS.filter(([f]) => s.formats?.includes(f)).map(([, label]) => label)
  const products = productChips(s)
  const kind = s.type && s.type !== 'studio' ? TYPE_LABEL[s.type] : null
  const other = [cleanName(s.name) !== name ? s.name : '', ...(s.alternateNames ?? []).map((a) => a.text), igHandle(s.instagram), products.join(' ')]
  return {
    k: 'studio',
    t: name,
    u: `/vyrobnyky/${s.slug}`,
    s: [s.cityDoc?.name, kind, [...formats.slice(0, 3), ...products.slice(0, 2)].join(', ')].filter(Boolean).join(' · '),
    w: other.filter(Boolean).join(' '),
    c: s.cityDoc?.slug ? [s.cityDoc.slug] : undefined,
    f: s.formats?.length ? s.formats : undefined,
    ...(s.status === 'closed' || s.unverified ? { x: 1 as const } : {}),
  }
}

export async function buildSearchIndex(): Promise<SearchIndex> {
  const [catalog, studios] = await Promise.all([getCatalog(), getAllStudios()])
  const docs = new Map<string, SearchDoc>() // by path; the first source of a path wins (most specific first)
  const add = (d: SearchDoc) => !docs.has(d.u) && docs.set(d.u, d)

  for (const p of await liveFormatCityPages()) {
    const { vars, place } = await formatCityData(p.city, p.format)
    const f = FORMAT_PAGES[p.format]
    add({ k: 'page', t: `${f.label} ${inCity(place)}`, u: `/maister-klasy/${p.city}/${p.format}`, s: [places(p.count), vars.priceRange].filter(Boolean).join(' · '), c: [p.city], f: [f.topic as StudioFormat], n: p.count })
  }
  for (const p of cityPages(studios.filter(offersMasterClasses)))
    add({ k: 'city', t: pageName(p), u: `/maister-klasy/${p.city.slug}`, s: `Майстер-класи з кераміки: ${places(p.studios.length)}`, c: cityOf(p), n: p.studios.length })
  for (const p of await makerCities())
    add({ k: 'page', t: `Кераміка ручної роботи: ${pageName(p)}`, u: `/vyrobnyky/misto/${p.city.slug}`, s: makers(p.studios.length), c: cityOf(p), n: p.studios.length })
  for (const c of await certificateCities())
    add({ k: 'page', t: `Подарункові сертифікати на гончарство: ${c.name}`, u: `/sertyfikaty/${c.slug}`, s: 'Сертифікати на майстер-клас з кераміки', c: [c.slug!], f: ['certificates'] })
  for (const t of topicList) add({ k: 'page', t: t.h1, u: t.path, s: t.kicker, f: [...new Set(t.lists.flatMap((l) => l.formats))] })
  for (const g of guides) add({ k: 'guide', t: g.h1, u: g.path, s: g.kicker })
  for (const p of await liveWrittenPages()) add({ k: 'page', t: p.title.replace(/ · Глина$/u, ''), u: p.path, s: firstLine(p.summary) })
  const navLinks = [...mainNav.flatMap((s) => s.columns.flatMap((c) => c.links.map((l) => ({ ...l, note: l.note ?? c.title })))), ...simpleNav, ...utilityNav]
  // A menu label is how people name a page («Гончарне коло»): a page already in the index is found by it too.
  for (const l of navLinks) {
    if (!l.href.startsWith('/') || l.href.includes('#') || l.href.includes('?')) continue
    const d = docs.get(l.href)
    if (!d) add({ k: 'page', t: l.label, u: l.href, s: l.note })
    else if (!d.t.toLowerCase().includes(l.label.toLowerCase())) d.w = [d.w, l.label].filter(Boolean).join(' ')
  }
  for (const s of catalog) if (s.slug) add(studioDoc(s))

  const cities = new Map<string, string>()
  for (const s of catalog) if (s.cityDoc?.slug) cities.set(s.cityDoc.slug, s.cityDoc.name)
  return { v: 1, at: new Date().toISOString(), cities: [...cities], docs: [...docs.values()] }
}
