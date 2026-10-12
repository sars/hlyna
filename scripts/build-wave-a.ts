/**
 * Wave A: build the data packs writers use (one JSON per page) and the derived shop data the pages render.
 *   HLYNA_SCRIPT=1 pnpm exec tsx scripts/build-wave-a.ts
 * Reads the published catalogue (same filters as the site) plus research files in UkraineCeramics, writes:
 *   - UkraineCeramics/_site_content/waveA/data/<id>.json and INDEX.json (for writers; nothing invented)
 *   - src/content/waveA/etsy-shops.json, stockists.json (rendered on /de-kupyty-keramiku)
 * Copy itself is written separately and synced with scripts/sync-wave-a.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'

import { topics } from '../src/content/topics'
import { getAllStudios, groupByCity, hasFormat, MIN_LIST, offersMasterClasses, type StudioCard } from '../src/lib/catalog'
import { facts } from '../src/lib/facts'
import { cleanName, firstAddress, inCity, publicPrices } from '../src/lib/present'
import { evidenceLine, topicData } from '../src/editorial/topics'
import { FORMAT_PAGES, formatCityCandidates, formatCityId, giftsData, partyData, partyLines, whereToBuyData, type FormatSlug, type WaveVars } from '../src/editorial/wave-a'
import { typicalRange } from '../src/lib/money'

const ROOT = '/Users/rodik/Claude/UkraineCeramics'
const OUT = path.join(ROOT, '_site_content/waveA')
const REPO_CONTENT = path.resolve('src/content/waveA')
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true })

const jsonl = (f: string) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>)
    : []
const str = (v: unknown) => (typeof v === 'string' ? v : '')

// ---------- research inputs ----------

const igNotes = new Map(jsonl(path.join(ROOT, '09_instagram/posts_scan/ig_notes.jsonl')).map((n) => [str(n.slug), n]))
const events = jsonl(path.join(ROOT, '_master/events.jsonl'))
const museums = jsonl(path.join(ROOT, '15_galleries_museums/entries_galleries_museums.jsonl'))
const cityText = (slug: string) => {
  const f = path.resolve(`src/content/places/cities/${slug}.json`)
  if (!fs.existsSync(f)) return null
  const c = JSON.parse(fs.readFileSync(f, 'utf8')) as { lead: string; scene: string[] }
  return { lead: c.lead, firstParagraph: c.scene[0] ?? '' }
}
const month = (d?: string | null) => (d ? d.slice(0, 7) : null)

const studioInfo = (s: StudioCard, re?: RegExp, priceRe?: RegExp) => {
  const n = igNotes.get(s.slug!)
  return {
    name: cleanName(s.name),
    slug: s.slug,
    type: s.type,
    city: s.cityDoc?.name ?? null,
    address: firstAddress(s.address) || null,
    formats: s.formats ?? [],
    alternateNames: (s.alternateNames ?? []).map((x) => x.text).filter(Boolean),
    summary: s.summary ?? '',
    evidence: re ? evidenceLine(s, re) : '',
    prices: publicPrices(s)
      .filter((p) => !priceRe || priceRe.test(p.text))
      .map((p) => (p.source ? `${p.text} (${p.source})` : p.text)),
    services: (s.services ?? []).map((x) => x.text).filter((t) => !re || re.test(t)),
    instagram: s.instagram ?? null,
    instagramNote: str(n?.note) || null,
    lastPost: month(s.activity?.lastPostDate),
    recentNote: s.recentNote || null,
  }
}

const eventsIn = (cityName: string) =>
  events
    .filter((e) => str(e.city) === cityName && str(e.status) !== 'ended')
    .map((e) => ({ name: str(e.name), kind: str(e.kind), dates: str(e.dates), nextDate: str(e.next_date), venue: str(e.venue), recurrence: str(e.recurrence) }))
const museumsIn = (cityName: string) => museums.filter((m) => str(m.city) === cityName).map((m) => ({ name: str(m.name), type: str(m.type), address: str(m.address) }))

const stats = (amounts: number[]) => {
  if (!amounts.length) return null
  const r = typicalRange(amounts)!
  const sorted = [...amounts].sort((a, b) => a - b)
  return { p10: r.min, median: sorted[Math.floor(sorted.length / 2)], p90: r.max, n: amounts.length, rawMin: sorted[0], rawMax: sorted[sorted.length - 1] }
}

const index: { id: string; url: string; kind: string; count: number; h1: string }[] = []
const write = (id: string, pack: Record<string, unknown>) => {
  fs.writeFileSync(path.join(OUT, 'data', `${id}.json`), JSON.stringify({ id, ...pack }, null, 1) + '\n')
  index.push({ id, url: String(pack.url), kind: String(pack.kind), count: Number(pack.count ?? 0), h1: String(pack.h1Suggestion ?? '') })
}

const all = await getAllStudios()
const f = await facts()

// ---------- 1. format × city ----------

const candidates = await formatCityCandidates()
const byFormat = new Map<FormatSlug, { city: string; cityName: string; count: number }[]>()
for (const c of candidates) byFormat.set(c.format, [...(byFormat.get(c.format) ?? []), c])
const mkByCity = new Map(groupByCity(all.filter(offersMasterClasses)).map((g) => [g.city.slug!, g.studios]))
const NATIONAL_KEY: Partial<Record<FormatSlug, string>> = { 'dlya-dvokh': 'couple', 'dlya-ditey': 'kids', kursy: 'course' }

for (const c of candidates) {
  const meta = FORMAT_PAGES[c.format]
  const topic = topics[meta.topic]
  const d = await topicData(topic, c.city)
  const st = stats(d.amounts)
  const studios = d.all.map((s) => studioInfo(s, topic.evidence, topic.price.re))
  const ranked = (byFormat.get(c.format) ?? []).sort((a, b) => b.count - a.count)
  const rank = ranked.findIndex((x) => x.city === c.city) + 1
  const priced = studios.flatMap((s) => s.prices.map((t) => ({ studio: s.name, slug: s.slug, text: t })))
  const amountOf = (t: string) => Number(t.match(/(\d[\d\s]{1,6})\s*(?:грн|₴)/)?.[1]?.replace(/\s/g, '') ?? NaN)
  const pricedSorted = priced.filter((p) => !Number.isNaN(amountOf(p.text))).sort((a, b) => amountOf(a.text) - amountOf(b.text))
  const mkTotal = mkByCity.get(c.city)?.length ?? 0
  const streets = new Map<string, number>()
  for (const s of studios) {
    const m = s.address?.match(/(?:вул\.|вулиця|просп\.|проспект|пл\.|площа|бульв\.|бульвар|пров\.|провулок|узвіз)\s*[^,]+/iu)
    if (m) streets.set(m[0].trim(), (streets.get(m[0].trim()) ?? 0) + 1)
  }
  const siblings = (Object.keys(FORMAT_PAGES) as FormatSlug[])
    .filter((x) => x !== c.format)
    .map((x) => ({ format: x, label: FORMAT_PAGES[x].label, count: candidates.find((k) => k.city === c.city && k.format === x)?.count ?? 0 }))
  const fresh = studios.filter((s) => s.instagramNote && s.lastPost && s.lastPost >= '2026-07')
  const national = NATIONAL_KEY[c.format] ? f.get(NATIONAL_KEY[c.format]!) : null
  const distinctiveFacts = [
    pricedSorted[0] && `Найдешевший рядок у прайсах: ${pricedSorted[0].studio} — ${pricedSorted[0].text}`,
    pricedSorted.length > 1 && `Найдорожчий рядок: ${pricedSorted[pricedSorted.length - 1].studio} — ${pricedSorted[pricedSorted.length - 1].text}`,
    `${d.all.length} з ${mkTotal} місць для майстер-класів ${inCity(c.cityName)} мають цей формат`,
    rank > 0 && `${rank}-е місто з ${ranked.length} за кількістю місць у форматі «${meta.label}»`,
    national && st && `Медіана ${inCity(c.cityName)} ${st.median} грн проти ${national.median} грн по Україні (${national.unit})`,
    streets.size > 0 && `Вулиці з адрес: ${[...streets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => (v > 1 ? `${k} (${v})` : k)).join('; ')}`,
    fresh.length > 0 && `Свіже з Instagram (з липня 2026): ${fresh.slice(0, 3).map((s) => `${s.name}: ${s.instagramNote}`).join(' | ')}`,
    `Ці ж місця також: ${(['kids', 'couples', 'courses', 'certificates', 'corporate-workshop'] as const).map((t) => `${t} ${d.all.filter((s) => hasFormat(s, t)).length}`).join(', ')}`,
  ].filter(Boolean)
  const vars: WaveVars = { count: d.all.length, city: c.cityName, inCity: inCity(c.cityName), median: st?.median, priceRange: st ? `від ${st.p10} до ${st.p90} грн` : undefined }
  write(formatCityId(c.city, c.format), {
    kind: 'format-city',
    url: `/maister-klasy/${c.city}/${c.format}`,
    h1Suggestion: `${meta.label} ${inCity(c.cityName)}`,
    format: { slug: c.format, label: meta.label, nationalPage: topic.path },
    city: { slug: c.city, name: c.cityName, locative: inCity(c.cityName) },
    count: d.all.length,
    priceStats: st,
    priceScope: topic.price.title,
    placeholders: vars,
    studios,
    cityContext: cityText(c.city),
    events: eventsIn(c.cityName),
    museums: c.format === 'rozpys' || c.format === 'kursy' ? museumsIn(c.cityName) : [],
    siblingsSameCity: siblings,
    sameFormatOtherCities: ranked.filter((x) => x.city !== c.city).slice(0, 6).map((x) => ({ city: x.cityName, count: x.count })),
    nationalPrice: national,
    distinctiveFacts,
  })
}

// ---------- 2. where to buy ----------

const etsyRaw = jsonl(path.join(ROOT, '05_marketplaces_prices/entries_etsy_browser.jsonl'))
const byInsta = new Map(all.filter((s) => s.instagram).map((s) => [s.instagram!.replace(/\/$/, '').toLowerCase(), s]))
// Etsy shop headers give "1.1k" for counts over a thousand.
const etsyNum = (v?: string) => {
  if (!v) return undefined
  const t = v.replace(/\s/g, '').replace(',', '.')
  const n = t.endsWith('k') ? Math.round(Number(t.slice(0, -1)) * 1000) : Number(t)
  return Number.isFinite(n) && n > 0 ? n : undefined
}
const etsy = etsyRaw
  .map((e) => {
    const desc = str(e.description)
    const url = (Array.isArray(e.other_links) ? (e.other_links as string[]) : []).find((u) => /etsy\.com\/shop\//.test(u)) ?? ''
    const loc = desc.match(/локація «([^»]+)»/)?.[1] ?? ''
    const s = byInsta.get(str(e.instagram).replace(/\/$/, '').toLowerCase())
    return {
      shop: url.split('/shop/')[1]?.split(/[/?]/)[0] ?? str(e.name),
      url,
      location: loc,
      rating: Number(desc.match(/рейтинг ([\d.]+)/)?.[1]) || undefined,
      reviews: etsyNum(desc.match(/\(([\d.,]+k?) відгук/)?.[1]),
      sales: etsyNum(desc.match(/продажів ([\d.,\s]+k?)/)?.[1]),
      years: desc.match(/на Etsy ([^,]+)/)?.[1],
      items: Number(desc.match(/товарів (\d+)/)?.[1]) || undefined,
      slug: s?.slug ?? undefined,
      name: s ? cleanName(s.name) : str(e.name),
    }
  })
  .filter((e) => e.url && /ukrain|україн/i.test(e.location))
fs.writeFileSync(path.join(REPO_CONTENT, 'etsy-shops.json'), JSON.stringify(etsy, null, 1) + '\n')

const stockRaw = jsonl(path.join(ROOT, '02_brands/entries_stockists.jsonl')).filter((e) => str(e.type) === 'shop' && str(e.city))
const byName = new Map(all.map((s) => [cleanName(s.name).toLowerCase(), s]))
const stockists = stockRaw.map((e) => {
  const s = byInsta.get(str(e.instagram).replace(/\/$/, '').toLowerCase()) ?? byName.get(cleanName(str(e.name)).toLowerCase())
  const brands = str(e.description).match(/(?:Керамічні бренди|бренди кераміки|Кераміка)[^:]*:\s*([^.]+)/i)?.[1]?.trim() ?? ''
  return { name: str(e.name), city: str(e.city), address: str(e.address), website: str(e.website), instagram: str(e.instagram), brands: brands ? `Кераміка: ${brands}` : '', slug: s?.slug ?? undefined }
})
fs.writeFileSync(path.join(REPO_CONTENT, 'stockists.json'), JSON.stringify(stockists, null, 1) + '\n')

{
  const w = await whereToBuyData()
  const shops = w.shops
  const groups = w.shopCities
  const brandSites = w.online
  const markets = events.filter((e) => /market|fair|ярмар|маркет/i.test(`${str(e.kind)} ${str(e.name)}`) && str(e.status) !== 'ended')
  write('de-kupyty-keramiku', {
    kind: 'where-to-buy',
    url: '/de-kupyty-keramiku',
    h1Suggestion: 'Де купити сучасну українську кераміку',
    count: shops.length,
    // etsy-shops.json was just rewritten above; the page module read the previous file, so count from the fresh list.
    placeholders: { ...w.vars, etsy: etsy.length, etsySales: etsy.reduce((n, e) => n + (e.sales ?? 0), 0) },
    shopsByCity: groups.map((g) => ({ city: g.city.name, shops: g.studios.map((s) => ({ ...studioInfo(s), stockistBrands: stockists.find((x) => x.slug === s.slug)?.brands ?? '' })) })),
    stockistsNotInCatalogue: stockists.filter((x) => !x.slug),
    etsy,
    makersWithOwnSalesChannels: brandSites.slice(0, 120).map((s) => ({ name: cleanName(s.name), slug: s.slug, city: s.cityDoc?.name, website: s.website, channels: (s.salesChannels ?? []).map((x) => x.text) })),
    makersWithOwnSalesChannelsTotal: brandSites.length,
    marketsAndFairs: markets.map((e) => ({ name: str(e.name), city: str(e.city), dates: str(e.dates), nextDate: str(e.next_date), recurrence: str(e.recurrence), venue: str(e.venue) })),
    distinctiveFacts: [
      `Магазинів і галерей у каталозі: ${shops.length} у ${groups.length} містах; найбільше — ${groups.slice(0, 3).map((g) => `${g.city.name} (${g.studios.length})`).join(', ')}`,
      etsy[0] && `Найбільший за продажами Etsy-магазин з України: ${etsy.sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))[0].name} — ${etsy[0].sales} продажів`,
      `Etsy-магазинів з локацією в Україні: ${etsy.length}, разом ${etsy.reduce((n, e) => n + (e.sales ?? 0), 0)} продажів`,
      `Майстрів і брендів з власним сайтом або каналом продажу: ${brandSites.length}`,
      markets.length > 0 && `Ярмарки й маркети в даних: ${markets.slice(0, 4).map((e) => `${str(e.name)} (${str(e.city)})`).join('; ')}`,
    ].filter(Boolean),
  })
}

// ---------- 3. gifts ----------

{
  const g = await giftsData()
  const pack = (items: typeof g.items) => items.map((i) => ({ studio: cleanName(i.studio.name), slug: i.studio.slug, city: i.studio.cityDoc?.name, amount: i.amount, line: i.text, source: i.source ?? null }))
  const studios = [...new Map(g.items.map((i) => [i.studio.id, i.studio])).values()]
  write('podarunky-z-keramiky', {
    kind: 'gifts',
    url: '/podarunky-z-keramiky',
    h1Suggestion: 'Подарунки з кераміки ручної роботи: що є в прайсах студій',
    count: studios.length,
    placeholders: g.vars,
    tiers: g.tiers.map((t) => ({ key: t.key, label: t.label, count: t.items.length, items: pack(t.items) })),
    occasions: g.occasions.map((o) => ({ key: o.key, label: o.label, count: o.items.length, items: pack(o.items).slice(0, 25) })),
    distinctiveFacts: [
      `${g.items.length} цінових рядків виробів від ${studios.length} студій і майстрів`,
      ...g.tiers.map((t) => `${t.label}: ${t.items.length} студій; найдешевше — ${t.items[0] ? `${cleanName(t.items[0].studio.name)}: ${t.items[0].text}` : '—'}`),
      `Типовий діапазон: ${g.vars.priceRange ?? '—'}, медіана ${g.vars.median ?? '—'}`,
    ],
  })
}

// ---------- 4. birthdays ----------

{
  const p = await partyData()
  write('mk-den-narodzhennya', {
    kind: 'party',
    url: '/maister-klasy/den-narodzhennya',
    h1Suggestion: 'День народження в гончарній студії',
    count: p.studios.length,
    placeholders: p.vars,
    byCity: p.groups.map((g) => ({
      city: g.city.name,
      count: g.studios.length,
      studios: g.studios.map((s) => {
        const l = partyLines(s)
        return { ...studioInfo(s), partyPrices: l.prices.map((x) => (x.source ? `${x.text} (${x.source})` : x.text)), partyServices: l.services, groupSize: l.group ?? null }
      }),
    })),
    nationalKidsPrice: f.get('kids'),
    distinctiveFacts: [
      `${p.studios.length} студій у ${p.groups.length} містах згадують дні народження, свята чи дівич-вечори`,
      `Найбільше — ${p.groups.slice(0, 3).map((g) => `${g.city.name} (${g.studios.length})`).join(', ')}`,
      p.vars.priceRange && `Ціни в рядках про свята: ${p.vars.priceRange}`,
    ].filter(Boolean),
  })
}

const counts = index.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.kind]: (acc[x.kind] ?? 0) + 1 }), {})
fs.writeFileSync(path.join(OUT, 'INDEX.json'), JSON.stringify({ generated: new Date().toISOString(), counts, minPlaces: MIN_LIST, pages: index }, null, 1) + '\n')
console.log(JSON.stringify(counts), 'etsy', etsy.length, 'stockists', stockists.length)
process.exit(0)
