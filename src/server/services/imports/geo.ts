import { asc, eq, inArray } from 'drizzle-orm'

import type { Db } from '../../db'
import { cities, studioPrices, studios } from '../../db/schema/catalog'
import { geocode } from '../../geo/nominatim'
import type { Actor } from '../audit'
import { writeStudio } from './runs'

// Map coordinates (ported from scripts/geocode.ts and address-from-text.ts) on the shared geocoder
// (src/server/geo/nominatim.ts: ≤1 request/s, cache on disk, 30 km sanity check against the city centre).

/** Geocode public studios. Default: only those without coordinates; force: all; slugs: only these, always redone. */
export async function geocodeStudios(db: Db, opts: { slugs?: string[]; force?: boolean; dry?: boolean }, actor: Actor) {
  const rows = await db
    .select({ s: studios, city: cities.name, cityOblast: cities.oblast })
    .from(studios)
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(opts.slugs?.length ? inArray(studios.slug, opts.slugs) : eq(studios.visibility, 'public'))
  const counts = { address: 0, street: 0, settlement: 0, none: 0, skipped: 0 }
  const log: string[] = []
  for (const { s, city, cityOblast } of rows) {
    if (!opts.force && !opts.slugs?.length && s.geoLat != null && s.geoLng != null) { counts.skipped++; continue }
    if (!city) { counts.none++; continue }
    const hit = await geocode(s.address, city, cityOblast ?? s.oblast)
    if (!hit) { counts.none++; log.push(`no match ${s.slug}`); continue }
    counts[hit.kind]++
    if (opts.dry) { log.push(`${s.slug} ${hit.kind} ${hit.displayName}`); continue }
    await db.transaction((tx) =>
      writeStudio(tx, s.id, { geoLat: hit.lat, geoLng: hit.lng, geoPrecision: hit.kind, geoSource: hit.displayName.slice(0, 300), geoGeocodedAt: new Date().toISOString() }, undefined, actor, 'Координати'),
    )
  }
  return { counts, log }
}

// ---------- street address from the studio's own text

const VISITOR = new Set(['studio', 'school', 'shop', 'heritage'])
const PLACE_WORDS = /студі|шоурум|майстерн|магазин|крамниц|простір|галере/iu
const KIND = '(?:вул(?:иця|\\.)?|просп(?:ект|\\.)?|пр-т|пл(?:оща|\\.)?|пров(?:улок|\\.)?|бульв(?:ар|\\.)?|б-р|узвіз|набережна|шосе|майдан)'
const WITH_KIND = new RegExp(`${KIND}\\s*([А-ЯІЇЄҐ][\\p{L}'’ .-]{2,40}?),?\\s+(\\d+[\\p{L}]?(?:[/-]\\d+[\\p{L}]?)?)(?![\\d.])`, 'gu')
const BARE = /(?:адрес\p{L}*|знаходи\p{L}*|чекаємо|розташ\p{L}*|студія на|майстерня на|\bна)\s*:?\s*([А-ЯІЇЄҐ][\p{L}'’-]{3,25}(?:\s[А-ЯІЇЄҐ][\p{L}'’-]{2,20})?),?\s+(\d+[\p{L}]?(?:[/-]\d+)?)(?![\d.])/gu
const DOUBT = /колись|раніше|до війни|до 2022|переїх|закри|ярмар|фестивал|виставк|маркет|фест|захід|подія|продаєть|продають|у магазин|в магазин|стокіст|представлен/iu
const nominativeStreet = (name: string) => name.replace(/(ськ|цьк|зьк)ій$/u, '$1а').replace(/ській$/u, 'ська').replace(/ій$/u, 'а').trim()

export type AddressCandidate = { slug: string; type: string | null; addr: string; ctx: string; more: string[] }

/** Street-address candidates found in a studio's text, for studios placed only at the town centre. */
export function addressCandidates(texts: string[], cityName: string, otherCities: string[]): { addr: string; ctx: string }[] {
  const cands: { addr: string; ctx: string }[] = []
  for (const t of texts) {
    for (const re of [WITH_KIND, BARE]) {
      for (const m of t.matchAll(new RegExp(re.source, re.flags))) {
        const ctx = t.slice(Math.max(0, m.index! - 80), m.index! + m[0].length + 40).replace(/\s+/g, ' ')
        if (DOUBT.test(ctx)) continue
        if (otherCities.some((n) => n !== cityName && new RegExp(`\\b${n.slice(0, Math.max(4, n.length - 2))}`, 'iu').test(ctx))) continue
        const kindM = m[0].match(new RegExp(`^${KIND}`, 'iu'))
        const kind = kindM ? kindM[0].toLowerCase() : ''
        const word = kind.startsWith('просп') || kind === 'пр-т' ? 'просп.' : kind.startsWith('пл') ? 'пл.' : kind.startsWith('пров') ? 'пров.' : kind.startsWith('бульв') || kind === 'б-р' ? 'бульв.' : kind.startsWith('вул') || !kind ? 'вул.' : kind
        const street = nominativeStreet(m[1]!.replace(/\s+/g, ' ').trim())
        if (/^(Київ|Україн|Instagram|Telegram)/u.test(street)) continue
        cands.push({ addr: `${word} ${street}, ${m[2]}, ${cityName}`, ctx })
      }
    }
  }
  return cands
}

/** Lists candidates (dry) or, for an explicit reviewed slug list, fills the address and geocodes it. */
export async function addressFromText(db: Db, opts: { dry?: boolean; slugs?: string[] }, actor: Actor) {
  const rows = await db.select({ s: studios, city: cities.name, cityOblast: cities.oblast }).from(studios).leftJoin(cities, eq(cities.id, studios.cityId)).where(eq(studios.visibility, 'public'))
  const allCities = (await db.select({ name: cities.name }).from(cities)).map((c) => c.name).filter((n) => n.length > 3)
  const found: AddressCandidate[] = []
  let applied = 0
  for (const { s, city, cityOblast } of rows) {
    if (s.geoLat != null && s.geoPrecision !== 'settlement') continue
    if (!city) continue
    const prices = (await db.select({ text: studioPrices.text }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))).map((p) => p.text)
    const texts = [s.descriptionInternal, s.publicDescription, s.summary, ...(s.services ?? []), ...prices].filter(Boolean) as string[]
    if (!VISITOR.has(s.type ?? '') && !PLACE_WORDS.test(texts.join(' '))) continue
    const cands = addressCandidates(texts, city, allCities)
    if (!cands.length && /\d/.test(s.address ?? '')) cands.push({ addr: s.address!.trim(), ctx: `address field: ${s.address}` })
    if (!cands.length) continue
    found.push({ slug: s.slug, type: s.type, addr: cands[0]!.addr, ctx: cands[0]!.ctx, more: cands.slice(1).map((c) => c.addr) })
    if (opts.dry || !opts.slugs?.includes(s.slug)) continue
    const fromText = /^(вул|просп|пл|пров|бульв)\./u.test(cands[0]!.addr)
    const addr = fromText ? cands[0]!.addr : s.address!
    const hit = await geocode(addr, city, cityOblast ?? s.oblast)
    const patch: Partial<typeof studios.$inferInsert> = fromText ? { address: addr } : {}
    if (hit && hit.kind !== 'settlement') Object.assign(patch, { geoLat: hit.lat, geoLng: hit.lng, geoPrecision: hit.kind, geoSource: hit.displayName.slice(0, 300), geoGeocodedAt: new Date().toISOString() })
    await db.transaction((tx) => writeStudio(tx, s.id, patch, undefined, actor, 'Адреса з тексту'))
    applied++
  }
  return { candidates: found, applied }
}
