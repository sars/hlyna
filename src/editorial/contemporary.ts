// Editorial selections (/dobirky/*), picked from the data, not paid and not a ranking.
import { getAllStudios, type StudioCard } from '@/lib/catalog'

// Kept out of editorial picks (they stay in the catalogue and all regular lists).
const NOT_PICKED = /gunia|rodionpresent|osonnia/

const text = (s: StudioCard) =>
  [s.summary, s.publicDescription, s.description, ...(s.products ?? []).map((x) => x.text), ...(s.services ?? []).map((x) => x.text)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

/** Signals of contemporary work in a studio's own public data: modern forms, collections, exhibitions, press, activity. */
export function contemporaryScore(s: StudioCard): number {
  const t = text(s)
  let n = 0
  if (/сучасн|contemporary/u.test(t)) n += 2
  if (/авторськ/u.test(t)) n += 1
  if (/колекці/u.test(t)) n += 2
  if (/виставк|бієнале|design week|homo faber|галере|art fair/u.test(t)) n += 2
  if (/vogue|forbes|monocle|dezeen|the village|elle/u.test(t)) n += 1
  if (/традиційн|народн|етно/u.test(t) && !/сучасн/u.test(t)) n -= 1
  if (s.instagram) n += 1
  if ((s.activity?.followers ?? 0) > 5000) n += 1
  return n
}

export const PICK_GROUPS = [
  { key: 'brand', title: 'Бренди посуду, декору й прикрас', types: ['brand'], max: 12 },
  { key: 'maker', title: 'Авторки й автори', types: ['maker'], max: 14 },
  { key: 'studio', title: 'Студії з власною керамікою', types: ['studio'], max: 8 },
] as const

export async function contemporaryPicks() {
  const all = (await getAllStudios()).filter((s) => !NOT_PICKED.test(s.slug ?? '') && s.cityDoc)
  return PICK_GROUPS.map((g) => ({
    ...g,
    studios: all
      .filter((s) => (g.types as readonly string[]).includes(s.type ?? ''))
      .map((s) => ({ s, n: contemporaryScore(s) }))
      .filter((x) => x.n >= 4)
      .sort((a, b) => b.n - a.n || (a.s.name ?? '').localeCompare(b.s.name ?? '', 'uk'))
      .slice(0, g.max)
      .map((x) => x.s),
  })).filter((g) => g.studios.length >= 3)
}

const PLACES = [
  { key: 'kosiv', title: 'Косів і довкола', cities: ['kosiv', 'staryi-kosiv', 'kuty', 'pistyn'] },
  { key: 'opishne', title: 'Опішне', cities: ['opishne'] },
] as const
const MAKING = ['maker', 'brand', 'studio']

/** Kosiv and Opishne: who works there now (makers, brands, studios), then shops, museums and schools. */
export async function kosivOpishne() {
  const all = (await getAllStudios()).filter((s) => !NOT_PICKED.test(s.slug ?? ''))
  return PLACES.map((p) => {
    const here = all.filter((s) => (p.cities as readonly string[]).includes(s.cityDoc?.slug ?? ''))
    const byScore = (a: StudioCard, b: StudioCard) => contemporaryScore(b) - contemporaryScore(a) || (a.name ?? '').localeCompare(b.name ?? '', 'uk')
    return {
      ...p,
      makers: here.filter((s) => MAKING.includes(s.type ?? '')).sort(byScore),
      places: here.filter((s) => !MAKING.includes(s.type ?? '')).sort(byScore),
    }
  })
}
