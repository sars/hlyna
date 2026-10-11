import type { Studio } from '@/types/catalog'

// What a studio makes: summary, products and services (not the long research description, which mentions
// techniques like «декорування» that are not products). Used by product pages and product chips.
export const productText = (s: Studio) =>
  `${s.summary ?? ''} ${(s.products ?? []).map((x) => x.text).join(' ')} ${(s.services ?? []).map((x) => x.text).join(' ')}`

export const PRODUCT_RE = {
  plates: /тарілк|миск|піал|салатник|блюд(?!ц)|сервіз/iu,
  cups: /чашк|горнят|кухл|філіжан|еспресо|капучино/iu,
  vases: /(?<!\p{L})ваз(?!елін)|кашпо|вазон|свічник|скульпт|статуетк|фігурк|декор(?!ув)/iu,
  lamps: /світильник|(?<!\p{L})ламп[аиу](?!\p{L})|абажур|торшер|(?<!\p{L})бра(?!\p{L})/iu,
  jewelry: /(?<!ялинков\p{L}*\s)прикрас|сережк|кулон|намист|брошк|каблучк|браслет|біжутер/iu,
  tiles: /плитк|кахл|панно|керамічн\p{L}* мозаїк|мозаїк\p{L}* (?:з|із) (?:кераміки|плитки)/iu,
}

// Short chips for lists (city pages): what the studio makes, in buyer words.
export const PRODUCT_CHIPS: [keyof typeof PRODUCT_RE, string][] = [
  ['plates', 'тарілки й миски'],
  ['cups', 'чашки'],
  ['vases', 'вази й декор'],
  ['lamps', 'світильники'],
  ['jewelry', 'прикраси'],
  ['tiles', 'плитка й панно'],
]

export const productChips = (s: Studio) => {
  const t = productText(s)
  return PRODUCT_CHIPS.filter(([k]) => PRODUCT_RE[k].test(t)).map(([, label]) => label)
}
