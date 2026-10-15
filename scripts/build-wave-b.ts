/**
 * Wave B: build the data packs writers use (one JSON per page) and the derived data the pages render.
 *   HLYNA_SCRIPT=1 pnpm exec tsx scripts/build-wave-b.ts
 * Reads the published catalogue (same filters as the site) plus research files in UkraineCeramics, writes:
 *   - UkraineCeramics/_site_content/waveB/data/<id>.json and INDEX.json (for writers; nothing invented)
 *   - src/content/waveB/events.json, museums.json (rendered on /podiyi and /muzei-keramiky)
 * Copy is written separately (format: _site_content/waveB/COPY_FORMAT.md) and synced with scripts/sync-wave-b.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'

import { confirmedForVenues, getAllStudios, groupByCity, hasFormat, type StudioCard } from '../src/lib/catalog'
import { facts } from '../src/lib/facts'
import { cleanName, firstAddress, publicPrices } from '../src/lib/present'
import { productText } from '../src/lib/products'
import { evidenceLine } from '../src/editorial/topics'
import {
  BLACK_SMOKED, businessData, careData, CARE, etsyData, MATERIALS, materialsData, MILK_FIRED, NEW_YEAR, newYearData,
  smokeData, tablewareBrandsData, WAVE_B, type EventItem, type MuseumItem, type WaveBId,
} from '../src/editorial/wave-b'
import type { WaveVars } from '../src/editorial/wave-a'

const ROOT = '/Users/rodik/Claude/UkraineCeramics'
const OUT = path.join(ROOT, '_site_content/waveB')
const REPO_CONTENT = path.resolve('src/content/waveB')
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true })

const jsonl = (f: string) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>)
    : []
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(str).filter(Boolean) : [])
const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const month = (d?: string | null) => (d ? d.slice(0, 7) : null)

const igNotes = new Map(jsonl(path.join(ROOT, '09_instagram/posts_scan/ig_notes.jsonl')).map((n) => [str(n.slug), n]))
const all = await getAllStudios()
const f = await facts()

const studioInfo = (s: StudioCard, re?: RegExp) => {
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
    products: (s.products ?? []).map((x) => x.text).slice(0, 15),
    prices: publicPrices(s).map((p) => (p.source ? `${p.text} (${p.source})` : p.text)).slice(0, 12),
    b2b: { minOrder: s.b2b?.minOrder ?? null, leadTime: s.b2b?.leadTime ?? null, logoMethods: (s.b2b?.logoMethods ?? []).map((x) => x.text) },
    website: s.website ?? null,
    instagram: s.instagram ?? null,
    instagramNote: str(n?.note) || null,
    lastPost: month(s.activity?.lastPostDate),
    followers: s.activity?.followers ?? null,
    salesChannels: (s.salesChannels ?? []).map((x) => x.text),
  }
}

const index: { id: string; url: string; kind: string; count: number; h1: string; placeholders: string[] }[] = []
const write = (id: WaveBId, pack: Record<string, unknown> & { placeholders: WaveVars }) => {
  fs.writeFileSync(path.join(OUT, 'data', `${id}.json`), JSON.stringify({ id, url: WAVE_B[id].path, ...pack }, null, 1) + '\n')
  index.push({ id, url: WAVE_B[id].path, kind: String(pack.kind), count: Number(pack.placeholders.count ?? 0), h1: String(pack.h1Suggestion ?? ''), placeholders: Object.keys(pack.placeholders) })
}

// ---------- events (rendered list + pack) ----------

const ABROAD = /литва|італія|велика британія|фінляндія|польща|німеччина|чехія|франція|сша/iu
const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень']
const evRaw = jsonl(path.join(ROOT, '_master/events.jsonl'))
const events: (EventItem & { description: string; participants: string[]; organizer: string; ceramicsShare: string; lastEdition: string; sources: string[] })[] = evRaw
  .filter((e) => !ABROAD.test(str(e.city)))
  .map((e) => {
    const name = str(e.name)
    let status = str(e.status)
    // Known from research (CLAUDE.md, 2026-10-08): Dniprospective ended its markets after Sept 2025; Кураж paused in Sept 2026.
    if (/dniprospective/i.test(name)) status = 'ended'
    if (/кураж/i.test(name)) status = 'paused'
    const ms = [...new Set([...str(e.dates).matchAll(/\d{4}-(\d{2})-\d{2}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)
    return {
      name,
      kind: str(e.kind),
      recurrence: str(e.recurrence),
      dates: str(e.dates),
      nextDate: str(e.next_date),
      city: str(e.city),
      venue: str(e.venue),
      status,
      entry: str(e.entry),
      participation: str(e.participation),
      link: str(e.website) || str(e.instagram) || arr(e.organizer_links)[0] || arr(e.other_links)[0] || '',
      months: ['annual', 'seasonal', 'monthly'].includes(str(e.recurrence)) && ms.length ? `Зазвичай: ${ms.map((m) => MONTHS[m - 1]).join(', ')}` : '',
      description: str(e.description),
      participants: arr(e.participants),
      organizer: str(e.organizer),
      ceramicsShare: str(e.ceramics_share),
      lastEdition: str(e.last_edition),
      sources: arr(e.sources),
    }
  })
fs.writeFileSync(
  path.join(REPO_CONTENT, 'events.json'),
  JSON.stringify(events.map(({ name, kind, recurrence, dates, nextDate, city, venue, status, entry, participation, link, months }) => ({ name, kind, recurrence, dates, nextDate, city, venue, status, entry, participation, link, months })), null, 1) + '\n',
)
{
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => e.nextDate >= today && e.status !== 'ended')
  const recurring = events.filter((e) => !upcoming.includes(e) && ['annual', 'seasonal', 'monthly'].includes(e.recurrence) && !['ended', 'paused'].includes(e.status))
  const cities = new Set(events.map((e) => e.city).filter(Boolean))
  write('podiyi', {
    kind: 'events',
    h1Suggestion: 'Ярмарки, маркети й виставки кераміки в Україні: календар 2026',
    placeholders: { count: events.length, upcoming: upcoming.length, recurring: recurring.length, cities: cities.size },
    today,
    note: 'Live list on the page: «Найближчі» (nextDate ≥ today), «Щороку й щосезону», «Призупинені або завершені». Events abroad are excluded.',
    events,
    distinctiveFacts: [
      `${events.length} подій у ${cities.size} містах; найбільше в Києві (${events.filter((e) => e.city === 'Київ').length})`,
      `Регулярних (щороку/щосезону): ${events.filter((e) => ['annual', 'seasonal', 'monthly'].includes(e.recurrence)).length}`,
      `Лише кераміка: ${events.filter((e) => e.ceramicsShare === 'ceramics-only').length}; з великою часткою кераміки: ${events.filter((e) => e.ceramicsShare === 'ceramics-heavy').length}`,
      upcoming[0] && `Найближча подія в даних: ${upcoming.sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0].name} (${upcoming[0].nextDate})`,
      'Dniprospective завершив маркети після вересня 2025; Кураж Базар призупинений (вересень 2026)',
    ].filter(Boolean),
    sources: ['UkraineCeramics/_master/events.jsonl (зібрано з сайтів і Instagram організаторів, жовтень 2026)'],
  })
}

// ---------- museums and galleries ----------

const muRaw = jsonl(path.join(ROOT, '15_galleries_museums/entries_galleries_museums.jsonl'))
const VENUE = /музей|галере|gallery|art cent|арсенал|палац мистецтв|виставков\p{L}* зал|центр сучасної культури|японський центр|арт-клуб|хлібня|ґлей/iu
const bySlugName = new Map(all.map((s) => [cleanName(s.name).toLowerCase(), s]))
const fromResearch: MuseumItem[] = muRaw
  .filter((m) => VENUE.test(str(m.name)) && str(m.city) && !['Лондон', 'Берлін', 'Прага'].includes(str(m.city)) && !['maker', 'brand'].includes(str(m.type)))
  .map((m) => ({
    name: str(m.name),
    city: str(m.city),
    oblast: str(m.oblast),
    address: str(m.address),
    website: str(m.website) || str(m.instagram) || '',
    what: arr(m.services).slice(0, 2).join('; '),
    slug: bySlugName.get(cleanName(str(m.name)).toLowerCase())?.slug ?? undefined,
  }))
const fromCatalogue: MuseumItem[] = all
  .filter((s) => /музей|галере/iu.test(s.name) && !['shop', 'school'].includes(s.type ?? '') && !/^школа|кав.ярн|сувенір/iu.test(s.name) && !fromResearch.some((m) => m.slug === s.slug))
  .map((s) => ({ name: cleanName(s.name), city: s.cityDoc?.name ?? '', oblast: s.oblast ?? '', address: s.address ?? '', website: s.website ?? s.instagram ?? '', what: s.summary ?? '', slug: s.slug ?? undefined }))
const museums = [...fromResearch, ...fromCatalogue]
fs.writeFileSync(path.join(REPO_CONTENT, 'museums.json'), JSON.stringify(museums, null, 1) + '\n')
{
  const citySeeAlso = fs
    .readdirSync(path.resolve('src/content/places/cities'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const c = JSON.parse(read(path.resolve('src/content/places/cities', f))) as { slug: string; seeAlso?: string[] }
      return { city: c.slug, seeAlso: (c.seeAlso ?? []).filter((x) => /музей|галере|центр|заповідник/iu.test(x)) }
    })
    .filter((c) => c.seeAlso.length)
  const cities = new Set(museums.map((m) => m.city).filter(Boolean))
  write('muzei-keramiky', {
    kind: 'museums',
    h1Suggestion: 'Музеї й галереї кераміки в Україні: де подивитися',
    placeholders: { count: museums.length, cities: cities.size },
    venues: museums,
    researchDetails: muRaw.filter((m) => fromResearch.some((x) => x.name === str(m.name))).map((m) => ({ name: str(m.name), description: str(m.description), services: arr(m.services), products: arr(m.products) })),
    citySeeAlso,
    distinctiveFacts: [
      `${museums.length} музеїв і галерей у ${cities.size} містах`,
      'Опішне: Національний музей-заповідник українського гончарства — колекція сучасної кераміки, бієнале ім. Кричевського, резиденції (див. researchDetails)',
      `Київ: ${museums.filter((m) => m.city === 'Київ').length}; Львів: ${museums.filter((m) => m.city === 'Львів').length}; Харків: ${museums.filter((m) => m.city === 'Харків').length}`,
    ],
    sources: ['UkraineCeramics/15_galleries_museums/entries_galleries_museums.jsonl', 'src/content/places/cities/*.json → seeAlso'],
  })
}

// ---------- selections ----------

{
  const d = await tablewareBrandsData()
  const priced = d.studios.filter((s) => publicPrices(s).some((p) => /чашк|горнят|тарілк|миск|кухл/iu.test(p.text)))
  write('brendy-posudu', {
    kind: 'selection',
    h1Suggestion: 'Сучасні українські бренди посуду ручної роботи',
    placeholders: d.vars,
    brands: d.brands.map((s) => studioInfo(s, /чашк|горнят|тарілк|миск|кухл|сервіз|посуд/iu)),
    studiosAndMakers: d.others.slice(0, 80).map((s) => studioInfo(s, /чашк|горнят|тарілк|миск|кухл|сервіз|посуд/iu)),
    studiosAndMakersTotal: d.others.length,
    cupPrice: f.get('cup'),
    distinctiveFacts: [
      `${d.brands.length} брендів і ${d.others.length} студій/майстрів роблять посуд; ${d.groups.length} міст`,
      `${d.vars.horeca} з них працюють із закладами`,
      `З цінами на посуд у прайсах: ${priced.length}`,
      `Найбільше в: ${d.groups.slice(0, 4).map((g) => `${g.city.name} (${g.studios.length})`).join(', ')}`,
    ],
  })
}
{
  const d = await etsyData()
  write('etsy', {
    kind: 'selection',
    h1Suggestion: 'Українська кераміка на Etsy: магазини в цифрах',
    placeholders: d.vars,
    shops: d.shops,
    shopDetails: jsonl(path.join(ROOT, '05_marketplaces_prices/entries_etsy_browser.jsonl'))
      .filter((e) => d.shops.some((s) => (arr(e.other_links).find((u) => /etsy\.com\/shop\//.test(u)) ?? '').includes(`/shop/${s.shop}`)))
      .map((e) => ({ name: str(e.name), description: str(e.description), prices: arr(e.prices), city: str(e.city), instagram: str(e.instagram) })),
    distinctiveFacts: [
      `${d.vars.count} магазинів з локацією в Україні, разом ${d.vars.etsySales} продажів і ${d.vars.etsyReviews} відгуків`,
      `Найбільший за продажами: ${d.vars.topShop} (${d.vars.topSales})`,
      `Медіанний рейтинг: ${d.vars.medianRating}`,
      'Дані — з вітрин Etsy, переглянуто 2026-10-08; магазини з локацією за кордоном (напр. Вроцлав) не враховано',
    ],
  })
}
{
  const d = await newYearData()
  write('yalynkovi-prykrasy', {
    kind: 'selection',
    h1Suggestion: 'Керамічні ялинкові прикраси й новорічна кераміка від українських майстрів',
    placeholders: d.vars,
    studios: d.studios.map((s) => ({ ...studioInfo(s, NEW_YEAR), newYearLines: [...publicPrices(s).map((p) => p.text), ...(s.products ?? []).map((x) => x.text), ...(s.services ?? []).map((x) => x.text)].filter((t) => NEW_YEAR.test(t)) })),
    leadTimes: { batch: f.lead.batch, customItem: f.lead.customItem },
    distinctiveFacts: [
      `${d.studios.length} студій і майстрів у ${d.vars.cities} містах мають новорічні вироби`,
      `Найбільше в: ${d.groups.slice(0, 4).map((g) => `${g.city.name} (${g.studios.length})`).join(', ')}`,
      'Сезонна сторінка: замовлення на свята варто робити з запасом — терміни в leadTimes',
    ],
  })
}
{
  const d = await businessData()
  write('pratsyuyut-z-biznesom', {
    kind: 'selection',
    h1Suggestion: 'Хто з українських керамістів працює з бізнесом',
    placeholders: d.vars,
    horeca: d.horeca.map((s) => studioInfo(s, /ресторан|кав.ярн|готел|заклад|horeca|парті|на замовлення/iu)),
    logo: d.logo.map((s) => studioInfo(s, /логотип|бренд|персонал|напис|деколь|кастом/iu)),
    corporateGifts: d.gifts.map((s) => studioInfo(s, /корпоратив|подарун|компан/iu)),
    withTermsTotal: d.withTerms.length,
    leadTimes: f.lead,
    distinctiveFacts: [
      `${d.studios.length} майстрів: заклади ${d.horeca.length}, логотип ${d.logo.length}, корпоративні подарунки ${d.gifts.length}`,
      `Умови (мінімальна партія, терміни, способи нанесення) вказали лише ${d.withTerms.length} — решта підтверджує у відповіді на запит`,
      `Міст: ${d.vars.cities}`,
    ],
  })
}

// ---------- guides ----------

const wiki = { clays: read(path.join(ROOT, '04_suppliers/wiki_clays.md')), glazes: read(path.join(ROOT, '04_suppliers/wiki_glazes.md')) }
{
  const d = await materialsData()
  write('vydy-keramiky', {
    kind: 'guide',
    h1Suggestion: 'Кераміка, порцеляна, фаянс, кам’яна маса: у чому різниця',
    placeholders: d.vars,
    materials: d.groups.map((g) => ({ key: g.key, label: g.label, count: g.studios.length, examples: g.studios.slice(0, 15).map((s) => studioInfo(s, g.re)) })),
    wikiClays: wiki.clays,
    wikiGlazes: wiki.glazes,
    distinctiveFacts: d.groups.map((g) => `${g.label}: ${g.studios.length} майстрів у каталозі`),
    note: 'Technical facts only from wikiClays/wikiGlazes; maker examples only from materials[].examples.',
  })
}
{
  const d = await careData()
  write('dohliad-za-keramikoyu', {
    kind: 'guide',
    h1Suggestion: 'Як доглядати за керамікою ручної роботи',
    placeholders: d.vars,
    studioCareLines: d.studios.map((s) => ({ name: cleanName(s.name), slug: s.slug, city: s.cityDoc?.name, lines: [...publicPrices(s).map((p) => p.text), ...(s.products ?? []).map((x) => x.text), ...(s.services ?? []).map((x) => x.text), ...(s.publicDescription ?? '').split(/(?<=[.!?])\s+/)].filter((t) => CARE.test(t)).slice(0, 4) })),
    wikiClays: wiki.clays,
    wikiGlazes: wiki.glazes,
    distinctiveFacts: [`${d.studios.length} майстрів пишуть про догляд, посудомийку чи мікрохвильовку; про посудомийку — ${d.vars.dishwasher}`],
  })
}
{
  const d = await smokeData()
  const notes = ['01_cities/sloviansk', '01_cities/rivne', '01_cities/chernihiv']
    .flatMap((dir) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => path.join(ROOT, dir, f)) : []))
    .map((f) => ({ file: path.relative(ROOT, f), lines: read(f).split('\n').filter((l) => /чорнодим|димлен|молочен|обвар|гаварец|соснівк|теракот/iu.test(l)).slice(0, 20) }))
    .filter((x) => x.lines.length)
  write('chornodymlena-i-molochena', {
    kind: 'guide',
    h1Suggestion: 'Чорнодимлена й молочена кераміка: що це і хто робить',
    placeholders: d.vars,
    blackSmoked: d.black.map((s) => studioInfo(s, BLACK_SMOKED)),
    milkFired: d.milk.map((s) => studioInfo(s, MILK_FIRED)),
    cityContext: ['havarechchyna', 'sosnivka', 'sloviansk', 'lutsk'].map((c) => {
      const p = path.resolve(`src/content/places/cities/${c}.json`)
      return fs.existsSync(p) ? { city: c, ...(JSON.parse(read(p)) as object) } : null
    }).filter(Boolean),
    researchNotes: notes,
    wikiGlazes: wiki.glazes,
    distinctiveFacts: [
      `Чорнодимлена: ${d.black.length} майстрів; молочена: ${d.milk.length}; міст і сіл: ${d.vars.cities}`,
      `Де: ${groupByCity([...d.black, ...d.milk]).slice(0, 6).map((g) => `${g.city.name} (${g.studios.length})`).join(', ')}`,
    ],
  })
}

// Sanity: every page id has a pack.
for (const id of Object.keys(WAVE_B) as WaveBId[]) if (!index.some((x) => x.id === id)) console.warn('no pack for', id)
const extra = { horecaTotal: all.filter(confirmedForVenues).length, newYearTagged: all.filter((s) => hasFormat(s, 'new-year')).length, tablewareText: all.filter((s) => /чашк|тарілк/iu.test(productText(s))).length }
fs.writeFileSync(path.join(OUT, 'INDEX.json'), JSON.stringify({ generated: new Date().toISOString(), pages: index, catalogue: extra }, null, 1) + '\n')
console.log(index.map((x) => `${x.id}:${x.count}`).join(' '), 'events', events.length, 'museums', museums.length)
console.log('materials', MATERIALS.length)
process.exit(0)
