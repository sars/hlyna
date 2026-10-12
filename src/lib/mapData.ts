import { getAllStudios, hasFormat, offersMasterClasses, TYPE_LABEL, worksWithCompanies, worksWithVenues, type StudioCard } from './catalog'
import { displayName, firstAddress } from './present'

// Studios for /mapa: one GeoJSON point per geocoded studio. Filter flags are precomputed here so the
// map script stays small. Settlement-precision points sit on the town centre and are grouped there.

export const MAP_FILTERS = [
  { key: 'mk', label: 'Майстер-класи' },
  { key: 'wheel', label: 'Гончарне коло' },
  { key: 'kids', label: 'Для дітей' },
  { key: 'couples', label: 'Для двох' },
  { key: 'certificates', label: 'Сертифікати' },
  { key: 'corporate', label: 'Корпоративи' },
  { key: 'horeca', label: 'Посуд для закладів' },
  { key: 'logo', label: 'Логотип' },
] as const
export type MapFilter = (typeof MAP_FILTERS)[number]['key']

export type MapProps = {
  slug: string
  name: string
  type: string
  address: string
  city: string
  citySlug: string
  precise: boolean
  f: MapFilter[]
}

export function flags(s: StudioCard): MapFilter[] {
  const out: MapFilter[] = []
  if (offersMasterClasses(s)) out.push('mk')
  if (hasFormat(s, 'wheel')) out.push('wheel')
  if (hasFormat(s, 'kids')) out.push('kids')
  if (hasFormat(s, 'couples')) out.push('couples')
  if (hasFormat(s, 'certificates')) out.push('certificates')
  if (hasFormat(s, 'corporate-workshop')) out.push('corporate')
  if (worksWithVenues(s)) out.push('horeca')
  if (hasFormat(s, 'logo') || (worksWithCompanies(s) && hasFormat(s, 'corporate-gifts'))) out.push('logo')
  return out
}

export async function mapStudios() {
  const all = (await getAllStudios()).filter((s) => s.type !== 'supplier' && s.status !== 'closed')
  const placed = all.filter((s) => typeof s.geo?.lat === 'number' && typeof s.geo?.lng === 'number')
  return { all, placed }
}

export async function studiosGeoJSON() {
  const { placed } = await mapStudios()
  return {
    type: 'FeatureCollection' as const,
    features: placed.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Math.round(s.geo!.lng! * 1e5) / 1e5, Math.round(s.geo!.lat! * 1e5) / 1e5] },
      properties: {
        slug: s.slug ?? '',
        name: displayName(s),
        type: TYPE_LABEL[s.type ?? 'other'],
        address: s.geo?.precision === 'settlement' ? '' : firstAddress(s.address),
        city: s.cityDoc?.name ?? '',
        citySlug: s.cityDoc?.slug ?? '',
        precise: s.geo?.precision !== 'settlement',
        f: flags(s),
      } satisfies MapProps,
    })),
  }
}
