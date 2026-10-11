// Gifts by budget and occasion (/podarunky-z-keramiky): real price lines of products, one per studio per tier.
import { priceVars, type WaveVars } from '@/editorial/copy'
import { getAllStudios, type StudioCard } from '@/lib/catalog'
import { amountsIn, roundNice, typicalRange } from '@/lib/money'
import { isExhibitingOnly, publicPrices } from '@/lib/present'

const CLASS_OR_SERVICE = /донат|благодійн|лот(?!\p{L})|аукціон|(?<!\p{L})мк(?!\p{L})|майстер-клас|занят|ліпк|ліплен|гончарств|курс|абонемент|оренд|коворк|сертифікат|випал|доставк|глазуруван|розпис\s+(?:свого|чужого|чаш\p{L}*)|табір|(?<!\p{L})годин|\/\s*день|груп[аиуо]|груповий|особ[аиу]|дитин|(?<!\p{L})діт|років|індивідуальн|гончарн\p{L}* (?:круг|коло)|usd|eur|\$|€/iu
export const GIFT_TIERS = [
  { key: 'to500', label: 'До 500 грн', min: 0, max: 500 },
  { key: 'to1000', label: '500–1 000 грн', min: 501, max: 1000 },
  { key: 'to2000', label: '1 000–2 000 грн', min: 1001, max: 2000 },
  { key: 'over2000', label: 'Понад 2 000 грн', min: 2001, max: 20000 },
] as const
export const GIFT_OCCASIONS = [
  { key: 'wedding', label: 'На весілля', re: /сервіз|набір|пар[аиу]\s+(?:чаш|горнят|кухл)|для двох|весіл|тарел|блюд(?!ц)|глечик/iu },
  { key: 'teacher', label: 'Вчителю чи вихователю', re: /чашк|горнят|кухл|вазон|кашпо|підставк|магніт|дзвіночок/iu },
  { key: 'colleagues', label: 'Колегам і партнерам', re: /чашк|горнят|кухл|свічник|аромат|підставк|магніт|брелок|набір|тарілочк/iu },
  { key: 'housewarming', label: 'На новосілля', re: /(?<!\p{L})ваз(?!елін)|тарілк|миск|глечик|кашпо|вазон|світильник|свічник|салатник|блюд(?!ц)/iu },
] as const

export type GiftItem = { studio: StudioCard; text: string; source?: string; amount: number }

export async function giftsData() {
  const studios = (await getAllStudios()).filter((s) => ['brand', 'maker', 'studio', 'heritage'].includes(s.type ?? '') && !isExhibitingOnly(s))
  const items: GiftItem[] = []
  for (const s of studios) {
    for (const p of publicPrices(s)) {
      if (CLASS_OR_SERVICE.test(p.text)) continue
      const a = amountsIn(p.text)
      if (!a.length) continue
      items.push({ studio: s, text: p.text, source: p.source, amount: a[0] })
    }
  }
  // One line per studio per tier (the cheapest there), so a big price list doesn't fill a tier alone.
  const tiers = GIFT_TIERS.map((t) => {
    const best = new Map<number, GiftItem>()
    for (const it of items.filter((i) => i.amount >= t.min && i.amount <= t.max)) {
      const cur = best.get(it.studio.id)
      if (!cur || it.amount < cur.amount) best.set(it.studio.id, it)
    }
    return { ...t, items: [...best.values()].sort((a, b) => a.amount - b.amount) }
  })
  const occasions = GIFT_OCCASIONS.map((o) => {
    const best = new Map<number, GiftItem>()
    for (const it of items.filter((i) => o.re.test(i.text))) if (!best.has(it.studio.id)) best.set(it.studio.id, it)
    return { key: o.key, label: o.label, items: [...best.values()].sort((a, b) => a.amount - b.amount) }
  })
  const all = items.map((i) => i.amount)
  const r = typicalRange(all)
  const sorted = [...all].sort((a, b) => a - b)
  const vars: WaveVars = {
    count: new Set(items.map((i) => i.studio.id)).size,
    items: items.length,
    ...priceVars(r ? { ...r, median: sorted.length ? roundNice(sorted[Math.floor(sorted.length / 2)]) : undefined } : null),
    ...Object.fromEntries(tiers.map((t) => [`${t.key}Count`, t.items.length])),
  }
  return { tiers, occasions, items, vars }
}
