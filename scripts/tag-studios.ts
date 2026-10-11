/**
 * Tag studios with formats (wheel, kids, logo, corporate-workshop…) from the research data.
 *   pnpm payload run scripts/tag-studios.ts            (DRY=1 to print without saving)
 * Reads the stored texts plus the raw entry (b2b, Instagram bio and highlights) matched by sourceId.
 * Tags only grow (tags added by hand in admin are kept) unless RESET=1. Rules are deliberately narrow; a phrase
 * preceded by a negation ("не описано", "без") does not count.
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import { sourceIdFor } from './source-id'
import type { Studio } from '../src/payload-types'

type Format = NonNullable<Studio['formats']>[number]

const DATA_FILE = process.env.DATA_FILE || '/Users/rodik/Claude/UkraineCeramics/_master/all_entries.jsonl'
const DRY = process.env.DRY === '1'

const WORKSHOP = new Set(['studio', 'school', 'maker', 'heritage', 'other'])
const MAKER = new Set(['studio', 'brand', 'maker', 'school', 'heritage'])

const RULES: { tag: Format; re: RegExp; types: Set<string>; skip?: RegExp }[] = [
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

function hits(text: string, re: RegExp, skip?: RegExp): string | null {
  const g = new RegExp(re.source, 'gu')
  for (const m of text.matchAll(g)) {
    const before = text.slice(Math.max(0, m.index! - 25), m.index)
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 25)
    if (skip?.test(after) || NEGATION.test(before) || /^\s*(?:\S+\s+){0,2}(?:не (?:описано|вказано|знайдено|проводять)|— інформації|немає)/u.test(after)) continue
    return m[0]
  }
  return null
}

type Raw = Record<string, unknown>
const flat = (v: unknown): string => (Array.isArray(v) ? v.map(flat).join(' · ') : typeof v === 'string' ? v : '')

const raw = new Map<string, Raw>()
for (const line of fs.readFileSync(DATA_FILE, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const e = JSON.parse(line) as Raw
  raw.set(sourceIdFor(flat(e.name), flat(e.city)), e)
}

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'studios', depth: 0, limit: 5000, pagination: false, draft: true })
const counts: Record<string, number> = {}
let changed = 0
for (const s of docs as Studio[]) {
  // An owner's unpublished edits wait for review: don't write over them.
  if (s.pendingOwnerChanges) { console.log('skip (owner draft)', s.slug); continue }
  const e = (s.sourceId && raw.get(s.sourceId)) || {}
  const text = [
    s.description, s.summary, s.publicDescription,
    ...(s.services ?? []).map((x) => x.text), ...(s.products ?? []).map((x) => x.text), ...(s.prices ?? []).map((x) => x.text),
    flat(e.b2b), flat(e.ig_bio), flat(e.ig_highlights), flat(e.techniques), flat(e.services), flat(e.products),
  ].filter(Boolean).join(' \n ').toLowerCase()
  // RESET=1 recomputes tags from scratch (drops tags that rules no longer give); default only adds.
  const tags = new Set<Format>(process.env.RESET === '1' ? [] : (s.formats ?? []))
  for (const r of RULES) {
    const hit = r.types.has(s.type ?? '') ? hits(text, r.re, r.skip) : null
    if (!hit) continue
    tags.add(r.tag)
    if (process.env.SHOW === r.tag && s._status === 'published') {
      const i = text.indexOf(hit)
      console.log(`${s.slug} [${s.type}] …${text.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' ')}…`)
    }
  }
  if (s.b2b?.worksWithHoreca) tags.add('horeca')
  if (s.b2b?.worksWithCorporate) tags.add('corporate-gifts')
  for (const t of tags) counts[t] = (counts[t] ?? 0) + (s._status === 'published' ? 1 : 0)
  const next = [...tags].sort()
  if (JSON.stringify(next) === JSON.stringify([...(s.formats ?? [])].sort())) continue
  changed++
  if (DRY) { console.log(s.slug, next.join(',')); continue }
  await payload.update({ collection: 'studios', id: s.id, data: { formats: next }, draft: s._status !== 'published', context: { disableRevalidate: true } })
}
console.log('changed', changed, 'published per tag', counts)
process.exit(0)
