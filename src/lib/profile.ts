// Studio profile helpers: which request form a profile opens on, and how its price list is grouped.
import { hasFormat, offersMasterClasses, type StudioCard as Card } from '@/lib/catalog'
import type { PriceLine } from '@/lib/present'

// The request form opens on what this studio is known for.
export function formFor(s: Card): string {
  if (hasFormat(s, 'logo')) return 'logo-mugs'
  if (hasFormat(s, 'horeca')) return 'tableware'
  if (hasFormat(s, 'corporate-gifts')) return 'corporate-gifts'
  if (offersMasterClasses(s)) return 'master-class'
  if (hasFormat(s, 'corporate-workshop')) return 'corporate-workshop'
  return 'other'
}

// Price lines grouped the way people read a price list.
const GROUPS: [string, RegExp][] = [
  ['Майстер-класи', /(?<!\p{L})мк(?!\p{L})|майстер-клас|заняття|урок|побачен|для двох|гончарств|ліплен|ліпк|розпис|гончарн\p{L}* (?:кол|круг)/iu],
  ['Курси й абонементи', /курс|абонемент|\d+\s*занять|місяц/iu],
  ['Для компаній', /корпоратив|тімбілд|тимбілд|для компан|для команд|груп[аиу]?\s+до|оптов|гурт/iu],
  ['Коворкінг і послуги', /коворк|оренд|полиц|глина\s+\d|^\s*(?:випал|сертифікат)/iu],
]
// Prices from before 2025 move to «Старші ціни» when the studio has newer ones (they stay visible, but last).
const OLD_GROUP = 'Старші ціни (до 2025 року)'
export function groupPrices(lines: PriceLine[]) {
  const out = new Map<string, PriceLine[]>()
  const hasNew = lines.some((l) => (l.year ?? 0) >= 2025)
  for (const l of lines) {
    if (hasNew && l.year && l.year < 2025) {
      out.set(OLD_GROUP, [...(out.get(OLD_GROUP) ?? []), l])
      continue
    }
    // Courses and company prices first: «МК» appears in many course lines too.
    const order = [GROUPS[1], GROUPS[2], GROUPS[3], GROUPS[0]]
    const g = order.find(([, re]) => re.test(l.text))?.[0] ?? 'Вироби'
    out.set(g, [...(out.get(g) ?? []), l])
  }
  return [...GROUPS.map(([g]) => g), 'Вироби', OLD_GROUP].filter((g) => out.has(g)).map((g) => [g, out.get(g)!] as const)
}
