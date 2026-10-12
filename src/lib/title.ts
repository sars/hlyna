// Page titles: «key words first, comma-separated, then · Глина». Target ≤ 70 characters (Bing warns above it;
// Google shows about 55–65 Cyrillic characters, so the words that matter go first). The brand is dropped first.
export const TITLE_TARGET = 70
export const BRAND = ' · Глина'

/**
 * The first variant that fits the target, tried with the brand and then without; variants go from the fullest to
 * the shortest. The last variant is used as is when nothing fits. Returns an absolute title (no layout template).
 */
export function fitTitle(variants: (string | null | undefined | false)[], target = TITLE_TARGET): { absolute: string } {
  const xs = variants.filter((v): v is string => Boolean(v))
  for (const v of xs) {
    if ((v + BRAND).length <= target) return { absolute: v + BRAND }
    if (v.length <= target) return { absolute: v }
  }
  return { absolute: xs[xs.length - 1] ?? 'Глина' }
}

// A name that already says what the place is («Студія кераміки …», «Гончарна майстерня …», «… Ceramics»).
const SAYS_CERAMICS = /керамі|гончар|глин|порцелян|майолік|ceramic|pottery|porcelain|clay/iu

/** «Назва, керамічна студія, Місто · Глина»; the type is left out when the name already says it. */
export const studioTitle = (name: string, type: string | null | undefined, city: string | null | undefined) => {
  const what = SAYS_CERAMICS.test(name) ? null : (TYPE_PHRASE[type ?? 'other'] ?? TYPE_PHRASE.other)
  return fitTitle([[name, what, city].filter(Boolean).join(', '), city && `${name}, ${city}`, name])
}

/** What a studio is, in title words (every phrase says «кераміка» in some form). */
export const TYPE_PHRASE: Record<string, string> = {
  studio: 'керамічна студія',
  brand: 'керамічний бренд',
  maker: 'майстер кераміки',
  school: 'школа кераміки',
  shop: 'крамниця кераміки',
  supplier: 'матеріали для кераміки',
  heritage: 'традиційна кераміка',
  other: 'кераміка',
}
