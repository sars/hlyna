/**
 * Wave C: build the data packs writers use (one JSON per page) for the corporate-occasion and winter pages.
 *   HLYNA_SCRIPT=1 pnpm payload run scripts/build-wave-c.ts
 * Reads the published catalogue (same filters as the site), the structured JSON the pages render
 * (src/content/waveC/{formats,facts,newyear}.json) and the research notes, and writes
 * UkraineCeramics/_site_content/waveC/data/<id>.json and INDEX.json. Nothing is invented: every fact in a pack
 * carries its source. Copy is written separately (format: _site_content/waveC/COPY_FORMAT.md) and synced
 * with scripts/sync-wave-c.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'

import type { StudioCard } from '../src/lib/catalog'
import { cleanName, firstAddress, publicPrices } from '../src/lib/present'
import { evidenceLine } from '../src/editorial/topics'
import type { WaveVars } from '../src/editorial/wave-a'
import { anniversaryData, staffGiftsData, WAVE_C, waveCFacts, winterData, type WaveCId } from '../src/editorial/wave-c'

const ROOT = '/Users/rodik/Claude/UkraineCeramics'
const OUT = path.join(ROOT, '_site_content/waveC')
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true })

const jsonl = (f: string) =>
  fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>) : []
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const month = (d?: string | null) => (d ? d.slice(0, 7) : null)
const igNotes = new Map(jsonl(path.join(ROOT, '09_instagram/posts_scan/ig_notes.jsonl')).map((n) => [str(n.slug), n]))

const studioInfo = (s: StudioCard, re?: RegExp) => {
  const n = igNotes.get(s.slug!)
  return {
    name: cleanName(s.name),
    slug: s.slug,
    type: s.type,
    city: s.cityDoc?.name ?? null,
    address: firstAddress(s.address) || null,
    formats: s.formats ?? [],
    summary: s.summary ?? '',
    evidence: re ? evidenceLine(s, re) : '',
    services: (s.services ?? []).map((x) => x.text).slice(0, 15),
    products: (s.products ?? []).map((x) => x.text).slice(0, 15),
    // All public price lines (not only the matching ones), so writers never conclude "doesn't publish prices".
    prices: publicPrices(s).map((p) => (p.source ? `${p.text} (${p.source})` : p.text)),
    b2b: { minOrder: s.b2b?.minOrder ?? null, leadTime: s.b2b?.leadTime ?? null, logoMethods: (s.b2b?.logoMethods ?? []).map((x) => x.text) },
    instagram: s.instagram ?? null,
    instagramNote: str(n?.note) || null,
    lastPost: month(s.activity?.lastPostDate),
  }
}

const index: { id: string; url: string; kind: string; count: number; h1: string; placeholders: string[] }[] = []
const write = (id: WaveCId, pack: Record<string, unknown> & { placeholders: WaveVars }) => {
  fs.writeFileSync(path.join(OUT, 'data', `${id}.json`), JSON.stringify({ id, url: WAVE_C[id].path, ...pack }, null, 1) + '\n')
  index.push({ id, url: WAVE_C[id].path, kind: String(pack.kind), count: Number(pack.placeholders.count ?? 0), h1: String(pack.h1Suggestion ?? ''), placeholders: Object.keys(pack.placeholders) })
}

const corporateResearch = read(path.join(ROOT, '_site_content/research/corporate_events_comparison.md'))
const winterResearch = read(path.join(ROOT, '_site_content/research/new_year_christmas.md'))
const CORP = /корпоратив|тімбілдинг|тимбілдинг|для компан|для команд|закрит\p{L}* (?:мк|груп)|виїзн/iu
const GIFT = /корпоратив\p{L}* подарун|подарун|логотип|персоналіз|брендов|деколь|набір|бокс/iu

// ---------- 1. company anniversary: formats compared ----------
{
  const d = await anniversaryData()
  write('richnytsya-kompaniyi', {
    kind: 'comparison',
    h1Suggestion: 'Як відсвяткувати річницю компанії: 14 форматів поруч',
    placeholders: d.vars,
    renderedByPage: 'Таблиця форматів (картки з ціною, групою, тривалістю, бронюванням, кому підходить, плюси, мінуси, джерела) і список студій з корпоративами. Не переписуйте таблицю в тексті — пояснюйте, як обрати.',
    formats: d.rows,
    facts: { deloitte: waveCFacts.deloitte, booking: waveCFacts.booking, taxFreeGift: waveCFacts.taxFreeGift, holidaysMartialLaw: waveCFacts.holidaysMartialLaw },
    leadTimes: { pickupAfterClass: d.vars.pickup, logoBatch: d.vars.logoLead },
    studios: d.studios.map((s) => studioInfo(s, CORP)),
    distinctiveFacts: [
      'Кераміка — єдиний формат, де подарунок приходить після свята: виріб готовий через 2–4 тижні після випалу.',
      'Кейс річниці: Art-hall ceramics зробили пам’ятну таріль до 20-річчя Метінвесту як частину подарункового набору (Instagram, 30.09.2026).',
      'HR-тренд 2025: не скасовувати зимову зустріч, а зробити камерною й з благодійною складовою (DOU, форум, 17.11.2025).',
      'KAVA радить бронювати корпоратив щонайменше за 2–3 тижні, на грудень раніше.',
      'Блекаути: Восьма Комора має дров’яну піч; Come to Geza працює на ножних колах; Druzi Ceramic почали новорічні замовлення раніше через ризики зі світлом (09.10.2026).',
      'Укриття: GLYNAR працює під час тривоги, якщо клієнти згодні; поруч метро Хрещатик.',
    ],
    researchNotes: corporateResearch,
    sources: ['_site_content/research/corporate_events_comparison.md', 'src/content/waveC/formats.json', 'src/content/waveC/facts.json'],
  })
}

// ---------- 2. gifts for employees ----------
{
  const d = await staffGiftsData()
  const fmtRows = (await anniversaryData()).rows.filter((r) => ['boxes', 'ceramic-gifts', 'certificates', 'charity', 'online'].includes(r.key))
  write('podarunky-spivrobitnykam', {
    kind: 'gifts',
    h1Suggestion: 'Подарунки співробітникам: кераміка, бокси, сертифікати',
    placeholders: d.vars,
    renderedByPage: 'Блок «Подарунок без податку у 2026 році» з джерелом і два списки: корпоративні подарунки з кераміки; логотип і персоналізація. Не переписуйте списки.',
    facts: { taxFreeGift: waveCFacts.taxFreeGift, deloitte: waveCFacts.deloitte, booking: waveCFacts.booking },
    giftFormats: fmtRows,
    leadTimes: { logoBatch: d.vars.logoLead },
    gifts: d.gifts.map((s) => studioInfo(s, GIFT)),
    logo: d.logo.map((s) => studioInfo(s, GIFT)),
    distinctiveFacts: [
      'Негрошовий подарунок працівнику до 2 161,75 грн на місяць у 2026 році не оподатковується (25% мінімальної зарплати; пп. 165.1.39 ПКУ; 7eminar, 21.11.2025) — звірити з бухгалтером.',
      'Tsvite Teren бере корпоративні замовлення від 10 одиниць; кейс 2024 — новорічні іграшки «Drimota» з айдентикою клієнта.',
      'Подарунки IT-компаній на свята 2025: вишиванка і скляний коник GUNIA (UPSTARS), сир ветеранської сироварні, кастомна ялинкова іграшка (P2H, 4-й рік) — DOU.',
      '64% українців планують частину святкового бюджету на благодійність (Deloitte, 10.12.2025).',
      'Сертифікат KAVA діє 12 місяців, ТВОЄ — 6 місяців; електронні видають одразу.',
    ],
    researchNotes: corporateResearch,
    sources: ['_site_content/research/corporate_events_comparison.md', 'src/content/waveC/facts.json'],
  })
}

// ---------- 3. New Year and Christmas ----------
{
  const d = await winterData()
  write('novyi-rik-i-rizdvo', {
    kind: 'season',
    h1Suggestion: 'Новий рік і Різдво з українською керамікою: сезон 2026/27',
    placeholders: d.vars,
    renderedByPage: 'Календар сезону (з приміткою про воєнний стан), «Коли замовляти (наша оцінка)», «Що вже пропонують студії» (з датами джерел), «Ще майстри з новорічною керамікою», «Зимові ярмарки: дати минулого сезону». Не переписуйте ці блоки — пояснюйте й обирайте.',
    calendar: d.ny.calendar,
    deadlinesEstimate: d.ny.deadlinesEstimate,
    deadlinesNote: d.ny.deadlinesNote,
    marketsLastSeason: d.ny.marketsLastSeason,
    marketsNote: d.ny.marketsNote,
    offers: d.offers.map((o) => ({ ...studioInfo(o.studio), what: o.what, price: o.price, deadline: o.deadline, date: o.date, source: o.source })),
    moreStudios: d.more.map((l) => ({ ...studioInfo(l.s), evidence: l.line })),
    facts: { christmasDate: waveCFacts.christmasDate, holidaysMartialLaw: waveCFacts.holidaysMartialLaw, deloitte: waveCFacts.deloitte },
    leadTimes: { pickupAfterClass: d.vars.pickup, logoBatch: d.vars.logoLead },
    distinctiveFacts: [
      'Сезон стартує рано: Dzbanok анонсував прикраси 31.08.2026, ҐAVA — корпоративні набори 28.09 і передзамовлення «до Різдва» 09.10, Druzi Ceramic — бронювання новорічних чашок 09.10.2026.',
      'Сальникова art закрила нові замовлення на осінь-зиму 2026 (10.10.2026), поповнення наявності — з листопада.',
      'Керамічних дідухів у даних немає; дідух трапляється лише як майстер-клас плетіння (Керамічний простір, КатАртСис).',
      'Студії не публікують «останніх дат замовлення» — лише «до Різдва», «кількість обмежена»; дедлайни на сторінці — наша оцінка.',
      'Виріб з новорічного майстер-класу готовий через 2–4 тижні: МК у другій половині грудня — іграшка вже після свят.',
      'Під воєнним станом свята не вихідні (Закон № 2136-IX, ч. 6 ст. 6); Різдво — 25 грудня (Закон № 3258-IX від 14.07.2023).',
    ],
    researchNotes: winterResearch,
    sources: ['_site_content/research/new_year_christmas.md', '_site_content/research/new_year_studios.json', 'src/content/waveC/newyear.json', 'src/content/waveC/facts.json'],
  })
}

fs.writeFileSync(path.join(OUT, 'INDEX.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), pages: index }, null, 1) + '\n')
console.log(index.map((i) => `${i.id}: ${i.count}`).join('\n'))
process.exit(0)
