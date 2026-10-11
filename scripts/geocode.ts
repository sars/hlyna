/**
 * Geocode published studios for the map with OpenStreetMap Nominatim (free, public API).
 *   pnpm payload run scripts/geocode.ts          (DRY=1: resolve only, don't save; FORCE=1: redo studios that have geo;
 *                                                 SLUGS=a,b: only these studios, always redone)
 * Nominatim policy: ≤1 request per second, a real User-Agent with contact, results cached — every query is
 * stored in UkraineCeramics/_ops/geocode_cache.json and never sent twice (also when run against production).
 * Precision: address (house found) → street (only the street matched) → settlement (city centre).
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { City, Studio } from '../src/payload-types'

const CACHE_FILE = process.env.GEO_CACHE || '/Users/rodik/Claude/UkraineCeramics/_ops/geocode_cache.json'
const UA = 'hlyna.com.ua geocoder (rodion@brocoders.com)'
const DRY = process.env.DRY === '1'
const FORCE = process.env.FORCE === '1'
const SLUGS = new Set((process.env.SLUGS || '').split(',').map((x) => x.trim()).filter(Boolean))

type Hit = { lat: number; lng: number; rank: number; type: string; name: string } | null
const cache: Record<string, Hit> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
const save = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1))

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
  save()
  return h
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, d = Math.PI / 180
  const x = Math.sin(((b.lat - a.lat) * d) / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(((b.lng - a.lng) * d) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

const PREFIX = /(вул(?:иця|\.)?|просп(?:ект|\.)?|пр-т|пл(?:оща|\.)?|пров(?:улок|\.)?|бульв(?:ар|\.)?|б-р|узвіз|шосе|набережна|майдан|алея|тупик)\s*/iu

// First real street address from a free-text field: «Шоуруми: Київ, вул. Антоновича, 4/6; …» → «вулиця Антоновича, 4/6».
export function streetOf(address?: string | null): string | null {
  if (!address) return null
  for (let part of address.split(/;|\n|\s\/\s|\s\|\s/)) {
    part = part.replace(/\([^)]*\)/g, ' ').replace(/\b(?:м\.|ст\.)\s*м\.?\s*«?[^,»]+»?/giu, ' ')
    const m = part.match(PREFIX)
    if (!m || m.index === undefined) continue
    const rest = part.slice(m.index + m[0].length)
    const mm = rest.match(/^([^,]+?)(?:,\s*(\d+[\p{L}]?(?:[/-]\d+[\p{L}]?)?))?(?:[,.]|$)/u)
    if (!mm) continue
    const kind = m[1].toLowerCase()
    const word = kind.startsWith('просп') || kind === 'пр-т' ? 'проспект' : kind.startsWith('пл') ? 'площа' : kind.startsWith('пров') ? 'провулок' : kind.startsWith('бульв') || kind === 'б-р' ? 'бульвар' : kind.startsWith('вул') ? 'вулиця' : kind
    const street = mm[1].replace(/\s+/g, ' ').trim()
    if (street.length < 3) continue
    return mm[2] ? `${word} ${street}, ${mm[2]}` : `${word} ${street}`
  }
  return null
}

const payload = await getPayload({ config })
const [{ docs: studios }, { docs: cities }] = await Promise.all([
  payload.find({ collection: 'studios', where: { _status: { equals: 'published' } }, depth: 0, limit: 5000, pagination: false }),
  payload.find({ collection: 'cities', depth: 0, limit: 2000, pagination: false }),
])
const cityById = new Map(cities.map((c) => [c.id, c as City]))
const counts = { address: 0, street: 0, settlement: 0, none: 0, skipped: 0 }

for (const s of studios as Studio[]) {
  if (SLUGS.size && !SLUGS.has(s.slug ?? '')) continue
  if (!FORCE && !SLUGS.size && s.geo?.lat && s.geo?.lng) { counts.skipped++; continue }
  const city = cityById.get(s.city as number)
  if (!city) { counts.none++; continue }
  const oblast = (city.oblast || s.oblast || '').trim()
  const region = oblast && !/^(київ|київська міська)$/i.test(city.name) ? (/обл/i.test(oblast) ? oblast : `${oblast} область`) : ''
  const place = city.name.replace(/^(?:с\.|смт\.?|м\.|селище)\s*/u, '')
  const settleQ = [place, region, 'Україна'].filter(Boolean).join(', ')
  const centre = (await nominatim(settleQ, true)) ?? (await nominatim(`${place}, Україна`, true)) ?? (await nominatim(settleQ))
  if (!centre) { counts.none++; console.log('no settlement', s.slug, settleQ); continue }

  let geo: NonNullable<Studio['geo']> = { lat: centre.lat, lng: centre.lng, precision: 'settlement', source: settleQ }
  const street = streetOf(s.address)
  if (street) {
    const q = `${street}, ${city.name}, Україна`
    const h = await nominatim(q)
    const hasNumber = /,\s*\d/.test(street)
    if (h && km(h, centre) < 30 && h.rank >= 25) {
      geo = { lat: h.lat, lng: h.lng, precision: hasNumber && h.rank >= 30 ? 'address' : 'street', source: q }
    }
  }
  counts[geo.precision as 'address' | 'street' | 'settlement']++
  if (DRY) { console.log(s.slug, geo.precision, geo.source); continue }
  await payload.update({
    collection: 'studios',
    id: s.id,
    data: { geo: { ...geo, geocodedAt: new Date().toISOString() } },
    context: { disableRevalidate: true },
  })
}
console.log('geocoded', counts)
process.exit(0)
