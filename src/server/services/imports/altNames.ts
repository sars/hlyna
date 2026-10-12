import type { Db } from '../../db'
import { studios } from '../../db/schema/catalog'
import { transliterateUk } from '../../../lib/transliterateUk'
import type { Actor } from '../audit'
import { studiosWithPendingOwnerChanges, writeStudio } from './runs'

// Names a studio is actually known by (ported from scripts/alt-names.ts, same rules — never invented):
// variants in the record name, the Instagram handle, other spellings in the research files (matched by handle),
// documented renames from the Instagram notes. Max 6 per studio.

export const handleOf = (url?: string | null) => (url ?? '').replace(/\/+$/, '').split('/').pop()?.split('?')[0]!.replace(/^@/, '').toLowerCase() ?? ''
const norm = (s: string) => transliterateUk(s.toLowerCase()).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const STOP = new Set(['ceramics', 'ceramic', 'keramika', 'keramiky', 'keramiki', 'keramichna', 'studio', 'studiia', 'maisternia', 'maysternia', 'pottery', 'gallery', 'art', 'arts', 'handmade', 'design', 'shop', 'store', 'the', 'and', 'kyiv', 'home', 'clay', 'hlyna', 'tvorcha', 'tvorchosti', 'honcharna', 'workshop', 'school', 'shkola', 'muzei', 'prostir', 'artprostir', 'kafe', 'gruppa', 'zaniattia', 'posud', 'ukraina', 'opishnia', 'kosiv', 'lviv', 'odesa'])
const skel = (t: string) => t.replace(/[aeiouyj]/g, '').replace(/(.)\1+/g, '$1')
const tokens = (s: string) => new Set(norm(s).split(' ').filter((t) => t.length >= 3 && !STOP.has(t)).map(skel).filter((t) => t.length >= 3))
const PERSON = /^(?:олександр|олександра|олена|анна|ганна|марія|марина|ірина|наталія|наталя|юлія|оксана|тетяна|катерина|світлана|ольга|вікторія|віктор|андрій|сергій|іван|микола|володимир|людмила|галина|дмитро|максим|юрій|богдан|роман|леся|надія|валентина|василь|петро|михайло|ярослав|христина|софія|дарія|даша|alexander|oleksandr|olena|anna|maria|iryna|natalia|yulia|oksana|tetiana|kateryna|svitlana|olha|viktoria|andrii|serhii|ivan|mykola|volodymyr|dmytro|maksym|yurii|bohdan|roman)\s/iu
const LEGAL = /^(?:го|тов|прат|пп|кп|фоп|ltd|llc)(?:$|\s)|^(?:с\.|смт|м\.)\s/iu
const CITY = /^(київ|львів|одеса|харків|дніпро|суми|луцьк|ужгород|полтава|вінниця|косів|опішне|івано-франківськ|чернівці|тернопіль|житомир|рівне|запоріжжя|миколаїв|херсон|черкаси|чернігів|ірпінь|буча)$/iu
const BAD = /тел\.|ймовірно|неперевірено|\||\d{5,}|партнер|шоурум|курс|виробництв|посуд для|майстер-клас|пам.ять|рання|архів|\sі\s|\sта\s|,|@|https?:|\.(?:ua|com|net|shop|org|store)\b|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/iu

/** Name-like parts of a raw name: before an em dash, split by « / » and parentheses. */
export function nameParts(name: string): string[] {
  const head = name.split(/\s[—–]\s/)[0]!
  const out: string[] = []
  const inner = [...head.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!)
  const outer = head.replace(/\([^)]*\)/g, ' ')
  for (const p of [...outer.split(/\s\/\s|\|/), ...inner.flatMap((x) => x.split(/\s\/\s|\|/))]) {
    const t = p.replace(/[«»"]/g, '').replace(/\s{2,}/g, ' ').trim()
    if (t.length >= 2 && t.length <= 40 && !BAD.test(t) && !CITY.test(t) && !LEGAL.test(t) && tokens(t).size) out.push(t)
  }
  return out
}

/** Alternate names for one studio, from its name, handle, research spellings and documented renames. */
export function alternateNamesFor(s: { name: string; type: string | null; instagram: string | null; slug: string }, research: Set<string> | undefined, renames: string[] | undefined): string[] {
  const handle = handleOf(s.instagram)
  const own = nameParts(s.name)
  const main = own[0] ?? s.name
  const handleToks = tokens(handle.replace(/[._]+/g, ' '))
  const shares = (a: Set<string>, b: Set<string>) => [...a].some((t) => b.has(t))
  const related = (v: string) => shares(tokens(v), tokens(main)) || shares(tokens(v), handleToks)
  const key = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const seen = new Set([key(s.name)])
  const out: string[] = []
  const mainKey = key(main)
  const add = (v: string) => {
    const k = key(v)
    if (k.length < mainKey.length && mainKey.includes(k) && !own.slice(1).some((o) => key(o) === k)) return
    if (!k || seen.has(k) || out.length >= 6) return
    seen.add(k)
    out.push(v)
  }
  const ownAlt = own.slice(1).filter(related)
  if (ownAlt.length) [main, ...ownAlt].forEach(add)
  for (const raw of research ?? []) for (const p of nameParts(raw)) if (related(p) && (s.type === 'maker' || !PERSON.test(p))) add(p)
  for (const v of renames ?? []) add(v)
  if (/^[a-z0-9._]{2,30}$/.test(handle) && !/^\d+$/.test(handle)) add(handle)
  return out
}

export async function fillAlternateNames(db: Db, byHandle: Map<string, Set<string>>, renamed: Map<string, string[]>, opts: { dry?: boolean }, actor: Actor) {
  const all = await db.select({ id: studios.id, name: studios.name, type: studios.type, instagram: studios.instagram, slug: studios.slug, alternateNames: studios.alternateNames }).from(studios)
  const pending = await studiosWithPendingOwnerChanges(db)
  let changed = 0
  const log: string[] = []
  for (const s of all) {
    if (pending.has(s.id)) continue
    const out = alternateNamesFor(s, byHandle.get(handleOf(s.instagram)), renamed.get(s.slug))
    if (JSON.stringify(s.alternateNames ?? []) === JSON.stringify(out)) continue
    changed++
    if (opts.dry) { log.push(`${s.name}  →  ${out.join(' | ')}`); continue }
    await db.transaction((tx) => writeStudio(tx, s.id, { alternateNames: out }, undefined, actor, 'Інші назви'))
  }
  return { changed, log }
}
