import { readFile, writeFile } from 'node:fs/promises'

// Address → coordinates for the panel's «Знайти координати». Same rules as scripts/geocode.ts: OpenStreetMap
// Nominatim, at most one request per second, a contact in the User-Agent, results cached on disk so nothing is asked
// twice, Ukraine only, and a sanity check against the city centre (more than 30 km away → city-level precision).

const UA = 'hlyna.com.ua geocoder (rodion@brocoders.com)'
const CACHE = () => process.env.GEOCODE_CACHE ?? '/Users/rodik/Claude/UkraineCeramics/_ops/geocode_cache.json'
let last = 0
let queue: Promise<unknown> = Promise.resolve()

type Hit = { lat: number; lng: number; displayName: string; kind: 'address' | 'street' | 'settlement' }

async function loadCache(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(CACHE(), 'utf8'))
  } catch {
    return {}
  }
}

type Row = { lat: string; lon: string; display_name: string; addresstype?: string; type?: string; class?: string }

/** One Nominatim search (q plus extra params such as featuretype), cached by its full parameter string. */
async function ask(query: string, extra = ''): Promise<Row[]> {
  // «rows:» keeps these entries apart from the older script format ({lat,lng,…} per query) in the same cache file.
  const key = `rows:${extra ? `${query}|${extra}` : query}`
  const cache = await loadCache()
  if (Array.isArray(cache[key])) return cache[key] as never
  const run = async () => {
    const wait = Math.max(0, last + 1100 - Date.now())
    if (wait) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ua&accept-language=uk&limit=3&q=${encodeURIComponent(query)}${extra ? `&${extra}` : ''}`
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const json = await res.json()
    const fresh = await loadCache()
    fresh[key] = json
    await writeFile(CACHE(), JSON.stringify(fresh)).catch(() => undefined)
    return json
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p as never
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180
  const d = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(d))
}

/** The query sent to the geocoder: first address only, no notes in brackets, no metro hints. */
function geocodeQuery(a: string) {
  return a
    .split(/;|\s\/\s/)[0]!
    .replace(/\([^)]*\)/g, '')
    .replace(/,?\s*(?:м\.|метро)\s+[^,]+/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function geocode(address: string | null, city: string, oblast?: string | null): Promise<Hit | null> {
  // The settlement itself (featuretype=settlement keeps «Київ» from matching Київська область).
  const isPlace = (r: Row) => ['city', 'town', 'village', 'hamlet', 'municipality'].includes(r.addresstype ?? '') || r.class === 'place'
  const byName = await ask(city, 'featuretype=settlement')
  const centre = byName.find(isPlace) ?? (oblast ? (await ask(`${city}, ${oblast}`, 'featuretype=settlement')).find(isPlace) : undefined) ?? byName[0]
  const c = centre ? { lat: Number(centre.lat), lng: Number(centre.lon) } : null
  if (address?.trim()) {
    const clean = geocodeQuery(address)
    const withCity = clean.toLowerCase().includes(city.toLowerCase()) ? clean : `${clean}, ${city}`
    // «12/10» and «12а» often aren't in OSM as such: retry with the plain number, then the street alone.
    const plainNumber = withCity.replace(/(\d+)\s*[/\\-]\s*\d+[а-яa-z]?/iu, '$1').replace(/(\d+)[а-яa-z]\b/iu, '$1')
    const streetOnly = withCity.replace(/,?\s*\d+[^,]*(?=,|$)/u, '')
    const tries: [string, Hit['kind']][] = [[withCity, 'address'], [plainNumber, 'address'], [streetOnly, 'street']]
    const seen = new Set<string>()
    for (const [query, kind] of tries) {
      if (seen.has(query)) continue
      seen.add(query)
      for (const h of await ask(query)) {
        const p = { lat: Number(h.lat), lng: Number(h.lon) }
        if (c && km(c, p) > 30) continue
        const parts = h.display_name.split(',').map((x) => x.trim())
        // A house number is often the second part («Міська галерея, 27, Соборна вулиця, …»).
        const exact = kind === 'address' && (h.addresstype === 'building' || h.class === 'building' || h.type === 'house' || parts.slice(0, 2).some((x) => /^\d+[\p{L}/-]*\d*$/u.test(x)) || /\d/.test(parts[0] ?? ''))
        return { ...p, displayName: h.display_name, kind: exact ? 'address' : 'street' }
      }
    }
  }
  return c ? { ...c, displayName: centre!.display_name, kind: 'settlement' } : null
}
