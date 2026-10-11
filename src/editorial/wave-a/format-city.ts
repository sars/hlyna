// Format × city master-class pages (/maister-klasy/<city>/<format>): live only with MIN_LIST places and copy.
import { topics, type Topic } from '@/content/topics'
import { priceVars, type WaveVars } from '@/editorial/copy'
import { topicData } from '@/editorial/topics'
import { getAllStudios, groupByCity, MIN_LIST, offersMasterClasses, pluralUk } from '@/lib/catalog'
import { fmt } from '@/lib/money'
import { inCity } from '@/lib/present'
import { hasCopy } from './copies'

export const FORMAT_PAGES = {
  'honcharne-kolo': { topic: 'wheel', label: 'Гончарне коло', short: 'гончарне коло' },
  lipennya: { topic: 'handbuilding', label: 'Ліплення з глини', short: 'ліплення' },
  'dlya-ditey': { topic: 'kids', label: 'Майстер-класи для дітей', short: 'для дітей' },
  'dlya-dvokh': { topic: 'couples', label: 'Гончарство для двох', short: 'для двох' },
  rozpys: { topic: 'painting', label: 'Розпис кераміки', short: 'розпис' },
  kursy: { topic: 'courses', label: 'Курси кераміки', short: 'курси' },
} as const
export type FormatSlug = keyof typeof FORMAT_PAGES
export const isFormatSlug = (x: string): x is FormatSlug => x in FORMAT_PAGES
export const formatCityId = (city: string, format: string) => `mk-${city}-${format}`

export async function formatCityData(city: string, format: FormatSlug) {
  const topic: Topic = topics[FORMAT_PAGES[format].topic]
  const data = await topicData(topic, city)
  const place = data.all[0]?.cityDoc?.name ?? ''
  const vars: WaveVars = {
    count: data.all.length,
    places: `${fmt(data.all.length)} ${pluralUk(data.all.length, ['місце', 'місця', 'місць'])}`,
    city: place,
    inCity: inCity(place),
    ...priceVars(data.ctx),
  }
  return { topic, data, vars, place }
}

/** Every format × city pair with at least MIN_LIST places (whether or not copy exists). */
export async function formatCityCandidates() {
  const studios = await getAllStudios()
  const cities = groupByCity(studios.filter(offersMasterClasses)).map((g) => g.city)
  const out: { city: string; cityName: string; format: FormatSlug; count: number }[] = []
  for (const c of cities) {
    for (const format of Object.keys(FORMAT_PAGES) as FormatSlug[]) {
      const d = await topicData(topics[FORMAT_PAGES[format].topic], c.slug!)
      if (d.all.length >= MIN_LIST) out.push({ city: c.slug!, cityName: c.name, format, count: d.all.length })
    }
  }
  return out
}

/** Pairs that are live: enough places and copy written. */
export async function liveFormatCityPages() {
  return (await formatCityCandidates()).filter((p) => hasCopy(formatCityId(p.city, p.format)))
}
