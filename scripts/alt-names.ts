/**
 * Fill `alternateNames` with names a studio is actually known by — never invented:
 *  1. variants already in the record name: «Ґроно (Grono)», «OK Ceramics / ROMAKOCeramics»;
 *  2. the Instagram handle;
 *  3. other spellings of the same studio in the research files (matched by Instagram handle);
 *  4. renames documented in the Instagram notes («змінила назву з X на Y»).
 * A variant from 1/3 is kept only if it shares a word (after transliteration) with the name or the handle,
 * so descriptors, people's names and taglines are dropped. Max 6 per studio.
 *   pnpm payload run scripts/alt-names.ts     (DRY=1 to print only)
 */
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'
import { transliterateUk } from '../src/utilities/transliterateUk'

const ROOT = process.env.RESEARCH_DIR || '/Users/rodik/Claude/UkraineCeramics'
const DRY = process.env.DRY === '1'

const handleOf = (url?: string | null) => (url ?? '').replace(/\/+$/, '').split('/').pop()?.split('?')[0].replace(/^@/, '').toLowerCase() ?? ''
const norm = (s: string) => transliterateUk(s.toLowerCase()).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const STOP = new Set(['ceramics', 'ceramic', 'keramika', 'keramiky', 'keramiki', 'keramichna', 'studio', 'studiia', 'maisternia', 'maysternia', 'pottery', 'gallery', 'art', 'arts', 'handmade', 'design', 'shop', 'store', 'the', 'and', 'kyiv', 'home', 'clay', 'hlyna', 'tvorcha', 'tvorchosti', 'honcharna', 'workshop', 'school', 'shkola', 'muzei', 'prostir', 'artprostir', 'kafe', 'gruppa', 'zaniattia', 'posud', 'ukraina', 'opishnia', 'kosiv', 'lviv', 'odesa'])
// Spelling-independent token: consonant skeleton, so «Поляруш» (poliarush) and «Polyarush» match.
const skel = (t: string) => t.replace(/[aeiouyj]/g, '').replace(/(.)\1+/g, '$1')
const tokens = (s: string) => new Set(norm(s).split(' ').filter((t) => t.length >= 3 && !STOP.has(t)).map(skel).filter((t) => t.length >= 3))
// A person's name is not another name of a brand or studio (only of a maker).
const PERSON = /^(?:олександр|олександра|олена|анна|ганна|марія|марина|ірина|наталія|наталя|юлія|оксана|тетяна|катерина|світлана|ольга|вікторія|віктор|андрій|сергій|іван|микола|володимир|людмила|галина|дмитро|максим|юрій|богдан|роман|леся|надія|валентина|василь|петро|михайло|ярослав|христина|софія|дарія|даша|alexander|oleksandr|olena|anna|maria|iryna|natalia|yulia|oksana|tetiana|kateryna|svitlana|olha|viktoria|andrii|serhii|ivan|mykola|volodymyr|dmytro|maksym|yurii|bohdan|roman)\s/iu
const LEGAL = /^(?:го|тов|прат|пп|кп|фоп|ltd|llc)(?:$|\s)|^(?:с\.|смт|м\.)\s/iu
const CITY = /^(київ|львів|одеса|харків|дніпро|суми|луцьк|ужгород|полтава|вінниця|косів|опішне|івано-франківськ|чернівці|тернопіль|житомир|рівне|запоріжжя|миколаїв|херсон|черкаси|чернігів|ірпінь|буча)$/iu
const BAD = /тел\.|ймовірно|неперевірено|\||\d{5,}|партнер|шоурум|курс|виробництв|посуд для|майстер-клас|пам.ять|рання|архів|\sі\s|\sта\s|,|@|https?:|\.(?:ua|com|net|shop|org|store)\b|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/iu

