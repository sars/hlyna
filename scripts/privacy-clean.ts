/**
 * One-off privacy cleanup (2026-10-11): remove birth years, family relations, military-unit and injury details
 * from studio text fields. Removes phrases only — never rewrites a field — so concurrent description work is safe.
 *   DRY=1 pnpm payload run scripts/privacy-clean.ts      (prints before → after for every changed field)
 *   pnpm payload run scripts/privacy-clean.ts            (applies)
 * Kept on purpose: services for veterans (free classes, discounts, art therapy, «Гончарство в темряві» as a programme),
 * businesses that present themselves as veteran-owned («ветеранський бізнес»), craft-lineage in business names.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Studio } from '../src/payload-types'

const DRY = process.env.DRY === '1'
const FIELDS = ['publicDescription', 'summary', 'recentNote', 'description'] as const

// \u0001 marks a spot where a removed phrase started a sentence: the next letter becomes a capital.
const M = '\u0001'
const cap = (t: string) => t.replace(/^\s*(\p{Ll})/u, (m) => m.toUpperCase()).replace(new RegExp(`${M}\\s*(\\p{Ll})?`, 'gu'), (_m, c?: string) => (c ? c.toUpperCase() : ''))

// Generic phrase rules (all studios).
const RULES: [RegExp, string][] = [
  // A sentence that is only about birth.
  [/(^|[.!?]\s+)народи\p{L}*(?:(?<!\p{L})р\.|[^.!?;]){0,40}?\d{4}(?:(?<!\p{L})р\.|[^.!?;]){0,60}?[.!?](?=\s|$)\s*/giu, '$1'],
  // «Народилася в 1964 році, закінчила …» → «Закінчила …»
  [/(^|[.!?]\s+)народи\p{L}*\s+(?:у|в)\s+\d{4}\s+році,\s*/giu, `$1${M}`],
  // «…, народилася 1983 року в Києві, …»
  [/,?\s*народи\p{L}*\s+(?:у|в)?\s*\d{4}\s*(?:року|р\.)?(?:\s+(?:у|в)\s+[^,.;)]+)?/giu, ''],
  // «(нар. 1953, Сокільники)», «(нар. 1958; …» up to the first ; or )
  [/\s*\(\s*нар\.\s*(?:у|в)?\s*\d{4}[^;)]*\)/giu, ''],
  [/\(\s*нар\.\s*(?:у|в)?\s*\d{4}[^;)]*;\s*/giu, '('],
  // «1959 р.н.», «1978 року народження», «Художник-кераміст 1961 р.н.»
  [/,?\s*\d{4}\s*(?:р\.\s*н\.|року народження)/giu, ''],
  [/,?\s*нар\.\s*(?:у|в)?\s*\d{4}(?!\d)/giu, ''],
  // Family relations of private people.
  [/,?\s*(?<!\p{L})(?:син|донька|дочка)\s+(?:(?:кераміст|скульптор|майстрин|гончар)\p{L}*\s+|відомого гончаря\s+)?(?:\p{Lu}\.\s*)?\p{Lu}[^,.;()]*(?:\([^)]*\))?/gu, ''],
  [/,?\s*(?<!\p{L})(?:донька|дочка|син)\s+(?:\p{Lu}\.\s*)?\p{Lu}[\p{L}’'-]+(?:\s+\p{Lu}[\p{L}’'-]+)?/gu, ''],
  [/(?<!\p{L})(?:дружина|чоловік)\s+(?:кераміста\s+|керамістки\s+)?[\p{Lu}][^,.;()]*[,;]?\s*/gu, ''],
  [/(?<!\p{L})мати\s+[\p{Lu}][^,.;()]*[,;]?\s*/gu, ''],
  [/Вона з керамічної родини:[^.]*\.\s*/gu, ''],
  [/Працює в майстерні батька(?:, скульптора [^.;]*)?[.;]\s*/gu, ''],
  [/\s*\(кравчиня за фахом, донька скульптора\)/gu, ''],
  [/батько й наставник гончарки [^.;,]*[.;,]?\s*/gu, ''],
  [/Лариса Нагурна померла у травні 2023 р\.;\s*/gu, M],
]

