/**
 * Fill a missing street address from the studio's own text, then geocode it, so the profile can show a map.
 *   DRY=1 pnpm payload run scripts/address-from-text.ts     list candidates with context
 *   SLUGS=a,b pnpm payload run scripts/address-from-text.ts  apply only the reviewed slugs
 * Looks only at published studios of visitor types (studio, school, shop, heritage; makers/brands only when the text
 * calls the place a studio, showroom or workshop) that are placed only at the town centre: either the address
 * field has no house number, or it has one in a form the geocoder couldn't read (Latin, no street prefix). Nominatim rules as in
 * geocode.ts: ≤1 request/second, shared cache, results more than 30 km from the town centre are rejected.
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { City, Studio } from '../src/payload-types'

const DRY = process.env.DRY === '1'
const ONLY = new Set((process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean))
const CACHE_FILE = process.env.GEO_CACHE || '/Users/rodik/Claude/UkraineCeramics/_ops/geocode_cache.json'
const UA = 'hlyna.com.ua geocoder (rodion@brocoders.com)'

type Hit = { lat: number; lng: number; rank: number; type: string; name: string } | null
const cache: Record<string, Hit> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
let last = 0
async function nominatim(q: string, settlement = false): Promise<Hit> {
  const key = settlement ? `settlement:${q}` : q
  if (key in cache) return cache[key]
  const wait = last + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  last = Date.now()
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'ua', limit: '1', 'accept-language': 'uk', ...(settlement ? { featureType: 'settlement' } : {}) })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://hlyna.com.ua/' } })
  if (res.status === 429 || res.status === 403) throw new Error(`Nominatim ${res.status}: stop and retry later`)
  const j = (await res.json()) as { lat: string; lon: string; place_rank: number; addresstype?: string; type: string; display_name: string }[]
  const h = j[0] ? { lat: +j[0].lat, lng: +j[0].lon, rank: j[0].place_rank, type: j[0].addresstype || j[0].type, name: j[0].display_name } : null
  cache[key] = h
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1))
  return h
}
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, d = Math.PI / 180
  const x = Math.sin(((b.lat - a.lat) * d) / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(((b.lng - a.lng) * d) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

const VISITOR = new Set(['studio', 'school', 'shop', 'heritage'])
const PLACE_WORDS = /студі|шоурум|майстерн|магазин|крамниц|простір|галере/iu
const KIND = '(?:вул(?:иця|\\.)?|просп(?:ект|\\.)?|пр-т|пл(?:оща|\\.)?|пров(?:улок|\\.)?|бульв(?:ар|\\.)?|б-р|узвіз|набережна|шосе|майдан)'
// «вул. Січових Стрільців, 7а» / «на Володимирській, 42» / «Сумська 25»
const WITH_KIND = new RegExp(`${KIND}\\s*([А-ЯІЇЄҐ][\\p{L}'’ .-]{2,40}?),?\\s+(\\d+[\\p{L}]?(?:[/-]\\d+[\\p{L}]?)?)(?![\\d.])`, 'gu')
const BARE = /(?:адрес\p{L}*|знаходи\p{L}*|чекаємо|розташ\p{L}*|студія на|майстерня на|\bна)\s*:?\s*([А-ЯІЇЄҐ][\p{L}'’-]{3,25}(?:\s[А-ЯІЇЄҐ][\p{L}'’-]{2,20})?),?\s+(\d+[\p{L}]?(?:[/-]\d+)?)(?![\d.])/gu
const DOUBT = /колись|раніше|до війни|до 2022|переїх|закри|ярмар|фестивал|виставк|маркет|фест|захід|подія|продаєть|продають|у магазин|в магазин|стокіст|представлен/iu

function nominativeStreet(name: string): string {
  // «Володимирській» → «Володимирська», «Сумській» → «Сумська» (simple locative → nominative for adjectives).
  return name.replace(/(ськ|цьк|зьк)ій$/u, '$1а').replace(/ській$/u, 'ська').replace(/ій$/u, 'а').trim()
}

const payload = await getPayload({ config })
const [{ docs: studios }, { docs: cities }] = await Promise.all([
  payload.find({ collection: 'studios', where: { _status: { equals: 'published' } }, depth: 0, limit: 5000, pagination: false }),
  payload.find({ collection: 'cities', depth: 0, limit: 2000, pagination: false }),
])
const cityById = new Map(cities.map((c) => [c.id, c as City]))
const otherCities = cities.map((c) => c.name).filter((n) => n.length > 3)

let applied = 0
for (const s of studios as Studio[]) {
  const hasNumber = /\d/.test(s.address ?? '')
  // Already placed precisely, or an address the geocoder could read: nothing to do.
  if (s.geo?.lat && s.geo.precision !== 'settlement') continue
  const city = cityById.get(s.city as number)
  if (!city) continue
  const texts = [s.description, s.publicDescription, s.summary, ...(s.services ?? []).map((x) => x.text), ...(s.prices ?? []).map((x) => x.text)].filter(Boolean) as string[]
  const all = texts.join(' \n ')
  if (!VISITOR.has(s.type ?? '') && !PLACE_WORDS.test(all)) continue
  const cands: { addr: string; ctx: string }[] = []
  for (const t of texts) {
    for (const re of [WITH_KIND, BARE]) {
      for (const m of t.matchAll(new RegExp(re.source, re.flags))) {
        const ctx = t.slice(Math.max(0, m.index! - 80), m.index! + m[0].length + 40).replace(/\s+/g, ' ')
        if (DOUBT.test(ctx)) continue
        const foreign = otherCities.find((n) => n !== city.name && new RegExp(`\\b${n.slice(0, Math.max(4, n.length - 2))}`, 'iu').test(ctx))
        if (foreign) continue
        const kindM = m[0].match(new RegExp(`^${KIND}`, 'iu'))
        const kind = kindM ? kindM[0].toLowerCase() : ''
        const word = kind.startsWith('просп') || kind === 'пр-т' ? 'просп.' : kind.startsWith('пл') ? 'пл.' : kind.startsWith('пров') ? 'пров.' : kind.startsWith('бульв') || kind === 'б-р' ? 'бульв.' : kind.startsWith('вул') || !kind ? 'вул.' : kind
        const street = nominativeStreet(m[1].replace(/\s+/g, ' ').trim())
        if (/^(Київ|Україн|Instagram|Telegram)/u.test(street)) continue
        cands.push({ addr: `${word} ${street}, ${m[2]}, ${city.name}`, ctx })
      }
    }
  }
  // An address with a number but in a form the geocoder couldn't use (Latin, no street prefix): query it as is.
  if (!cands.length && hasNumber) cands.push({ addr: s.address!.trim(), ctx: `address field: ${s.address}` })
  if (!cands.length) continue
  const pick = cands[0]
  if (DRY || (ONLY.size && !ONLY.has(s.slug!))) {
    if (DRY) console.log(`${s.slug} [${s.type}] → ${pick.addr}\n    …${pick.ctx}…${cands.length > 1 ? `  (+${cands.length - 1} more: ${cands.slice(1).map((c) => c.addr).join(' | ')})` : ''}`)
    continue
  }
  if (!ONLY.size) continue // applying requires an explicit reviewed list
  // Geocode: town centre for the sanity check, then the street address.
  const oblast = (city.oblast || s.oblast || '').trim()
  const region = oblast && !/^(київ|київська міська)$/i.test(city.name) ? (/обл/i.test(oblast) ? oblast : `${oblast} область`) : ''
  const place = city.name.replace(/^(?:с\.|смт\.?|м\.|селище)\s*/u, '')
  const settleQ = [place, region, 'Україна'].filter(Boolean).join(', ')
  const centre = (await nominatim(settleQ, true)) ?? (await nominatim(`${place}, Україна`, true))
  const raw = !/^(вул|просп|пл|пров|бульв)\./u.test(pick.addr)
  const fullStreet = pick.addr.replace(/\([^)]*\)?/g, ' ').split(';')[0].replace(/\b\d{5,6}\b/g, ' ').replace(/\s+/g, ' ').replace(/^вул\./, 'вулиця').replace(/^просп\./, 'проспект').replace(/^пл\./, 'площа').replace(/^пров\./, 'провулок').replace(/^бульв\./, 'бульвар').replace(new RegExp(`, ${city.name}$`), '')
  // Raw field: first address only, notes in brackets and postcodes dropped, town added when missing.
  const rawQ = pick.addr.replace(/\([^)]*\)?/g, ' ').split(';')[0].replace(/\b\d{5,6}\b/g, ' ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim().replace(/,$/, '')
  const q = raw ? (/україн|ukraine/i.test(rawQ) ? rawQ : `${rawQ}${rawQ.includes(city.name) ? '' : `, ${city.name}`}, Україна`) : `${fullStreet.trim().replace(/,$/, '')}, ${city.name}, Україна`
  // Try the address as written, then with prefixes spelled out and extras («каб.», «корп.», districts) removed,
  // then the street alone (street precision).
  const B = '(?<!\\p{L})'
  const fromStreet = q.replace(new RegExp(`^.*?${B}(?=(?:вул|просп|пр-т|пр\\.|бул|бульв|пров|пл\\.|узвіз|набережна|шосе)${''})`, 'iu'), '')
  const clean = fromStreet
    .replace(new RegExp(`${B}(?:каб|корп|кв|оф)\\.?\\s*\\d+\\p{L}?`, 'giu'), ' ')
    .replace(new RegExp(`${B}вул\\.\\s*`, 'giu'), 'вулиця ').replace(new RegExp(`${B}(?:просп|пр-т|пр)\\.?\\s+`, 'giu'), 'проспект ')
    .replace(new RegExp(`${B}бул(?:ьв)?\\.\\s*`, 'giu'), 'бульвар ').replace(new RegExp(`${B}пров\\.\\s*`, 'giu'), 'провулок ')
    .replace(new RegExp(`${B}пл\\.\\s*`, 'giu'), 'площа ').replace(/(?<!\p{L})Т\.\s*(?=Шевченка)/u, 'Тараса ')
    .replace(/\s*,\s*,/g, ',').replace(/\s+/g, ' ').trim()
  const withCity = /україн|ukraine/i.test(clean) || clean.includes(city.name) ? clean : `${clean}, ${city.name}, Україна`
  const noLetter = withCity.replace(/,\s*(\d+)\p{L}(?=[,/\s])/u, ', $1')
  const streetOnly = withCity.replace(/,\s*\d+\p{L}?(?:[/-]\d+\p{L}?)?(?=,)/u, '')
  let h: Hit = null
  for (const query of [...new Set([q, withCity, noLetter, streetOnly])]) {
    const hit = await nominatim(query)
    if (hit && centre && km(hit, centre) < 30 && hit.rank >= 25) { h = hit; break }
  }
  const data: Partial<Studio> = raw ? {} : { address: pick.addr }
  if (h && centre && km(h, centre) < 30 && h.rank >= 25) {
    data.geo = { lat: h.lat, lng: h.lng, precision: h.rank >= 30 ? 'address' : 'street', source: q, geocodedAt: new Date().toISOString() }
  }
  await payload.update({ collection: 'studios', id: s.id, data, context: { disableRevalidate: true } })
  applied++
  console.log('applied', s.slug, pick.addr, data.geo?.precision ?? 'no geo match')
}
if (!DRY) console.log('applied', applied)
process.exit(0)