/** Name-like parts of a raw name: before an em dash, split by « / » and parentheses. */
function parts(name: string): string[] {
  const head = name.split(/\s[—–]\s/)[0]
  const out: string[] = []
  const inner = [...head.matchAll(/\(([^)]*)\)/g)].map((m) => m[1])
  const outer = head.replace(/\([^)]*\)/g, ' ')
  for (const p of [...outer.split(/\s\/\s|\|/), ...inner.flatMap((x) => x.split(/\s\/\s|\|/))]) {
    const t = p.replace(/[«»"]/g, '').replace(/\s{2,}/g, ' ').trim()
    if (t.length >= 2 && t.length <= 40 && !BAD.test(t) && !CITY.test(t) && !LEGAL.test(t) && tokens(t).size) out.push(t)
  }
  return out
}

// Research files: other spellings, keyed by Instagram handle.
const byHandle = new Map<string, Set<string>>()
function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'posts_scan') walk(p)
    else if (/^entries_.*\.jsonl$/.test(e.name))
      for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
        try {
          const d = JSON.parse(l) as { name?: string; instagram?: string }
          const h = handleOf(typeof d.instagram === 'string' ? d.instagram : '')
          if (h && d.name) (byHandle.get(h) ?? byHandle.set(h, new Set()).get(h)!).add(d.name)
        } catch {}
      }
  }
}
walk(ROOT)

// Documented renames from the Instagram notes.
const renamed = new Map<string, string[]>()
const notesFile = path.join(ROOT, '09_instagram/posts_scan/ig_notes.jsonl')
if (fs.existsSync(notesFile))
  for (const l of fs.readFileSync(notesFile, 'utf8').split('\n')) {
    if (!l.trim()) continue
    const n = JSON.parse(l) as { slug: string; note?: string }
    const m = n.note?.match(/назв\p{L}* з ([^,;.]+?) на ([^,;.]+?)(?=[,;.]|\s(?:а|і|й)\s)/u)
    if (m) renamed.set(n.slug, [m[1].trim(), m[2].trim()])
  }

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'studios', depth: 0, limit: 5000, pagination: false, draft: true })
let changed = 0
for (const s of docs as Studio[]) {
  const handle = handleOf(s.instagram)
  const name = s.name ?? ''
  const own = parts(name)
  const main = own[0] ?? name
  const handleToks = tokens(handle.replace(/[._]+/g, ' '))
  const shares = (a: Set<string>, b: Set<string>) => [...a].some((t) => b.has(t))
  // A variant must share a (spelling-independent) word with the main name or the handle.
  const related = (v: string) => shares(tokens(v), tokens(main)) || shares(tokens(v), handleToks)
  const seen = new Set([name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')])
  const out: string[] = []
  const mainKey = main.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const add = (v: string) => {
    const k = v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    if (k.length < mainKey.length && mainKey.includes(k) && !own.slice(1).some((o) => o.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === k)) return // a truncation like «Олександр»
    if (!k || seen.has(k) || out.length >= 6) return
    seen.add(k)
    out.push(v)
  }
  const ownAlt = own.slice(1).filter(related)
  if (ownAlt.length) [main, ...ownAlt].forEach(add) // «Ґроно (Grono)» → «Ґроно», «Grono»
  for (const raw of byHandle.get(handle) ?? []) for (const p of parts(raw)) if (related(p) && (s.type === 'maker' || !PERSON.test(p))) add(p)
  for (const v of renamed.get(s.slug ?? "") ?? []) add(v)
  if (/^[a-z0-9._]{2,30}$/.test(handle) && !/^\d+$/.test(handle)) add(handle)
  const prev = (s.alternateNames ?? []).map((x) => x.text)
  if (JSON.stringify(prev) === JSON.stringify(out)) continue
  changed++
  if (DRY) { console.log(`${s.name}  →  ${out.join(' | ')}`); continue }
  await payload.update({ collection: 'studios', id: s.id, data: { alternateNames: out.map((text) => ({ text })) }, draft: s._status !== 'published', context: { disableRevalidate: true } })
}
console.log('changed', changed)
process.exit(0)
