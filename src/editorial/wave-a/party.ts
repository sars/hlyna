// Birthdays and parties in a clay studio (/maister-klasy/den-narodzhennya).
import { priceVars, type WaveVars } from '@/editorial/copy'
import { getAllStudios, groupByCity, offersMasterClasses, type StudioCard } from '@/lib/catalog'
import { amountsIn, typicalRange } from '@/lib/money'
import { publicPrices } from '@/lib/present'

export const PARTY = /день народж|дні народж|днів народж|(?<!\p{L})др(?!\p{L})|дитяч\p{L}* свят|свят\p{L}* (?:для|в|у) (?:студі|майстерн)|дівич|вечірк|оренд\p{L}* (?:студі|майстерн|простор)|гендер-паті|(?<!\p{L})паті(?!\p{L})/iu
const GROUP = /(?:до|від)\s*(\d{1,2})\s*(?:ос|діт|учасн|гост|люд|чол)|(\d{1,2})\s*[–-]\s*(\d{1,2})\s*(?:ос|діт|учасн|гост|люд)/iu

export function partyLines(s: StudioCard) {
  const prices = publicPrices(s).filter((p) => PARTY.test(p.text))
  const services = (s.services ?? []).map((x) => x.text).filter((t) => PARTY.test(t))
  const group = [...prices.map((p) => p.text), ...services].map((t) => t.match(GROUP)).filter(Boolean).map((m) => m![0])[0]
  return { prices, services, group }
}

export async function partyData() {
  const studios = (await getAllStudios()).filter(
    (s) => offersMasterClasses(s) && PARTY.test([...(s.services ?? []), ...(s.prices ?? [])].map((x) => x.text).join(' \n ') + ' ' + (s.publicDescription ?? '')),
  )
  const groups = groupByCity(studios)
  const amounts = studios.flatMap((s) => partyLines(s).prices.flatMap((p) => amountsIn(p.text)))
  const r = typicalRange(amounts)
  const vars: WaveVars = { count: studios.length, cities: groups.length, ...priceVars(r) }
  return { studios, groups, vars }
}
