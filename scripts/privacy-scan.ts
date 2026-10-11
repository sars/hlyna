/**
 * Find personal details in public studio text: birth years, family relations, military/veteran status.
 *   OUT=privacy-candidates.json pnpm payload run scripts/privacy-scan.ts
 * Prints JSON candidates {slug, name, field, sentence, kind} for review. Nothing is changed here; reviewed edits are
 * applied with scripts/apply-text-edits.ts (exact find → replace, never a whole-field rewrite).
 */
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

const FIELDS = ['publicDescription', 'summary', 'description', 'recentNote'] as const
const KINDS: [string, RegExp][] = [
  ['birth', /народи\p{L}*|\d{4}\s*р\.\s*н\.|року народження|\(\s*нар\.|\(\s*\d{4}\s*[–-]\s*\)|\d{4}\s*р\.\s*нар/iu],
  ['family', /(?<!\p{L})(?:син|сина|синові|донька|доньки|дочка|дочки|чоловік|чоловіка|дружина|дружини|мама|мами|мамою|тато|тата|батько|батька|мати|матір|онук|онука|онуки|брат|брата|сестра|сестри|вдова|вдовець|покійн|помер|померла|загинув|загинула)(?!\p{L})/iu],
  ['military', /ветеран|(?<!\p{L})УБД(?!\p{L})|ЗСУ|ДШВ|десантно-штурмов|бригад|військов|(?<!\p{L})фронт|поранен|мобілізован|воював|воювала|захисни\p{L}*|служи\p{L}* в арм|контуз|ампутац/iu],
]

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'studios', depth: 0, limit: 5000, pagination: false, draft: true })
const out: { slug: string; name: string; field: string; kind: string; sentence: string }[] = []
for (const s of docs as Studio[]) {
  for (const field of FIELDS) {
    const text = (s as unknown as Record<string, unknown>)[field]
    if (typeof text !== 'string' || !text) continue
    for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
      for (const [kind, re] of KINDS) if (re.test(sentence)) out.push({ slug: s.slug ?? '', name: s.name, field, kind, sentence: sentence.trim() })
    }
  }
}
fs.writeFileSync(process.env.OUT || 'privacy-candidates.json', JSON.stringify(out, null, 1))
console.log('candidates', out.length)
process.exit(0)
