import { asc, eq } from 'drizzle-orm'

import type { Db } from '../../db'
import { studioPrices, studios } from '../../db/schema/catalog'
import type { StudioFormat } from '../../../shared/options'
import type { Actor } from '../audit'
import { studiosWithPendingOwnerChanges, writeStudio } from './runs'

// Format tags from the research data. The rules only PROPOSE a tag, with the phrase that triggered it; a tag is written
// after someone (a person or a review agent) accepted it in the proposals file. Keyword rules misfire («ресторан» in a
// note about the owner's day job, «логотип» of the studio itself), and business lists (logo, horeca, corporate) are
// what companies read, so nothing is applied unreviewed.

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

/** The phrase around a rule's first valid hit, for the reviewer. */
function evidence(text: string, re: RegExp, skip?: RegExp): string | null {
  const hit = ruleHit(text, re, skip)
  if (!hit) return null
  const i = text.indexOf(hit)
  return text.slice(Math.max(0, i - 90), i + hit.length + 90).replace(/\s+/g, ' ').trim()
}

export type TagProposal = { slug: string; name: string; visibility: string; type: string | null; tag: StudioFormat; evidence: string; ok?: boolean; note?: string }

/** Tags the rules would add, each with the phrase that triggered it (the studio's stored texts plus its research entry). */
export async function tagProposals(db: Db, raw: Map<string, Raw>): Promise<TagProposal[]> {
  const all = await db.select().from(studios)
  const out: TagProposal[] = []
  for (const s of all) {
    const e = (s.sourceId && raw.get(s.sourceId)) || {}
    const prices = (await db.select({ text: studioPrices.text }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))).map((p) => p.text)
    const text = [
      s.descriptionInternal, s.summary, s.publicDescription, ...(s.services ?? []), ...(s.products ?? []), ...prices,
      flat(e.b2b), flat(e.ig_bio), flat(e.ig_highlights), flat(e.techniques), flat(e.services), flat(e.products),
    ].filter(Boolean).join(' \n ').toLowerCase()
    const have = new Set(s.formats ?? [])
    for (const r of TAG_RULES) {
      if (have.has(r.tag) || !r.types.has(s.type ?? '')) continue
      const ev = evidence(text, r.re, r.skip)
      if (ev) out.push({ slug: s.slug, name: s.name, visibility: s.visibility, type: s.type, tag: r.tag, evidence: ev })
    }
    if (s.b2bWorksWithHoreca && !have.has('horeca')) out.push({ slug: s.slug, name: s.name, visibility: s.visibility, type: s.type, tag: 'horeca', evidence: 'b2b_works_with_horeca = true' })
    if (s.b2bWorksWithCorporate && !have.has('corporate-gifts')) out.push({ slug: s.slug, name: s.name, visibility: s.visibility, type: s.type, tag: 'corporate-gifts', evidence: 'b2b_works_with_corporate = true' })
  }
  return out
}

/** Adds the accepted tags (ok: true); studios with an owner's pending change set are left for later. */
export async function applyTagProposals(db: Db, accepted: TagProposal[], actor: Actor) {
  const bySlug = new Map<string, Set<StudioFormat>>()
  for (const p of accepted) if (p.ok) bySlug.set(p.slug, (bySlug.get(p.slug) ?? new Set()).add(p.tag))
  const rows = bySlug.size ? await db.select({ id: studios.id, slug: studios.slug, formats: studios.formats }).from(studios) : []
  const pending = await studiosWithPendingOwnerChanges(db)
  let changed = 0
  const skipped: string[] = []
  for (const s of rows) {
    const add = bySlug.get(s.slug)
    if (!add) continue
    if (pending.has(s.id)) { skipped.push(s.slug); continue }
    const next = [...new Set([...(s.formats ?? []), ...add])].sort()
    if (next.length === (s.formats ?? []).length) continue
    await db.transaction((tx) => writeStudio(tx, s.id, { formats: next }, undefined, actor, 'Теги форматів (перевірені)'))
    changed++
  }
  return { changed, skipped }
}
