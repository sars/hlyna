import { asc, eq } from 'drizzle-orm'

import type { Db } from '../../db'
import { studioPrices, studios } from '../../db/schema/catalog'
import type { StudioFormat } from '../../../shared/options'
import type { Actor } from '../audit'
import { studiosWithPendingOwnerChanges, writeStudio } from './runs'

// Format tags from the research data (ported from scripts/tag-studios.ts, same rules). Tags only grow unless reset.

const WORKSHOP = new Set(['studio', 'school', 'maker', 'heritage', 'other'])
const MAKER = new Set(['studio', 'brand', 'maker', 'school', 'heritage'])

export const TAG_RULES: { tag: StudioFormat; re: RegExp; types: Set<string>; skip?: RegExp }[] = [
  { tag: 'wheel', re: /гончарн\p{L}* (?:кол|круг)|на (?:гончарному )?(?:колі|крузі)|за кругом/u, types: WORKSHOP },
  { tag: 'handbuilding', re: /ліплен|ліпка|ручн\p{L}* формуван/u, types: WORKSHOP },
  { tag: 'painting', re: /розпис\p{L}* (?:кераміки|посуду|чаш|тарі|виробів|глазур|ангоб)|майстер-клас\p{L}* (?:з|по) розпис|(?<!\p{L})розпис(?!\p{L})/u, types: WORKSHOP },
  { tag: 'kids', re: /для дітей|дитяч\p{L}* (?:груп|занят|майстер|студі|гурт|свят|урок|клас)|діти від|дітям від|(?<!\d)з \d{1,2} рок|школяр|дні народження|день народження/u, types: WORKSHOP },
  { tag: 'couples', re: /для двох|побаченн|для пар(?!\p{L})|парн\p{L}* (?:майстер|занят|мк)|романтичн/u, types: WORKSHOP },
  { tag: 'courses', re: /(?<!\p{L})курс(?:и|ів|у|ом)?(?!\p{L})|абонемент|регулярн\p{L}* занят/u, types: WORKSHOP },
  { tag: 'certificates', re: /подарунков\p{L}* сертифікат|сертифікат/u, types: new Set([...WORKSHOP, 'brand']), skip: /^\p{L}*\s*(?:автентичн|якост|відповідн|походжен|iso|про )/u },
  { tag: 'corporate-workshop', re: /корпоратив(?!н\p{L}* подарун)|тімбілдинг|тимбілдинг|team ?building|(?:мк|майстер-клас\p{L}*|занят\p{L}*|святкуван\p{L}*) для (?:компаній|команд|колективів)|закрит\p{L}* (?:мк|майстер-клас|груп)/u, types: WORKSHOP },
  { tag: 'corporate-gifts', re: /корпоративн\p{L}* (?:подарун|замовл|сертифікат)|подарунк\p{L}* для (?:клієнт|партнер|співроб|команд)/u, types: MAKER },
  { tag: 'logo', re: /логотип|брендуван|брендован|кастомн\p{L}* (?:чаш|кух|горнят|посуд|керамік|колекц)|персоналізован\p{L}* (?:чаш|кух|горнят|посуд|вироб)|з написами|деколь/u, types: MAKER },
  { tag: 'horeca', re: /ресторан|кав.ярн|horeca|хорека|для заклад|готел|кафе(?!\p{L})|посуд на замовлення|гуртов|wholesale/u, types: new Set(['studio', 'brand', 'maker']) },
  { tag: 'new-year', re: /новоріч|ялинков|різдв/u, types: MAKER },
]

const NEGATION = /(?<!\p{L})(?:не|без|ні|немає|not|можливо|ймовірно),?\s+(?:\S+\s+){0,2}$/u

export function ruleHit(text: string, re: RegExp, skip?: RegExp): string | null {
  for (const m of text.matchAll(new RegExp(re.source, 'gu'))) {
    const before = text.slice(Math.max(0, m.index! - 25), m.index)
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 25)
    if (skip?.test(after) || NEGATION.test(before) || /^\s*(?:\S+\s+){0,2}(?:не (?:описано|вказано|знайдено|проводять)|— інформації|немає)/u.test(after)) continue
    return m[0]
  }
  return null
}

/** Tags for one studio's text (the caller joins stored texts and the raw research entry). */
export function tagsFor(type: string | null, text: string): StudioFormat[] {
  const t = text.toLowerCase()
  return TAG_RULES.filter((r) => r.types.has(type ?? '') && ruleHit(t, r.re, r.skip)).map((r) => r.tag)
}

type Raw = Record<string, unknown>
const flat = (v: unknown): string => (Array.isArray(v) ? v.map(flat).join(' · ') : typeof v === 'string' ? v : '')

export async function tagStudios(db: Db, raw: Map<string, Raw>, opts: { dry?: boolean; reset?: boolean }, actor: Actor) {
  const all = await db.select().from(studios)
  const pending = await studiosWithPendingOwnerChanges(db)
  const counts: Record<string, number> = {}
  let changed = 0
  const log: string[] = []
  for (const s of all) {
    if (pending.has(s.id)) continue
    const e = (s.sourceId && raw.get(s.sourceId)) || {}
    const prices = (await db.select({ text: studioPrices.text }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))).map((p) => p.text)
    const text = [
      s.descriptionInternal, s.summary, s.publicDescription, ...(s.services ?? []), ...(s.products ?? []), ...prices,
      flat(e.b2b), flat(e.ig_bio), flat(e.ig_highlights), flat(e.techniques), flat(e.services), flat(e.products),
    ].filter(Boolean).join(' \n ')
    const tags = new Set<string>(opts.reset ? [] : (s.formats ?? []))
    for (const t of tagsFor(s.type, text)) tags.add(t)
    if (s.b2bWorksWithHoreca) tags.add('horeca')
    if (s.b2bWorksWithCorporate) tags.add('corporate-gifts')
    if (s.visibility === 'public') for (const t of tags) counts[t] = (counts[t] ?? 0) + 1
    const next = [...tags].sort()
    if (JSON.stringify(next) === JSON.stringify([...(s.formats ?? [])].sort())) continue
    changed++
    if (opts.dry) { log.push(`${s.slug} ${next.join(',')}`); continue }
    await db.transaction((tx) => writeStudio(tx, s.id, { formats: next }, undefined, actor, 'Теги форматів'))
  }
  return { changed, publicPerTag: counts, log }
}
