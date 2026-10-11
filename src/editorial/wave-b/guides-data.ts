// Wave B guides with live maker lists: kinds of ceramics, care, black-smoked and milk-fired ware.
import type { WaveVars } from '@/editorial/copy'
import { groupByCity, texts } from '@/lib/catalog'
import { makers } from './makers'

export const MATERIALS = [
  { key: 'porcelain', label: 'Порцеляна', re: /порцелян|фарфор/iu },
  { key: 'stoneware', label: 'Кам’яна маса', re: /кам[’'ʼ]ян\p{L}* мас|кераміт|stoneware|високотемпературн/iu },
  { key: 'majolica', label: 'Майоліка', re: /майолік/iu },
  { key: 'terracotta', label: 'Теракота й червона глина', re: /теракот|червон\p{L}* глин/iu },
  { key: 'faience', label: 'Фаянс', re: /фаянс/iu },
  { key: 'raku', label: 'Раку', re: /(?<!\p{L})раку(?!\p{L})/iu },
] as const

export async function materialsData() {
  const all = await makers()
  const groups = MATERIALS.map((m) => ({ ...m, studios: all.filter((s) => m.re.test(texts(s))) }))
  const vars: WaveVars = Object.fromEntries(groups.map((g) => [`${g.key}Count`, g.studios.length]))
  return { groups, vars: { ...vars, count: new Set(groups.flatMap((g) => g.studios.map((s) => s.id))).size } }
}

export const CARE = /посудомий|мікрохвил|духов|ручне миття|мити (?:лише )?руками|догляд|не (?:ставити|використовувати)|харчов\p{L}* полив|термошок/iu
export async function careData() {
  const studios = (await makers()).filter((s) => CARE.test(texts(s)))
  const dishwasher = studios.filter((s) => /посудомий/iu.test(texts(s)))
  const vars: WaveVars = { count: studios.length, dishwasher: dishwasher.length }
  return { studios, vars }
}

export const BLACK_SMOKED = /чорнодим|чорн\p{L}* димлен|димлен|задимлен|відновлювальн\p{L}* випал/iu
export const MILK_FIRED = /молочен|молочн\p{L}* випал|обварюван|обвар(?!\p{L})/iu
export async function smokeData() {
  const all = await makers()
  const black = all.filter((s) => BLACK_SMOKED.test(texts(s)))
  const milk = all.filter((s) => MILK_FIRED.test(texts(s)))
  const vars: WaveVars = { count: new Set([...black, ...milk].map((s) => s.id)).size, black: black.length, milk: milk.length, cities: groupByCity([...black, ...milk]).length }
  return { black, milk, vars }
}
