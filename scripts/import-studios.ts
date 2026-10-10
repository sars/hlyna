/**
 * Import studios from the research master table into Payload.
 *
 *   pnpm import:studios
 *   DATA_FILE=/path/all_entries.jsonl pnpm import:studios
 *
 * Idempotent: every entry gets a stable sourceId (hash of normalised name + city)
 * and is created or updated by it. Cities are created on the fly.
 * Population / isOver100k come from cities_100k.md next to the data (CITIES_FILE overrides).
 */
import config from '@payload-config'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import type { Studio } from '../src/payload-types'
import { STUDIO_STATUSES, STUDIO_TYPES } from '../src/collections/Studios'
import { slugifyUk } from '../src/utilities/transliterateUk'

const DATA_FILE =
  process.env.DATA_FILE || '/Users/rodik/Claude/UkraineCeramics/_master/all_entries.jsonl'
const CITIES_FILE =
  process.env.CITIES_FILE ||
  path.resolve(path.dirname(DATA_FILE), '../08_market_media/cities_100k.md')

type Entry = {
  name: string
  type?: string
  city?: string
  oblast?: string
  address?: string
  instagram?: string
  website?: string
  facebook?: string
  other_links?: string[]
  phone?: string
  email?: string
  services?: string[]
  products?: string[]
  prices?: string[]
  sales_channels?: string[]
  status?: string
  description?: string
  sources?: string[]
  confidence?: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : []

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[«»"'’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const sourceIdFor = (name: string, city: string): string =>
  createHash('sha1')
    .update(`${normalize(name)}|${normalize(city)}`)
    .digest('hex')
    .slice(0, 16)

const TYPES = new Set<string>(STUDIO_TYPES.map((t) => t.value))
const STATUSES = new Set<string>(STUDIO_STATUSES.map((s) => s.value))
const CONFIDENCE = new Set(['high', 'medium', 'low'])

function eligible(e: Entry): boolean {
  const hasLink =
    !!str(e.instagram) || !!str(e.website) || !!str(e.facebook) || list(e.other_links).length > 0
  return !!str(e.city) && str(e.description).length >= 80 && hasLink
}

function loadCityStats(): Map<string, { population: number; oblast: string }> {
  const stats = new Map<string, { population: number; oblast: string }>()
  if (!fs.existsSync(CITIES_FILE)) return stats
  for (const row of fs.readFileSync(CITIES_FILE, 'utf8').split('\n')) {
    const cells = row.split('|').map((c) => c.trim())
    // | # | Місто | Область | Населення | ...
    if (cells.length < 6 || !/^\d+$/.test(cells[1])) continue
    const population = Number(cells[4].replace(/[^\d]/g, ''))
    if (population) stats.set(normalize(cells[2]), { population, oblast: cells[3] })
  }
  return stats
}

async function main() {
  const payload = await getPayload({ config })
  const context = { disableRevalidate: true }

  const lines = fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter((l) => l.trim())
  const entries: Entry[] = lines.map((l) => JSON.parse(l))
  const selected = entries.filter(eligible)
  const cityStats = loadCityStats()

  const counts = {
    total: entries.length,
    eligible: selected.length,
    created: 0,
    updated: 0,
    duplicates: 0,
    errors: 0,
    citiesCreated: 0,
  }

  // City cache: normalised name → id
  const cityIds = new Map<string, number>()
  const existingCities = await payload.find({
    collection: 'cities',
    limit: 0,
    pagination: false,
    depth: 0,
  })
  for (const c of existingCities.docs) cityIds.set(normalize(c.name), c.id)

  async function cityId(name: string, oblast: string): Promise<number> {
    const key = normalize(name)
    const cached = cityIds.get(key)
    if (cached) return cached
    const stat = cityStats.get(key)
    const created = await payload.create({
      collection: 'cities',
      data: {
        name,
        slug: slugifyUk(name),
        oblast: oblast || stat?.oblast || undefined,
        population: stat?.population,
        isOver100k: stat ? stat.population >= 100_000 : false,
      },
      context,
    })
    counts.citiesCreated++
    cityIds.set(key, created.id)
    return created.id
  }

  const seen = new Set<string>()

  for (const e of selected) {
    const name = str(e.name)
    const cityName = str(e.city)
    const sourceId = sourceIdFor(name, cityName)
    if (seen.has(sourceId)) {
      counts.duplicates++
      continue
    }
    seen.add(sourceId)

    try {
      const type = str(e.type)
      const status = str(e.status)
      const confidence = str(e.confidence)

      const data = {
        name,
        type: (TYPES.has(type) ? type : 'other') as Studio['type'],
        city: await cityId(cityName, str(e.oblast)),
        oblast: str(e.oblast),
        address: str(e.address),
        description: str(e.description),
        services: list(e.services).map((text) => ({ text })),
        products: list(e.products).map((text) => ({ text })),
        prices: list(e.prices).map((text) => ({ text, source: '', date: '' })),
        instagram: str(e.instagram),
        website: str(e.website),
        facebook: str(e.facebook),
        otherLinks: list(e.other_links).map((url) => ({ url })),
        phone: str(e.phone),
        email: str(e.email),
        salesChannels: list(e.sales_channels).map((text) => ({ text })),
        status: (STATUSES.has(status) ? status : 'unclear') as Studio['status'],
        confidence: (CONFIDENCE.has(confidence) ? confidence : null) as Studio['confidence'],
        sources: list(e.sources).map((url) => ({ url })),
        sourceId,
        _status: 'published' as const,
      }

      const existing = await payload.find({
        collection: 'studios',
        where: { sourceId: { equals: sourceId } },
        limit: 1,
        depth: 0,
        draft: true,
      })

      if (existing.docs[0]) {
        // Keep manually edited slug, consent, b2b and activity data untouched.
        await payload.update({
          collection: 'studios',
          id: existing.docs[0].id,
          data,
          context,
        })
        counts.updated++
      } else {
        await payload.create({
          collection: 'studios',
          data: {
            ...data,
            consent: { photos: false, requests: false },
          },
          context,
        })
        counts.created++
      }
    } catch (err) {
      counts.errors++
      payload.logger.error(`Failed to import "${name}" (${cityName}): ${(err as Error).message}`)
    }
  }

  const studiosTotal = await payload.count({ collection: 'studios' })
  const citiesTotal = await payload.count({ collection: 'cities' })

  console.log('\nImport finished')
  console.table({ ...counts, studiosInDb: studiosTotal.totalDocs, citiesInDb: citiesTotal.totalDocs })
  process.exit(counts.errors ? 1 : 0)
}

// Top-level await: `payload run` awaits the module import, then exits.
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