// Research notes on individual makers start with the birth year: «1958; …», «1983 у Києві; …», «1992, донька О. …».
const MAKER_YEAR: [RegExp, string] = [/(^|[.;]\s*)(?:19[2-9]\d|200\d)(?:\s+(?:у|в)\s+[^;,.]+)?[;,]\s*/gu, `$1${M}`]
// Family workshops present the family as the business: leave those names alone.
const FAMILY_BUSINESS = /rodyn|dynastiia|simei/

// Military units, injuries, health of named people (explicit, reviewed).
const EXPLICIT: Record<string, [RegExp, string][]> = {
  'ivan-shostak': [
    [/Ветеран ДШВ, який втратив зір на Бахмутському напрямку \(2023\), опанував/u, 'Опанував'],
    [/,?\s*ветеран(?=[.,])/u, ''],
    [/ і ветеран:/u, ':'],
  ],
  'honcharstvo-v-temriavi-shkola-honcharstv': [
    [/незрячий ветеран Іван Шостак \(поранений на Бахмутському напрямку 2023 р\., робить чашки-серця з емблемою ДШВ\)/u, 'Іван Шостак'],
    [/ветеран і гончар Іван Шостак/u, 'гончар Іван Шостак'],
  ],
  'anton-i-nataliia-bohach': [
    [/Ветеран Антон Богач, який втратив зір, навчився/u, 'Антон Богач навчився'],
    [/Антон, ветеран, навчився/u, 'Антон навчився'],
  ],
  'oleh-lutsuk-honchar-initsiator-festyvali': [[/;\s*служив у ЗСУ, після поранення під Покровськом \(інвалідність\) повернувся/u, '; повернувся']],
  'vitalii-vladkovskyi': [[/під час реабілітації після поранення організував/u, 'організував'], [/,?\s*а в Чернівцях на його підрозділ збирали кошти на виставці кераміки \(2022\)/u, '']],
  'tvorcha-maisternia-remeslo': [[/\(військовослужбовець, /u, '(']],
}

const tidy = (t: string) =>
  cap(
    t
      .replace(/\(\s*\)/g, '')
      .replace(/\(\s*;\s*/g, '(')
      .replace(/ {2,}/g, ' ')
      .replace(/\s+([,.;)])/g, '$1')
      .replace(/,([.;])/g, '$1')
      .replace(/;\s*([.)])/g, '$1')
      .replace(/^[\s,;]+/, '')
      .trim(),
  )

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'studios', depth: 0, limit: 5000, pagination: false, draft: true })
let changed = 0
for (const s of docs as Studio[]) {
  if (s.pendingOwnerChanges) continue
  const data: Record<string, string> = {}
  for (const f of FIELDS) {
    const before = (s as unknown as Record<string, unknown>)[f]
    if (typeof before !== 'string' || !before) continue
    let after = before
    const slug = s.slug ?? ''
    const rules = RULES.filter(([re]) => !(FAMILY_BUSINESS.test(slug) && /донька|дочка|син|дружина|чоловік|мати/.test(re.source)))
    for (const [re, rep] of [...(EXPLICIT[slug] ?? []), ...rules, ...(s.type === 'maker' && f === 'description' ? [MAKER_YEAR] : [])]) after = after.replace(re, rep)
    if (after === before) continue
    after = tidy(after)
    if (after === before.trim()) continue
    data[f] = after
    console.log(`\n${s.slug} · ${f}\n  BEFORE: ${before.replace(/\n/g, ' ⏎ ').slice(0, 500)}\n  AFTER:  ${after.replace(/\n/g, ' ⏎ ').slice(0, 500)}`)
  }
  if (!Object.keys(data).length) continue
  changed++
  if (!DRY) await payload.update({ collection: 'studios', id: s.id, data, draft: s._status !== 'published', context: { disableRevalidate: true } })
}
console.log(`\n${DRY ? 'would change' : 'changed'} ${changed} studios`)
process.exit(0)
